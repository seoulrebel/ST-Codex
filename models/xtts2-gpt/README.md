---
license: apache-2.0
base_model:
- coqui/XTTS-v2
---
# Auralis 🌌

## Model Details 🛠️

**Model Name:** Auralis  

**Model Architecture:** Based on [Coqui XTTS-v2](https://huggingface.co/coqui/XTTS-v2) 

**License:**  
- license: Apache 2.0  
- base_model: XTTS-v2 Components [Coqui AI License](https://coqui.ai/cpml)

**Language Support:** English, Spanish, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Czech, Arabic, Chinese (Simplified), Hungarian, Korean, Japanese, Hindi
  
**Developed by:** [AstraMind.ai](https://www.astramind.ai)
  
**GitHub:** [AstraMind AI](https://github.com/astramind-ai/Auralis/tree/main)

**Primary Use Case:** Text-to-Speech (TTS) generation for real-world applications, including books, dialogues, and multilingual tasks.  

---

## Model Description 🚀

Auralis transforms text into natural, high-quality speech with exceptional speed and scalability. It is powered by [Coqui XTTS-v2](https://huggingface.co/coqui/XTTS-v2) and optimized for both consumer-grade and high-performance GPUs. Auralis is designed to meet real-world needs like long-text processing, voice cloning, and concurrent request handling.

### Key Features:
- **Warp-Speed Processing:** Generate speech for an entire novel (e.g., Harry Potter) in ~10 minutes.  
- **Hardware Friendly:** Requires <10GB VRAM on a single NVIDIA RTX 3090.  
- **Scalable:** Handles multiple requests simultaneously.  
- **Streaming:** Seamlessly processes long texts in a streaming format.  
- **Custom Voices:** Enables voice cloning from short reference audio.  

---

## Quick Start ⭐

```python
from auralis import TTS, TTSRequest

# Initialize the model
tts = TTS().from_pretrained("AstraMindAI/xtts2-gpt")

# Create a TTS request
request = TTSRequest(
    text="Hello Earth! This is Auralis speaking.",
    speaker_files=["reference.wav"]
)

# Generate speech
output = tts.generate_speech(request)
output.save("output.wav")
```

---

## Ebook Generation 📚

Auralis converting ebooks into audio formats at lightning speed. For Python script, check out [ebook_audio_generator.py](https://github.com/astramind-ai/Auralis/blob/main/examples/vocalize_a_ebook.py).

```python
def process_book(chapter_file: str, speaker_file: str):
    # Read chapter
    with open(chapter_file, 'r') as f:
        chapter = f.read()
    
    # You can pass the whole book, auralis will take care of splitting
    
    request = TTSRequest(
            text=chapter,
            speaker_files=[speaker_file],
            audio_config=AudioPreprocessingConfig(
                enhance_speech=True,
                normalize=True
            )
        )
        
    output = tts.generate_speech(request)
    
    output.play()
    output.save("chapter_output.wav")

# Example usage
process_book("chapter1.txt", "reference_voice.wav")
```

---

## Intended Use 🌟

Auralis is designed for:
- **Content Creators:** Generate audiobooks, podcasts, or voiceovers.  
- **Developers:** Integrate TTS into applications via a simple Python API.  
- **Accessibility**: Providing audio versions of digital content for people with visual or reading difficulties. 
- **Multilingual Scenarios:** Convert text to speech in multiple supported languages.  

---

## Performance 📊

**Benchmarks on NVIDIA RTX 3090:**  
- Short phrases (<100 characters): ~1 second  
- Medium texts (<1,000 characters): ~5-10 seconds  
- Full books (~100,000 characters): ~10 minutes  

**Memory Usage:**  
- Base VRAM: ~4GB  
- Peak VRAM: ~10GB  

---

## Model Features 🛸

1. **Speed & Efficiency:**  
   - Smart batching for rapid processing of long texts.  
   - Memory-optimized for consumer GPUs.  

2. **Easy Integration:**  
   - Python API with support for synchronous and asynchronous workflows.  
   - Streaming mode for continuous playback during generation.  

3. **Audio Quality Enhancements:**  
   - Background noise reduction.  
   - Voice clarity and volume normalization.  
   - Customizable audio preprocessing.  

4. **Multilingual Support:**  
   - Automatic language detection.  
   - High-quality speech in 15+ languages.  

5. **Customization:**  
   - Voice cloning using short reference clips.  
   - Adjustable parameters for tone, pacing, and language.  

---

## Limitations & Ethical Considerations ⚠️

- **Voice Cloning Risks:** Auralis supports voice cloning, which may raise ethical concerns about misuse. Use responsibly and ensure proper consent.  
- **Accent Limitations:** While robust for many languages, accents and intonations may vary based on the input.  

---

## Citation 📜

If you use Auralis in your research or projects, please cite:

```bibtex
@misc{auralis2024,
  author = {AstraMind AI},
  title = {Auralis: High-Performance Text-to-Speech Engine},
  year = {2024},
  url = {https://huggingface.co/AstraMindAI/auralis}
}
```