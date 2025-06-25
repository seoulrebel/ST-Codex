import functools
import math
from array import array

import torch
import torch.nn as nn
from torch.nn import functional as F
from typing import List, Optional, Union, Iterable, Tuple, Mapping

from transformers import PretrainedConfig
from vllm.attention import AttentionMetadata, Attention
from vllm.config import CacheConfig, MultiModalConfig
from vllm.distributed import get_pp_group, get_tensor_model_parallel_world_size
from vllm.inputs import InputContext, INPUT_REGISTRY
from vllm.model_executor.layers.activation import get_act_fn
from vllm.model_executor.layers.linear import ColumnParallelLinear, QKVParallelLinear, RowParallelLinear
from vllm.model_executor.layers.quantization import QuantizationConfig
from vllm.model_executor.layers.sampler import Sampler, SamplerOutput
from vllm.model_executor.layers.vocab_parallel_embedding import VocabParallelEmbedding
from vllm.model_executor.model_loader.weight_utils import default_weight_loader
from vllm.model_executor.sampling_metadata import SamplingMetadata
from vllm.multimodal import MULTIMODAL_REGISTRY, MultiModalInputs
from vllm.sequence import IntermediateTensors, SequenceData, VLLM_TOKEN_ID_ARRAY_TYPE
from vllm.model_executor.models.interfaces import SupportsMultiModal, SupportsPP

from TTS.tts.layers.xtts.latent_encoder import ConditioningEncoder # noqa
from TTS.tts.layers.xtts.perceiver_encoder import PerceiverResampler # noqa

from TTS.TTS.tts.layers.xtts.gpt import LearnedPositionEmbeddings

# Constants for token calculation
_AUDIO_PLACEHOLDER_TOKEN = 8192  # Using XTTS start_audio_token as placeholder
_AUDIO_TOKENS_PER_SECOND = 6.25
_CODE_STRIDE_LEN = 1024

class GPT2Attention(nn.Module):
    def __init__(
            self,
            config: PretrainedConfig,
            cache_config: Optional[CacheConfig] = None,
            quant_config: Optional[QuantizationConfig] = None,
            prefix: str = "",
    ):
        super().__init__()
        total_num_heads = config.num_attention_heads
        self.hidden_size = config.hidden_size
        tensor_model_parallel_world_size = get_tensor_model_parallel_world_size()
        assert total_num_heads % tensor_model_parallel_world_size == 0
        self.num_heads = total_num_heads // tensor_model_parallel_world_size
        self.head_dim = self.hidden_size // total_num_heads
        self.scale = self.head_dim**-0.5

        self.c_attn = QKVParallelLinear(
            self.hidden_size,
            self.head_dim,
            total_num_heads,
            bias=True,
            quant_config=quant_config,
            prefix=f"{prefix}.c_attn",
        )
        self.c_proj = RowParallelLinear(
            self.hidden_size,
            self.hidden_size,
            bias=True,
            quant_config=quant_config,
            prefix=f"{prefix}.c_proj",
        )
        self.attn = Attention(
            self.num_heads,
            self.head_dim,
            scale=self.scale,
            cache_config=cache_config,
            quant_config=quant_config
        )

    def forward(
            self,
            hidden_states: torch.Tensor,
            kv_cache: torch.Tensor,
            attn_metadata: AttentionMetadata,
    ) -> torch.Tensor:
        qkv, _ = self.c_attn(hidden_states)
        q, k, v = qkv.chunk(chunks=3, dim=-1)
        attn_output = self.attn(q, k, v, kv_cache, attn_metadata)
        attn_output, _ = self.c_proj(attn_output)
        return attn_output


class GPT2MLP(nn.Module):
    def __init__(
            self,
            intermediate_size: int,
            config: PretrainedConfig,
            quant_config: Optional[QuantizationConfig] = None,
            prefix: str = "",
    ):
        super().__init__()
        hidden_size = config.hidden_size

        self.c_fc = ColumnParallelLinear(
            hidden_size,
            intermediate_size,
            bias=True,
            quant_config=quant_config,
            prefix=f"{prefix}.c_fc",
        )
        self.c_proj = RowParallelLinear(
            intermediate_size,
            hidden_size,
            bias=True,
            quant_config=quant_config,
            prefix=f"{prefix}.c_proj",
        )
        self.act = get_act_fn(config.activation_function, quant_config, intermediate_size)

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        hidden_states, _ = self.c_fc(hidden_states)
        hidden_states = self.act(hidden_states)
        hidden_states, _ = self.c_proj(hidden_states)
        return hidden_states


class GPT2Block(nn.Module):
    def __init__(
            self,
            config: PretrainedConfig,
            cache_config: Optional[CacheConfig] = None,
            quant_config: Optional[QuantizationConfig] = None,
            prefix: str = "",
    ):
        super().__init__()
        hidden_size = config.hidden_size
        inner_dim = config.n_inner if config.n_inner is not None else 4 * hidden_size

        self.ln_1 = nn.LayerNorm(hidden_size, eps=config.layer_norm_epsilon)
        self.attn = GPT2Attention(
            config,
            cache_config,
            quant_config,
            prefix=f"{prefix}.attn"
        )
        self.ln_2 = nn.LayerNorm(hidden_size, eps=config.layer_norm_epsilon)
        self.mlp = GPT2MLP(
            inner_dim,
            config,
            quant_config,
            prefix=f"{prefix}.mlp"
        )

    def forward(
            self,
            hidden_states: torch.Tensor,
            kv_cache: torch.Tensor,
            attn_metadata: AttentionMetadata,
    ) -> torch.Tensor:
        residual = hidden_states
        hidden_states = self.ln_1(hidden_states)
        attn_output = self.attn(
            hidden_states=hidden_states,
            kv_cache=kv_cache,
            attn_metadata=attn_metadata,
        )
        hidden_states = attn_output + residual

        residual = hidden_states
        hidden_states = self.ln_2(hidden_states)
        feed_forward_hidden_states = self.mlp(hidden_states)
        hidden_states = residual + feed_forward_hidden_states
        return hidden_states



def get_xtts_max_audio_tokens(ctx: InputContext) -> int:
    """Calculate maximum audio tokens based on text context and audio duration."""
    # Based on GPT config and XTTSv2 settings
    return 608


def dummy_seq_data_for_xtts(
        ctx: InputContext,
        seq_len: int,
        audio_count: int,
) -> SequenceData:
    """Create dummy sequence data for XTTS profiling."""
    # Calculate audio token space needed
    audio_len_tokens = math.ceil(_AUDIO_TOKENS_PER_SECOND * 5)  # Assume 5s per chunk
    audio_placeholder = array(
        VLLM_TOKEN_ID_ARRAY_TYPE,
        [_AUDIO_PLACEHOLDER_TOKEN]
    ) * audio_len_tokens

    # Add separator between chunks
    audio_token_ids = (audio_placeholder + array(VLLM_TOKEN_ID_ARRAY_TYPE, [0])) * audio_count

    # Fill remaining sequence with padding
    other_token_ids = array(VLLM_TOKEN_ID_ARRAY_TYPE, [0]) * (seq_len - len(audio_token_ids))

    return SequenceData(audio_token_ids + other_token_ids)


def dummy_conditioning_for_xtts(
        ctx: InputContext,
        audio_count: int,
) -> dict:
    """Create dummy conditioning data for XTTS."""
    return {
        "audio": [(torch.zeros(80, 1024), 22050) for _ in range(audio_count)]
    }


def dummy_data_for_xtts(
        ctx: InputContext,
        seq_len: int,
        mm_counts: Mapping[str, int],
) -> Tuple[SequenceData, dict]:
    """Create complete dummy data for XTTS profiling."""
    audio_count = mm_counts["audio"]
    seq_data = dummy_seq_data_for_xtts(ctx, seq_len, audio_count)
    cond_data = dummy_conditioning_for_xtts(ctx, audio_count)
    return (seq_data, cond_data)


def input_mapper_for_xtts(ctx: InputContext, data: object) -> MultiModalInputs:
    """Map input data to XTTS format."""
    if not isinstance(data, list):
        data = [data]

    # Each item should be a tuple of (mel_spec, sample_rate)
    for audio_input in data:
        if not isinstance(audio_input, tuple):
            raise NotImplementedError(f"Unsupported data type: {type(audio_input)}")

    return MultiModalInputs({"cond_latents": data})



@MULTIMODAL_REGISTRY.register_input_mapper("audio", input_mapper_for_xtts)
@MULTIMODAL_REGISTRY.register_max_multimodal_tokens("audio", get_xtts_max_audio_tokens)
@INPUT_REGISTRY.register_dummy_data(dummy_data_for_xtts)
class XttsGPT(nn.Module, SupportsMultiModal, SupportsPP):
    def __init__(
            self,
            config: PretrainedConfig,
            multimodal_config: MultiModalConfig,
            cache_config: Optional[CacheConfig] = None,
            quant_config: Optional["QuantizationConfig"] = None,
    ):
        super().__init__()
        self.config = config
        self.quant_config = quant_config

        # XTTS specific components
        self.conditioning_encoder = ConditioningEncoder(
            config.audio_config.mel_channels,
            config.hidden_size,
            num_attn_heads=config.num_attention_heads
        )

        if config.use_perceiver_resampler:
            self.conditioning_perceiver = PerceiverResampler(
                dim=config.hidden_size,
                depth=2,
                dim_context=config.hidden_size,
                num_latents=32,
                dim_head=64,
                heads=8,
                ff_mult=4,
                use_flash_attn=False,
            )

        # Core GPT components following VLLM pattern
        self.gpt = XttsGPT2Model(
            config,
            cache_config,
            quant_config,
            prefix="gpt"
        )

        # Prediction heads
        self.text_head = ColumnParallelLinear(
            config.hidden_size,
            config.vocab_size,
            bias=False,
            quant_config=quant_config,
            prefix="text_head"
        )

        self.mel_head = ColumnParallelLinear(
            config.hidden_size,
            config.num_audio_tokens,
            bias=False,
            quant_config=quant_config,
            prefix="mel_head"
        )

        self.sampler = Sampler()

    def get_style_emb(self, cond_input: torch.Tensor, return_latent: bool = False) -> torch.Tensor:
        """Get conditioning embeddings from mel spectrograms."""
        if not return_latent:
            if cond_input.ndim == 4:
                cond_input = cond_input.squeeze(1)
            conds = self.conditioning_encoder(cond_input)

            if hasattr(self, 'conditioning_perceiver'):
                conds = self.conditioning_perceiver(
                    conds.permute(0, 2, 1)
                ).transpose(1, 2)
        else:
            conds = cond_input.unsqueeze(1)
        return conds

    def forward(self, input_ids: torch.Tensor, positions: torch.Tensor, kv_caches: List[torch.Tensor],
            attn_metadata: AttentionMetadata, intermediate_tensors: Optional[IntermediateTensors] = None,
            cond_latents: Optional[torch.Tensor] = None ) -> torch.Tensor:
        """Forward pass following VLLM pattern."""
        if cond_latents is not None:
            # Combine conditioning with input embeddings
            input_embeds = self.gpt.get_input_embeddings()(input_ids)
            combined_embeds = torch.cat([cond_latents, input_embeds], dim=1)
            hidden_states = self.gpt(
                inputs_embeds=combined_embeds,
                positions=positions,
                kv_caches=kv_caches,
                attn_metadata=attn_metadata,
                intermediate_tensors=intermediate_tensors,
            )
        else:
            hidden_states = self.gpt(
                input_ids=input_ids,
                positions=positions,
                kv_caches=kv_caches,
                attn_metadata=attn_metadata,
                intermediate_tensors=intermediate_tensors,
            )
        return hidden_states

    def compute_logits( # useless but kept for compatibility
            self,
            hidden_states: torch.Tensor,
            sampling_metadata: SamplingMetadata,
    ) -> torch.Tensor:
        """Compute output logits."""
        text_logits = self.text_head(hidden_states[sampling_metadata.selected_token_indices])
        mel_logits = self.mel_head(hidden_states[sampling_metadata.selected_token_indices])
        return torch.cat([text_logits, mel_logits], dim=1)


    def sample(
            self,
            logits: torch.Tensor,
            sampling_metadata: SamplingMetadata,
    ) -> Optional[SamplerOutput]:
        """Sample next tokens using VLLM sampler."""
        return self.sampler(logits, sampling_metadata)

    def load_weights(self, weights: Iterable[Tuple[str, torch.Tensor]]):
        """Load weights following VLLM pattern."""
        params_dict = dict(self.named_parameters(remove_duplicate=False))

        for name, loaded_weight in weights:
            if name not in params_dict:
                continue

            param = params_dict[name]
            if "c_attn" in name or "c_proj" in name or "c_fc" in name:
                if name.endswith(".weight"):
                    loaded_weight = loaded_weight.t()

            weight_loader = getattr(param, "weight_loader", default_weight_loader)
            weight_loader(param, loaded_weight)


class XttsGPT2Model(nn.Module):
    """VLLM-style implementation of GPT2 core architecture."""

    def __init__(
            self,
            config: PretrainedConfig,
            cache_config: Optional[CacheConfig] = None,
            quant_config: Optional[QuantizationConfig] = None,
            prefix: str = "",
    ):
        super().__init__()
        self.config = config

        self.text_embedding = VocabParallelEmbedding(
            config.number_text_tokens,
            config.hidden_size
        )
        self.mel_embedding = VocabParallelEmbedding(
            config.num_audio_tokens,
            config.hidden_size
        )

        self.text_pos_embedding = (
            LearnedPositionEmbeddings(
                config.max_text_tokens + 2,
                config.hidden_size
            )
            if config.max_audio_tokens != -1
            else functools.partial(config.null_position_embeddings, dim=config.hidden_size)
        )

        self.mel_pos_embedding = (
            LearnedPositionEmbeddings(
                config.max_audio_tokens + 3,
                config.hidden_size
            )
            if config.max_audio_tokens != -1
            else functools.partial(config.null_position_embeddings, dim=config.hidden_size)
        )

        self.h = nn.ModuleList([
            GPT2Block(
                config,
                cache_config,
                quant_config,
                prefix=f"{prefix}.h.{i}"
            ) for i in range(config.num_hidden_layers)
        ])

        self.ln_f = nn.LayerNorm(config.hidden_size, eps=config.layer_norm_epsilon)

    def get_input_embeddings(self):
        return self.text_embedding

    def forward(
            self,
            input_ids: Optional[torch.Tensor] = None,
            positions: Optional[torch.Tensor] = None,
            inputs_embeds: Optional[torch.Tensor] = None,
            kv_caches: List[torch.Tensor] = None,
            attn_metadata: AttentionMetadata = None,
            intermediate_tensors: Optional[IntermediateTensors] = None,
    ) -> Union[torch.Tensor, IntermediateTensors]:
        if get_pp_group().is_first_rank:
            if inputs_embeds is None:
                inputs_embeds = self.text_embedding(input_ids)
            hidden_states = inputs_embeds

            if positions is not None:
                position_embeds = self.text_pos_embedding(positions)
                hidden_states = hidden_states + position_embeds
        else:
            assert intermediate_tensors is not None
            hidden_states = intermediate_tensors["hidden_states"]

        for i, block in enumerate(self.h):
            hidden_states = block(
                hidden_states,
                kv_caches[i],
                attn_metadata
            )

        if not get_pp_group().is_last_rank:
            return IntermediateTensors({"hidden_states": hidden_states})

        hidden_states = self.ln_f(hidden_states)
        return hidden_states