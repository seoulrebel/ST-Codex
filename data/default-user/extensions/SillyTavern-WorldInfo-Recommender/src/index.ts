import { diffWords } from 'diff';
import {
  buildFancyDropdown,
  buildPresetSelect,
  BuildPromptOptions,
  buildSortableList,
  getActiveWorldInfo,
  SortableListItemData,
} from 'sillytavern-utils-lib';
import {
  groups,
  selected_group,
  st_createWorldInfoEntry,
  st_echo,
  st_getCharaFilename,
  st_runRegexScript,
  this_chid,
  world_names,
} from 'sillytavern-utils-lib/config';
import { POPUP_TYPE } from 'sillytavern-utils-lib/types/popup';
import { WIEntry } from 'sillytavern-utils-lib/types/world-info';
import showdown from 'showdown';

import { globalContext, runWorldInfoRecommendation, Session } from './generate.js';
import { initializeCommands, setPopupIcon } from './commands.js';

// @ts-ignore
import { Handlebars } from '../../../../../lib.js';
import {
  convertToVariableName,
  DEFAULT_PROMPT_CONTENTS,
  DEFAULT_SETTINGS,
  extensionName,
  initializeSettings,
  MessageRole,
  PromptSetting,
  settingsManager,
  SYSTEM_PROMPT_KEYS,
  SystemPromptKey,
} from './settings.js';
if (!Handlebars.helpers['join']) {
  Handlebars.registerHelper('join', function (array: any, separator: any) {
    return array.join(separator);
  });
}

const converter = new showdown.Converter();

async function handleUIChanges(): Promise<void> {
  const settingsHtml: string = await globalContext.renderExtensionTemplateAsync(
    `third-party/${extensionName}`,
    'templates/settings',
  );
  document.querySelector('#extensions_settings')!.insertAdjacentHTML('beforeend', settingsHtml);

  const settingsContainer = document.querySelector<HTMLElement>('.worldInfoRecommender_settings');
  if (!settingsContainer) {
    st_echo('error', 'Could not find settings container. Contact the developer.');
    return;
  }

  const settings = settingsManager.getSettings();

  let setMainContextList: (list: SortableListItemData[]) => void;
  let getMainContextList: () => SortableListItemData[];
  // --- Setup Main Context Template ---
  {
    const promptSelect = settingsContainer.querySelector(
      '#worldInfoRecommender_mainContextTemplatePreset',
    ) as HTMLSelectElement;
    const promptList = settingsContainer.querySelector('#worldInfoRecommender_mainContextList') as HTMLTextAreaElement;
    const restoreMainContextTemplateButton = settingsContainer.querySelector(
      '#worldInfoRecommender_restoreMainContextTemplateDefault',
    ) as HTMLButtonElement;

    buildPresetSelect('#worldInfoRecommender_mainContextTemplatePreset', {
      initialList: Object.keys(settings.mainContextTemplatePresets),
      initialValue: settings.mainContextTemplatePreset,
      readOnlyValues: ['default'],
      onSelectChange(_, newValue) {
        const newPresetValue = newValue ?? 'default';
        setList(
          settings.mainContextTemplatePresets[newPresetValue].prompts.map((prompt) => {
            let label = prompt.promptName;
            if (settings.prompts[prompt.promptName]) {
              label = `${settings.prompts[prompt.promptName].label} (${prompt.promptName})`;
            }
            return {
              enabled: prompt.enabled,
              id: prompt.promptName,
              label,
              selectOptions: [
                { value: 'user', label: 'User' },
                { value: 'assistant', label: 'Assistant' },
                { value: 'system', label: 'System' },
              ],
              selectValue: prompt.role,
            };
          }),
        );

        settings.mainContextTemplatePreset = newPresetValue;
        settingsManager.saveSettings();
      },
      create: {
        onAfterCreate(value) {
          let currentPreset = settings.mainContextTemplatePresets[settings.mainContextTemplatePreset];
          if (!currentPreset) {
            currentPreset = settings.mainContextTemplatePresets['default'];
          }
          settings.mainContextTemplatePresets[value] = structuredClone(currentPreset);
        },
      },
      rename: {
        onAfterRename(previousValue, newValue) {
          settings.mainContextTemplatePresets[newValue] = settings.mainContextTemplatePresets[previousValue];
          delete settings.mainContextTemplatePresets[previousValue];
        },
      },
      delete: {
        onAfterDelete(value) {
          delete settings.mainContextTemplatePresets[value];
        },
      },
    });

    const initialPromptList: SortableListItemData[] = settings.mainContextTemplatePresets[
      settings.mainContextTemplatePreset
    ].prompts.map((prompt) => {
      let label = prompt.promptName;
      if (settings.prompts[prompt.promptName]) {
        label = `${settings.prompts[prompt.promptName].label} (${prompt.promptName})`;
      }
      return {
        enabled: prompt.enabled,
        id: prompt.promptName,
        label,
        selectOptions: [
          { value: 'user', label: 'User' },
          { value: 'assistant', label: 'Assistant' },
          { value: 'system', label: 'System' },
        ],
        selectValue: prompt.role,
      };
    });
    const { setList, getList } = buildSortableList(promptList, {
      initialList: initialPromptList,
      showSelectInput: true,
      showToggleButton: true,
      onSelectChange(itemId, newValue) {
        const item = settings.mainContextTemplatePresets[settings.mainContextTemplatePreset].prompts.find(
          (prompt) => prompt.promptName === itemId,
        );
        if (item) {
          item.role = newValue as MessageRole;
          settingsManager.saveSettings();
        }
      },
      onToggle(itemId, newState) {
        const item = settings.mainContextTemplatePresets[settings.mainContextTemplatePreset].prompts.find(
          (prompt) => prompt.promptName === itemId,
        );
        if (item) {
          item.enabled = newState;
          settingsManager.saveSettings();
        }
      },
      onOrderChange(newItemOrderIds) {
        const newOrder = newItemOrderIds
          .map((id) => {
            const item = settings.mainContextTemplatePresets[settings.mainContextTemplatePreset].prompts.find(
              (prompt) => prompt.promptName === id,
            );
            return item;
          })
          .filter((item) => item !== undefined);
        settings.mainContextTemplatePresets[settings.mainContextTemplatePreset].prompts = newOrder;
        settingsManager.saveSettings();
      },
    });
    setMainContextList = setList;
    getMainContextList = getList;

    restoreMainContextTemplateButton.addEventListener('click', async () => {
      const confirm = await globalContext.Popup.show.confirm(
        'Restore default',
        'Are you sure you want to restore the default prompt?',
      );
      if (!confirm) {
        return;
      }

      settings.mainContextTemplatePresets['default'] = {
        prompts: DEFAULT_SETTINGS.mainContextTemplatePresets['default'].prompts,
      };
      if (promptSelect.value !== 'default') {
        promptSelect.value = 'default';
        promptSelect.dispatchEvent(new Event('change'));
      } else {
        setList(
          settings.mainContextTemplatePresets['default'].prompts.map((prompt) => {
            let label = prompt.promptName;
            if (settings.prompts[prompt.promptName]) {
              label = `${settings.prompts[prompt.promptName].label} (${prompt.promptName})`;
            }
            return {
              enabled: prompt.enabled,
              id: prompt.promptName,
              label,
              selectOptions: [
                { value: 'user', label: 'User' },
                { value: 'assistant', label: 'Assistant' },
                { value: 'system', label: 'System' },
              ],
              selectValue: prompt.role,
            };
          }),
        );
        settingsManager.saveSettings();
      }
    });
  }

  // --- Setup Consolidated System Prompts ---
  {
    const promptSelect = settingsContainer.querySelector(
      '#worldInfoRecommender_systemPromptPreset',
    ) as HTMLSelectElement;
    const promptTextarea = settingsContainer.querySelector(
      '#worldInfoRecommender_systemPromptContent',
    ) as HTMLTextAreaElement;
    const restoreSystemPromptButton = settingsContainer.querySelector(
      '#worldInfoRecommender_restoreSystemPromptDefault',
    ) as HTMLButtonElement;

    buildPresetSelect('#worldInfoRecommender_systemPromptPreset', {
      initialList: Object.keys(settings.prompts),
      readOnlyValues: SYSTEM_PROMPT_KEYS,
      initialValue: SYSTEM_PROMPT_KEYS[0],
      label(value) {
        if (value === '') {
          return 'prompt';
        }

        const promptSetting = settings.prompts[value];
        if (promptSetting) {
          return `${promptSetting.label} (${value})`;
        }
        return value;
      },
      create: {
        onBeforeCreate(value) {
          const variableName = convertToVariableName(value);
          if (!variableName) {
            st_echo('error', `Invalid prompt name: ${value}`);
            return false;
          }
          if (settings.prompts[variableName]) {
            st_echo('error', `Prompt name already exists: ${variableName}`);
            return false;
          }

          return true;
        },
        onAfterCreate(value) {
          const variableName = convertToVariableName(value);
          settings.prompts[variableName] = {
            content: promptTextarea.value,
            isDefault: false,
            label: value,
          };
          Object.entries(settings.mainContextTemplatePresets).forEach(([presetName, preset]) => {
            preset.prompts.push({
              enabled: true,
              promptName: variableName,
              role: 'user',
            });
          });
          setMainContextList([
            ...getMainContextList(),
            {
              enabled: true,
              id: variableName,
              label: `${value} (${variableName})`,
              selectOptions: [
                { value: 'user', label: 'User' },
                { value: 'assistant', label: 'Assistant' },
                { value: 'system', label: 'System' },
              ],
              selectValue: 'user',
            },
          ]);

          return variableName;
        },
      },
      rename: {
        onBeforeRename(_previousValue, newValue) {
          const variableName = convertToVariableName(newValue);
          if (!variableName) {
            st_echo('error', `Invalid prompt name: ${newValue}`);
            return false;
          }
          if (settings.prompts[variableName]) {
            st_echo('error', `Prompt name already exists: ${variableName}`);
            return false;
          }

          return true;
        },
        onAfterRename(previousValue, newValue) {
          const filteredValue = convertToVariableName(newValue);
          settings.prompts[filteredValue] = { ...settings.prompts[previousValue], label: newValue };
          delete settings.prompts[previousValue];
          Object.entries(settings.mainContextTemplatePresets).forEach(([presetName, preset]) => {
            preset.prompts.forEach((prompt) => {
              if (prompt.promptName === previousValue) {
                prompt.promptName = filteredValue;
              }
            });
          });

          setMainContextList(
            getMainContextList().map((item) => {
              if (item.id === previousValue) {
                return {
                  ...item,
                  id: filteredValue,
                  label: `${newValue} (${filteredValue})`,
                };
              }
              return item;
            }),
          );
          return filteredValue;
        },
      },
      delete: {
        onAfterDelete(value) {
          delete settings.prompts[value];
          Object.entries(settings.mainContextTemplatePresets).forEach(([presetName, preset]) => {
            preset.prompts = preset.prompts.filter((prompt) => prompt.promptName !== value);
          });
          setMainContextList(getMainContextList().filter((item) => item.id !== value));
        },
      },
      onSelectChange(_, newValue) {
        const newPresetValue = newValue ?? '';
        const promptSetting: PromptSetting | undefined = settings.prompts[newPresetValue];
        if (promptSetting) {
          promptTextarea.value = promptSetting.content ?? '';
          restoreSystemPromptButton.style.display = SYSTEM_PROMPT_KEYS.includes(newPresetValue as SystemPromptKey)
            ? 'block'
            : 'none';
          settingsManager.saveSettings();
        }
      },
    });

    // Initial state
    const selectedKey = promptSelect.value;
    const prompSetting: PromptSetting | undefined = settings.prompts[selectedKey];
    if (prompSetting) {
      promptTextarea.value = prompSetting.content ?? '';
      restoreSystemPromptButton.style.display = SYSTEM_PROMPT_KEYS.includes(selectedKey as SystemPromptKey)
        ? 'block'
        : 'none';
    }

    // Event listener for textarea change
    promptTextarea.addEventListener('change', () => {
      const selectedKey = promptSelect.value as SystemPromptKey;
      const currentContent = promptTextarea.value;

      const prompSetting: PromptSetting | undefined = settings.prompts[selectedKey];
      if (prompSetting) {
        prompSetting.content = currentContent;
        prompSetting.isDefault = SYSTEM_PROMPT_KEYS.includes(selectedKey)
          ? DEFAULT_PROMPT_CONTENTS[selectedKey] === currentContent
          : false;
        restoreSystemPromptButton.style.display = SYSTEM_PROMPT_KEYS.includes(selectedKey) ? 'block' : 'none';
        settingsManager.saveSettings();
      }
    });

    restoreSystemPromptButton.addEventListener('click', async () => {
      const selectedKey = promptSelect.value as SystemPromptKey;
      const defaultContent = DEFAULT_PROMPT_CONTENTS[selectedKey];
      const promptSetting: PromptSetting | undefined = settings.prompts[selectedKey];
      if (promptSetting) {
        const confirm = await globalContext.Popup.show.confirm(
          'Restore Default',
          `Are you sure you want to restore the default for "${promptSetting.label}"?`,
        );
        if (confirm) {
          promptTextarea.value = defaultContent;
          promptTextarea.dispatchEvent(new Event('change'));
        }
      } else {
        st_echo('warning', 'No prompt selected.');
      }
    });
  }

  const resetEverythingButton = settingsContainer.querySelector(
    '#worldInfoRecommender_resetEverything',
  ) as HTMLButtonElement;
  resetEverythingButton.addEventListener('click', async () => {
    const confirm = await globalContext.Popup.show.confirm(
      'Reset Everything',
      'Are you sure? This will reset all settings to default, including your prompt presets. This cannot be undone.',
    );
    if (confirm) {
      // Reset all settings to default
      settingsManager.resetSettings();

      setTimeout(() => {
        st_echo('success', 'Settings has been reset to default. Please reload the page.');
      }, 1500);
    }
  });

  // Create and prepend popup icons
  const popupIconHtml = `<div class="menu_button fa-brands fa-wpexplorer interactable worldInfoRecommender-icon" title="World Info Recommender"></div>`;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = popupIconHtml.trim();
  const popupIconTemplate = tempDiv.firstChild as HTMLElement | null;

  const targetSelectors = '.form_create_bottom_buttons_block, #GroupFavDelOkBack, #form_character_search_form';
  document.querySelectorAll(targetSelectors).forEach((target) => {
    target.insertBefore(popupIconTemplate!.cloneNode(true), target.firstChild);
  });

  const popupIcons = document.querySelectorAll<HTMLDivElement>('.worldInfoRecommender-icon');
  setPopupIcon(popupIcons[0]);

  popupIcons.forEach((icon) => {
    icon.addEventListener('click', async () => {
      const popupHtml: string = await globalContext.renderExtensionTemplateAsync(
        `third-party/${extensionName}`,
        'templates/popup',
      );
      globalContext.callGenericPopup(popupHtml, POPUP_TYPE.DISPLAY, undefined, {
        large: true,
        wide: true,
      });

      const popupContainer = document.getElementById('worldInfoRecommenderPopup');
      if (!popupContainer) {
        console.error('Popup container not found');
        return;
      }

      // Connection Profile Dropdown
      globalContext.ConnectionManagerRequestService.handleDropdown(
        '#worldInfoRecommenderPopup #worldInfoRecommend_connectionProfile',
        settings.profileId,
        (profile) => {
          settings.profileId = profile?.id ?? '';
          settingsManager.saveSettings();
        },
      );

      const context = SillyTavern.getContext();
      const charCardContainer = popupContainer.querySelector<HTMLDivElement>('#worldInfoRecommend_charCardContainer');
      const charCardSelect = charCardContainer!.querySelector<HTMLSelectElement>('#worldInfoRecommend_charCardSelect');
      let firstGroupMemberIndex: number | undefined;

      if (selected_group) {
        const groupIndex = groups.findIndex((g: any) => g.id === selected_group);
        const group: { generation_mode: number; members: string[] } = groups[groupIndex];
        if (group.generation_mode === 0) {
          // Swap character cards
          charCardSelect!.innerHTML = ''; // Clear existing options
          for (const member of group.members) {
            const index: number = context.characters.findIndex((c: any) => c.avatar === member);
            const name = context.characters[index].name;
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = name;
            charCardSelect!.appendChild(option);
          }
          charCardContainer!.style.display = 'block';
        } else if (group.members.length > 0) {
          firstGroupMemberIndex = context.characters.findIndex((c: any) => c.avatar === group.members[0]);
        }
      } else if (charCardContainer) {
        charCardContainer.style.display = 'none';
      }

      const avatar = this_chid ? st_getCharaFilename(this_chid) : selected_group;

      const stDescriptionCheckbox = popupContainer.querySelector<HTMLInputElement>('#worldInfoRecommend_stDescription');
      const messagesContainer = popupContainer.querySelector<HTMLElement>('.message-options');
      if (!avatar) {
        messagesContainer!.style.display = 'none';
      }
      const charCardCheckbox = popupContainer.querySelector<HTMLInputElement>('#worldInfoRecommend_charCard');
      const authorNoteCheckbox = popupContainer.querySelector<HTMLInputElement>('#worldInfoRecommend_authorNote');
      const worldInfoCheckbox = popupContainer.querySelector<HTMLInputElement>('#worldInfoRecommend_worldInfo');
      const suggestedEntriesCheckbox = popupContainer.querySelector<HTMLInputElement>(
        '#worldInfoRecommend_includeSuggestedEntries',
      );

      stDescriptionCheckbox!.checked = settings.contextToSend.stDescription;
      charCardCheckbox!.checked = settings.contextToSend.charCard;
      authorNoteCheckbox!.checked = settings.contextToSend.authorNote;
      worldInfoCheckbox!.checked = settings.contextToSend.worldInfo;
      suggestedEntriesCheckbox!.checked = settings.contextToSend.suggestedEntries;

      // Set up message options
      const messageTypeSelect = messagesContainer!.querySelector<HTMLSelectElement>('#messageType');
      const firstXDiv = messagesContainer!.querySelector<HTMLElement>('#firstX');
      const lastXDiv = messagesContainer!.querySelector<HTMLElement>('#lastX');
      const rangeXDiv = messagesContainer!.querySelector<HTMLElement>('#rangeX');
      const firstXInput = messagesContainer!.querySelector<HTMLInputElement>('#firstXMessages');
      const lastXInput = messagesContainer!.querySelector<HTMLInputElement>('#lastXMessages');
      const rangeStartInput = messagesContainer!.querySelector<HTMLInputElement>('#rangeStart');
      const rangeEndInput = messagesContainer!.querySelector<HTMLInputElement>('#rangeEnd');

      // Initialize values
      messageTypeSelect!.value = settings.contextToSend.messages.type;
      firstXInput!.value = (settings.contextToSend.messages.first ?? 10).toString();
      lastXInput!.value = (settings.contextToSend.messages.last ?? 10).toString();
      rangeStartInput!.value = (settings.contextToSend.messages.range?.start ?? 0).toString();
      rangeEndInput!.value = (settings.contextToSend.messages.range?.end ?? 10).toString();

      function updateMessageInputVisibility(type: 'none' | 'all' | 'first' | 'last' | 'range') {
        firstXDiv!.style.display = 'none';
        lastXDiv!.style.display = 'none';
        rangeXDiv!.style.display = 'none';

        switch (type) {
          case 'first':
            firstXDiv!.style.display = 'block';
            break;
          case 'last':
            lastXDiv!.style.display = 'block';
            break;
          case 'range':
            rangeXDiv!.style.display = 'block';
            break;
          case 'none':
          case 'all':
            break;
        }
      }

      // Show/hide appropriate div based on initial type
      updateMessageInputVisibility(settings.contextToSend.messages.type);

      // Event handlers
      stDescriptionCheckbox!.addEventListener('change', () => {
        settings.contextToSend.stDescription = stDescriptionCheckbox!.checked;
        settingsManager.saveSettings();
      });
      charCardCheckbox!.addEventListener('change', () => {
        settings.contextToSend.charCard = charCardCheckbox!.checked;
        settingsManager.saveSettings();
      });
      authorNoteCheckbox!.addEventListener('change', () => {
        settings.contextToSend.authorNote = authorNoteCheckbox!.checked;
        settingsManager.saveSettings();
      });
      worldInfoCheckbox!.addEventListener('change', () => {
        settings.contextToSend.worldInfo = worldInfoCheckbox!.checked;
        settingsManager.saveSettings();
      });
      suggestedEntriesCheckbox!.addEventListener('change', () => {
        settings.contextToSend.suggestedEntries = suggestedEntriesCheckbox!.checked;
        settingsManager.saveSettings();
      });

      messageTypeSelect!.addEventListener('change', (e) => {
        const type = (e.target as HTMLSelectElement).value as 'all' | 'first' | 'last' | 'range';
        settings.contextToSend.messages.type = type;
        settingsManager.saveSettings();
        updateMessageInputVisibility(type);
      });

      firstXInput!.addEventListener('change', (e) => {
        settings.contextToSend.messages.first = parseInt((e.target as HTMLInputElement).value) || 10;
        settingsManager.saveSettings();
      });

      lastXInput!.addEventListener('change', (e) => {
        settings.contextToSend.messages.last = parseInt((e.target as HTMLInputElement).value) || 10;
        settingsManager.saveSettings();
      });

      rangeStartInput!.addEventListener('change', (e) => {
        if (!settings.contextToSend.messages.range) {
          settings.contextToSend.messages.range = { start: 0, end: 10 };
        }
        settings.contextToSend.messages.range.start = parseInt((e.target as HTMLInputElement).value) || 0;
        settingsManager.saveSettings();
      });

      rangeEndInput!.addEventListener('change', (e) => {
        if (!settings.contextToSend.messages.range) {
          settings.contextToSend.messages.range = { start: 0, end: 10 };
        }
        settings.contextToSend.messages.range.end = parseInt((e.target as HTMLInputElement).value) || 10;
        settingsManager.saveSettings();
      });

      const maxContextType = popupContainer.querySelector<HTMLSelectElement>('#worldInfoRecommend_maxContextType');
      const maxTokensContainer = popupContainer.querySelector<HTMLElement>('#worldInfoRecommend_maxTokens_container');
      maxContextType!.value = settings.maxContextType;
      maxTokensContainer!.style.display = settings.maxContextType === 'custom' ? 'block' : 'none';

      maxContextType!.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value as 'profile' | 'sampler' | 'custom';
        settings.maxContextType = value;
        settingsManager.saveSettings();
        maxTokensContainer!.style.display = value === 'custom' ? 'block' : 'none';
      });

      const maxTokens = popupContainer.querySelector<HTMLInputElement>('#worldInfoRecommend_maxTokens');
      maxTokens!.value = settings.maxContextValue.toString();
      maxTokens!.addEventListener('change', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        settings.maxContextValue = value;
        settingsManager.saveSettings();
      });

      const maxResponseTokens = popupContainer.querySelector<HTMLInputElement>('#worldInfoRecommend_maxResponseTokens');
      maxResponseTokens!.value = settings.maxResponseToken.toString();
      maxResponseTokens!.addEventListener('change', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        settings.maxResponseToken = value;
        settingsManager.saveSettings();
      });

      let entriesGroupByWorldName: Record<string, WIEntry[]> = {};
      if (avatar) {
        if (selected_group) {
          const groupWorldInfo = await getActiveWorldInfo(['chat', 'persona', 'global']);
          if (groupWorldInfo) {
            entriesGroupByWorldName = groupWorldInfo;
          }

          const groupIndex = groups.findIndex((g: any) => g.id === selected_group);
          const group: { generation_mode: number; members: string[] } = groups[groupIndex];
          for (const member of group.members) {
            const index: number = context.characters.findIndex((c: any) => c.avatar === member);
            const worldInfo = await getActiveWorldInfo(['character'], index);
            if (worldInfo) {
              entriesGroupByWorldName = {
                ...entriesGroupByWorldName,
                ...worldInfo,
              };
            }
          }
        } else {
          entriesGroupByWorldName = await getActiveWorldInfo(['all'], this_chid);
        }
      } else {
        for (const worldName of world_names) {
          const worldInfo = await globalContext.loadWorldInfo(worldName);
          if (worldInfo) {
            entriesGroupByWorldName[worldName] = Object.values(worldInfo.entries);
          }
        }
      }
      const allWorldNames = Object.keys(entriesGroupByWorldName);
      if (allWorldNames.length === 0) {
        st_echo('warning', 'No active World Info entries found.');
      }

      const key = `worldInfoRecommend_${avatar ?? '_global'}`;
      const activeSession: Session = JSON.parse(localStorage.getItem(key) ?? '{}');
      function saveSession() {
        localStorage.setItem(key, JSON.stringify(activeSession));
      }

      if (!activeSession.suggestedEntries) {
        activeSession.suggestedEntries = {};
        saveSession();
      }
      if (!activeSession.blackListedEntries) {
        activeSession.blackListedEntries = [];
        saveSession();
      }
      if (!activeSession.selectedWorldNames) {
        activeSession.selectedWorldNames = avatar ? structuredClone(allWorldNames) : [];
        saveSession();
      }
      if (!activeSession.regexIds) {
        activeSession.regexIds = {};
        saveSession();
      }

      // Check if selectedWorldNames is a subset of allWorldNames
      const worldNamesMissing = activeSession.selectedWorldNames.filter(
        (worldName) => !allWorldNames.includes(worldName),
      );
      if (worldNamesMissing.length > 0) {
        st_echo('warning', `World names missing from last session: ${worldNamesMissing.join(', ')}`);
        activeSession.selectedWorldNames = activeSession.selectedWorldNames.filter(
          (worldName) => !worldNamesMissing.includes(worldName),
        );
        saveSession();
      }

      const { selectAll, deselectAll } = buildFancyDropdown('#worldInfoRecommend_worldInfoContainer', {
        initialList: allWorldNames,
        initialValues: activeSession.selectedWorldNames,
        onSelectChange(_previousValues, newValues) {
          activeSession.selectedWorldNames = newValues;
          saveSession();
        },
        enableSearch: allWorldNames.length > 10,
      });

      const promptTextarea = popupContainer.querySelector<HTMLTextAreaElement>('#worldInfoRecommend_prompt');
      buildPresetSelect('#worldInfoRecommenderPopup #worldInfoRecommend_promptPreset', {
        initialValue: settings.promptPreset,
        initialList: Object.keys(settings.promptPresets),
        readOnlyValues: ['default'],
        onSelectChange: async (_previousValue, newValue) => {
          const newPresetValue = newValue ?? 'default';
          settings.promptPreset = newPresetValue;
          settingsManager.saveSettings();
          promptTextarea!.value = settings.promptPresets[newPresetValue]?.content ?? '';
        },
        create: {
          onAfterCreate: (value) => {
            const currentPreset = settings.promptPresets[settings.promptPreset];
            settings.promptPresets[value] = {
              content: currentPreset?.content ?? '',
            };
          },
        },
        rename: {
          onAfterRename: (previousValue, newValue) => {
            settings.promptPresets[newValue] = settings.promptPresets[previousValue];
            delete settings.promptPresets[previousValue];
          },
        },
        delete: {
          onAfterDelete: (value) => {
            delete settings.promptPresets[value];
          },
        },
      });

      // Set initial value for prompt textarea based on selected preset
      promptTextarea!.value = settings.promptPresets[settings.promptPreset]!.content ?? '';

      // Save prompt content to the current preset when it changes
      promptTextarea!.addEventListener('change', function (this: HTMLTextAreaElement) {
        const content = this.value;
        settings.promptPresets[settings.promptPreset].content = content;
        settingsManager.saveSettings();
      });

      const sendButton = popupContainer.querySelector<HTMLButtonElement>('#worldInfoRecommend_sendPrompt');
      const addAllButton = popupContainer.querySelector<HTMLButtonElement>('#worldInfoRecommend_addAll');
      const suggestedEntriesContainer = popupContainer.querySelector<HTMLElement>(
        '#worldInfoRecommend_suggestedEntries',
      );
      const entryTemplate = popupContainer.querySelector<HTMLTemplateElement>(
        '#worldInfoRecommend_entryTemplate',
      ) as HTMLTemplateElement;

      if (!entryTemplate) {
        st_echo('warning', 'Missing entry template. Contact developer.');
        return;
      }
      if (!suggestedEntriesContainer) {
        st_echo('warning', 'Missing suggested entries container. Contact developer.');
        return;
      }

      let lastAddedWorldName: string | null = null;
      async function addEntry(
        entry: WIEntry,
        selectedWorldName: string,
        skipSave: boolean = false,
      ): Promise<'added' | 'updated'> {
        if (!entriesGroupByWorldName[selectedWorldName]) {
          entriesGroupByWorldName[selectedWorldName] = [];
        }

        const stFormat: { entries: Record<number, WIEntry> } = {
          entries: {},
        };
        for (const currentEntry of entriesGroupByWorldName[selectedWorldName]) {
          stFormat.entries[currentEntry.uid] = currentEntry;
        }

        const existingEntry = entriesGroupByWorldName[selectedWorldName]?.find((e) => e.uid === entry.uid);
        let targetEntry: WIEntry | undefined;
        const isUpdate = !!existingEntry;

        if (isUpdate) {
          targetEntry = existingEntry;
        } else {
          const values = Object.values(stFormat.entries);
          const lastEntry = values.length > 0 ? values[values.length - 1] : undefined;
          targetEntry = st_createWorldInfoEntry(selectedWorldName, stFormat);
          if (!targetEntry) {
            throw new Error('Failed to create entry');
          }

          const newId = targetEntry.uid;
          if (lastEntry) {
            Object.assign(targetEntry, lastEntry);
          }
          targetEntry.uid = newId;
          targetEntry.keysecondary = [];
        }

        // Update entry properties
        targetEntry.key = entry.key;
        targetEntry.content = entry.content;
        targetEntry.comment = entry.comment;

        // Update local state
        stFormat.entries[targetEntry.uid] = targetEntry;
        entriesGroupByWorldName[selectedWorldName] = Object.values(stFormat.entries);

        // Save and update UI only if not skipping (for individual adds)
        if (!skipSave) {
          await globalContext.saveWorldInfo(selectedWorldName, stFormat);
          globalContext.reloadWorldInfoEditor(selectedWorldName, true);
          saveSession();
        }

        return isUpdate ? 'updated' : 'added';
      }

      function applyEntriesToUI(entries: Record<string, WIEntry[]>, type: 'initial' | 'classic' = 'classic') {
        Object.entries(entries).forEach(([worldName, entries]) => {
          entries.forEach((entry) => {
            let finalWorldName = worldName;
            let worldIndex = allWorldNames.indexOf(finalWorldName);
            if (worldIndex === -1) {
              if (lastAddedWorldName) {
                finalWorldName = lastAddedWorldName;
              } else {
                finalWorldName = allWorldNames.length > 0 ? allWorldNames[0] : '';
              }
            }
            worldIndex = allWorldNames.indexOf(finalWorldName);

            if (!activeSession.suggestedEntries[worldName]) {
              activeSession.suggestedEntries[worldName] = [];
            }

            const existingEntry =
              type === 'initial'
                ? undefined
                : activeSession.suggestedEntries[worldName].find(
                    (e) => e.uid === entry.uid && e.comment === entry.comment,
                  );

            let node: HTMLDivElement;
            if (existingEntry) {
              const query = `.entry[data-id="${entry.uid}"][data-world-name="${worldName}"]`;
              node = suggestedEntriesContainer!.querySelector<HTMLDivElement>(query) as HTMLDivElement;
            } else {
              const templateContent = entryTemplate.content.cloneNode(true) as DocumentFragment;
              node = templateContent.firstElementChild as HTMLDivElement;
            }

            node.dataset.worldName = worldName;
            node.dataset.id = entry.uid.toString();
            node.dataset.comment = entry.comment;

            const addButton = node.querySelector<HTMLButtonElement>('.add');
            const compareButton = node.querySelector<HTMLButtonElement>('.compare');

            const updateButtonStates = (selectedWorld: string) => {
              const existingInLorebook = entriesGroupByWorldName[selectedWorld]?.find((e) => e.uid === entry.uid);
              if (existingInLorebook) {
                addButton!.textContent = 'Update';
                compareButton!.style.display = 'inline-block';
              } else {
                addButton!.textContent = 'Add';
                compareButton!.style.display = 'none';
              }
            };

            // Populate world select dropdown
            const worldSelect = node.querySelector<HTMLSelectElement>('.world-select');
            worldSelect!.innerHTML = '';
            allWorldNames.forEach((name, index) => {
              const option = document.createElement('option');
              option.value = index.toString();
              option.textContent = name;
              worldSelect!.appendChild(option);
            });
            // Set selected value to the index of the world name
            if (worldIndex !== -1) {
              worldSelect!.value = worldIndex.toString();
            }

            // Update button text when world selection changes
            worldSelect!.addEventListener('change', function (this: HTMLSelectElement) {
              const selectedIndex = parseInt(this.value);
              if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allWorldNames.length) {
                return;
              }
              const selectedWorldName = allWorldNames[selectedIndex];
              updateButtonStates(selectedWorldName);
            });

            // Update button text based on initial/current world selection
            if (worldSelect) {
              const initialSelectedWorld = allWorldNames[parseInt(worldSelect.value)] ?? finalWorldName;
              updateButtonStates(initialSelectedWorld);
            } else {
              updateButtonStates(finalWorldName);
            }

            const commentEl = node.querySelector<HTMLElement>('.comment');
            const keyEl = node.querySelector<HTMLElement>('.key');
            const contentEl = node.querySelector<HTMLElement>('.content');

            commentEl!.textContent = entry.comment;
            keyEl!.textContent = entry.key.join(', ');
            contentEl!.innerHTML = converter.makeHtml(entry.content ?? '');

            if (type === 'classic') {
              if (!existingEntry) {
                activeSession.suggestedEntries[worldName].push(entry);
              } else {
                existingEntry.key = entry.key;
                existingEntry.content = entry.content;
                existingEntry.comment = entry.comment;
              }
            }

            if (!existingEntry) {
              suggestedEntriesContainer!.appendChild(node);

              // Attach listeners only to newly added nodes
              const removeButton = node.querySelector('.remove');
              const blacklistButton = node.querySelector('.blacklist');

              removeButton!.addEventListener('click', (e) => handleRemove(e, false));
              blacklistButton!.addEventListener('click', (e) => handleRemove(e, true));
              addButton!.addEventListener('click', handleAdd);

              const compareButton = node.querySelector<HTMLButtonElement>('.compare');
              compareButton!.addEventListener('click', async () => {
                const uid = parseInt(node.dataset.id ?? '');
                const worldName = node.dataset.worldName ?? '';
                const comment = node.dataset.comment;

                const entryIndex = activeSession.suggestedEntries[worldName]?.findIndex(
                  (e) => e.uid === uid && e.comment === comment,
                );
                const entry =
                  entryIndex !== undefined && entryIndex !== -1
                    ? activeSession.suggestedEntries[worldName][entryIndex]
                    : undefined;

                if (!entry) {
                  st_echo('error', 'Original suggested entry not found in session for comparison.');
                  node.remove();
                  saveSession();
                  return;
                }

                // Find existing entry in lorebook
                const worldSelect = node.querySelector<HTMLSelectElement>('.world-select');
                const selectedIndex = parseInt(worldSelect!.value);
                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allWorldNames.length) {
                  st_echo('warning', 'Please select a valid world for comparison.');
                  return;
                }
                const selectedWorldName = allWorldNames[selectedIndex];
                const existingEntry = entriesGroupByWorldName[selectedWorldName]?.find((e) => e.uid === entry.uid);

                if (!existingEntry) {
                  st_echo('warning', 'No existing entry found to compare with.');
                  return;
                }

                const mainDiv = document.createElement('div');
                mainDiv.classList.add('compare-popup');

                const compareTitle = document.createElement('h3');
                compareTitle.textContent = 'Compare Changes';
                mainDiv.appendChild(compareTitle);

                // Create containers for original and new content
                const compareContainer = document.createElement('div');
                compareContainer.style.display = 'flex';
                compareContainer.style.gap = '1rem';
                compareContainer.style.marginTop = '1rem';

                const originalContent = document.createElement('div');
                originalContent.style.flex = '1';
                const newContent = document.createElement('div');
                newContent.style.flex = '1';

                const originalTitle = document.createElement('h4');
                originalTitle.textContent = 'Original Content';
                const newTitle = document.createElement('h4');
                newTitle.textContent = 'New Content';

                originalContent.appendChild(originalTitle);
                newContent.appendChild(newTitle);

                // Show word-level diff
                const diff = diffWords(existingEntry.content, entry.content);
                let originalHtml = '';
                let newHtml = '';

                diff.forEach((part) => {
                  const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
                  const spanStyle = `color: ${color}; ${part.added || part.removed ? 'background-color: rgba(0,0,0,0.1);' : ''}`;

                  if (!part.added) {
                    originalHtml += `<span style="${spanStyle}">${part.value}</span>`;
                  }
                  if (!part.removed) {
                    newHtml += `<span style="${spanStyle}">${part.value}</span>`;
                  }
                });

                const originalContentText = document.createElement('div');
                originalContentText.innerHTML = originalHtml;
                originalContentText.style.whiteSpace = 'pre-wrap';
                originalContentText.style.fontFamily = 'monospace';
                originalContentText.style.padding = '1rem';
                originalContentText.style.border = '1px solid #ccc';

                const newContentText = document.createElement('div');
                newContentText.innerHTML = newHtml;
                newContentText.style.whiteSpace = 'pre-wrap';
                newContentText.style.fontFamily = 'monospace';
                newContentText.style.padding = '1rem';
                newContentText.style.border = '1px solid #ccc';

                originalContent.appendChild(originalContentText);
                newContent.appendChild(newContentText);

                compareContainer.appendChild(originalContent);
                compareContainer.appendChild(newContent);
                mainDiv.appendChild(compareContainer);

                await globalContext.callGenericPopup(mainDiv, POPUP_TYPE.DISPLAY);
              });

              const continueButton = node.querySelector<HTMLButtonElement>('.continue');
              continueButton?.addEventListener('click', async (event) => {
                const btn = event.currentTarget as HTMLButtonElement;
                const entry = btn.closest<HTMLDivElement>('.entry');
                if (!entry) return;

                const worldName = entry.dataset.worldName;
                const idStr = entry.dataset.id;
                if (!worldName || !idStr) return;

                const suggestedEntry = activeSession.suggestedEntries[worldName]?.find(
                  (e) => e.uid === parseInt(idStr),
                );
                if (!suggestedEntry) return;

                btn.disabled = true;
                try {
                  await handleGeneration({ entry: suggestedEntry, worldName });
                } finally {
                  btn.disabled = false;
                }
              });

              const editButtonButton = node.querySelector<HTMLButtonElement>('.edit');
              editButtonButton!.addEventListener('click', async () => {
                const uid = parseInt(node.dataset.id ?? '');
                const worldName = node.dataset.worldName ?? '';
                const comment = node.dataset.comment;

                const entryIndex = activeSession.suggestedEntries[worldName]?.findIndex((e) => e.uid === uid);

                if (entryIndex === undefined || entryIndex === -1) {
                  st_echo('error', 'Original suggested entry not found in session for regex editing.');
                  node.remove();
                  saveSession();
                  return;
                }

                const entry = activeSession.suggestedEntries[worldName][entryIndex];

                const allRegexes = context.extensionSettings.regex ?? [];

                const mainDiv = document.createElement('div');
                mainDiv.classList.add('edit-popup');
                const editTitle = document.createElement('h3');
                editTitle.textContent = 'Edit Suggestion';
                mainDiv.appendChild(editTitle);

                // Add title (comment) input
                const titleContainer = document.createElement('div');
                const titleLabel = document.createElement('label');
                titleLabel.textContent = 'Title';
                titleContainer.appendChild(titleLabel);

                const titleInput = document.createElement('input');
                titleInput.type = 'text';
                titleInput.className = 'text_pole';
                titleInput.value = entry.comment;
                titleContainer.appendChild(titleInput);
                mainDiv.appendChild(titleContainer);

                // Add keywords input
                const keywordsContainer = document.createElement('div');
                keywordsContainer.style.marginTop = '1rem';
                const keywordsLabel = document.createElement('label');
                keywordsLabel.textContent = 'Keywords (comma-separated)';
                keywordsContainer.appendChild(keywordsLabel);

                const keywordsInput = document.createElement('input');
                keywordsInput.type = 'text';
                keywordsInput.className = 'text_pole';
                keywordsInput.value = entry.key.join(', ');
                keywordsContainer.appendChild(keywordsInput);
                mainDiv.appendChild(keywordsContainer);

                const regexTitle = document.createElement('h3');
                regexTitle.textContent = 'Apply Regex Scripts';
                regexTitle.style.marginTop = '1.5rem';
                mainDiv.appendChild(regexTitle);

                let resultTextarea: HTMLTextAreaElement | null = null;
                let getRegexList: (() => SortableListItemData[]) | null = null;
                let getRegexOrder: (() => string[]) | null = null;
                if (allRegexes.length > 0) {
                  const regexContainerTitle = document.createElement('h4');
                  regexContainerTitle.textContent = 'Apply Regex Scripts';
                  mainDiv.appendChild(regexContainerTitle);

                  const initialSortableList: SortableListItemData[] = Object.entries(activeSession.regexIds)
                    .map(([id, data]) => {
                      const regex = allRegexes.find((r) => r.id === id);
                      return regex ? { label: regex.scriptName, id: regex.id, enabled: !data.disabled } : null;
                    })
                    .filter((item): item is SortableListItemData => item !== null);

                  const initialDropdownValues = initialSortableList.map((item) => item.id);

                  const selectContainer = document.createElement('div');
                  mainDiv.appendChild(selectContainer);
                  const { getValues, setValues } = buildFancyDropdown(selectContainer, {
                    enableSearch: true,
                    multiple: true,
                    initialList: allRegexes.map((r) => ({ label: r.scriptName, value: r.id })),
                    initialValues: initialDropdownValues,
                    onSelectChange(previousValues, newValues) {
                      const addedValues = newValues.filter((value) => !previousValues.includes(value));
                      const removedValues = previousValues.filter((value) => !newValues.includes(value));

                      if (removedValues.length > 0) {
                        const sortedList = getList();
                        setList(sortedList.filter((item) => !removedValues.includes(item.id)));
                        activeSession.regexIds = Object.fromEntries(
                          Object.entries(activeSession.regexIds).filter(([key]) => !removedValues.includes(key)),
                        );
                        saveSession();
                      }

                      if (addedValues.length > 0) {
                        const sortedList = getList();
                        const newItems = addedValues
                          .map((value) => {
                            const regex = allRegexes.find((r) => r.id === value);
                            return regex
                              ? ({
                                  label: regex.scriptName,
                                  id: value,
                                  enabled: true,
                                } as SortableListItemData)
                              : null;
                          })
                          .filter((item): item is SortableListItemData => item !== null);
                        setList([...sortedList, ...newItems]);
                        activeSession.regexIds = {
                          ...activeSession.regexIds,
                          ...Object.fromEntries(newItems.map((item) => [item.id, { disabled: false }])),
                        };
                        saveSession();
                      }
                    },
                  });

                  const sortableListContainer = document.createElement('div');
                  mainDiv.appendChild(sortableListContainer);
                  const { getList, getOrder, setList } = buildSortableList(sortableListContainer, {
                    initialList: initialSortableList,
                    showDeleteButton: true,
                    showToggleButton: true,
                    onDelete(itemId) {
                      const selectValues = getValues();
                      setValues(selectValues.filter((value) => value !== itemId));
                      activeSession.regexIds = Object.fromEntries(
                        Object.entries(activeSession.regexIds).filter(([key]) => key !== itemId),
                      );
                      saveSession();
                      return true;
                    },
                    onOrderChange(newItemOrderIds) {
                      const newOrder = newItemOrderIds
                        .map((id) => getList().find((item) => item.id === id))
                        .filter((item) => item !== undefined);
                      activeSession.regexIds = Object.fromEntries(
                        newOrder.map((item) => [item.id, { disabled: !item.enabled }]),
                      );
                      saveSession();
                    },
                    onToggle(itemId, newState) {
                      activeSession.regexIds = {
                        ...activeSession.regexIds,
                        [itemId]: { disabled: !newState },
                      };
                      saveSession();
                    },
                  });
                  getRegexList = getList;
                  getRegexOrder = getOrder;

                  const getOrderedRegex = () => {
                    const order: string[] = getOrder();
                    const listItems = getList();
                    const sortedEnabledValues = listItems
                      .filter((item) => item.enabled)
                      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
                      .map((item) => item.id);
                    return sortedEnabledValues
                      .map((id) => allRegexes.find((r) => r.id === id))
                      .filter((r) => r !== undefined);
                  };

                  const getRegexResult = () => {
                    let result = entry.content;
                    for (const regex of getOrderedRegex()) {
                      result = st_runRegexScript(regex, result);
                    }
                    return result;
                  };

                  const simulateButton = document.createElement('button');
                  simulateButton.textContent = 'Simulate';
                  simulateButton.classList.add('menu_button');
                  mainDiv.appendChild(simulateButton);

                  simulateButton.addEventListener('click', async () => {
                    const regexResult = getRegexResult();
                    resultTextarea!.value = regexResult;
                  });
                }

                resultTextarea = document.createElement('textarea');
                resultTextarea.classList.add('text_pole', 'textarea_compact');
                resultTextarea.setAttribute('rows', '5');
                resultTextarea.setAttribute('placeholder', 'Result');
                resultTextarea.value = entry.content;
                mainDiv.appendChild(resultTextarea);

                const confirmed = await globalContext.callGenericPopup(mainDiv, POPUP_TYPE.CONFIRM);
                if (!confirmed) return;

                const newContent = resultTextarea.value ?? '';

                if (getRegexList && getRegexOrder) {
                  const finalOrder = getRegexOrder();
                  const finalList = getRegexList();
                  activeSession.regexIds = Object.fromEntries(
                    finalList
                      .sort((a, b) => finalOrder.indexOf(a.id) - finalOrder.indexOf(b.id)) // Sort by final order
                      .map((item) => [item.id, { disabled: !item.enabled }]),
                  );
                }

                // Process the keywords input
                const newKeywords = keywordsInput.value
                  .split(',')
                  .map((k) => k.trim())
                  .filter((k) => k.length > 0);

                const newTitle = titleInput.value.trim();
                if (newTitle) {
                  entry.comment = newTitle;
                  node.dataset.comment = newTitle;
                  const commentEl = node.querySelector<HTMLElement>('.comment');
                  if (commentEl) {
                    commentEl.textContent = newTitle;
                  }
                }

                entry.key = newKeywords;
                const keyEl = node.querySelector<HTMLElement>('.key');
                if (keyEl) {
                  keyEl.textContent = newKeywords.join(', ');
                }

                editButtonButton!.disabled = true;
                const regularAddButton = node.querySelector<HTMLButtonElement>('.add');
                if (regularAddButton) regularAddButton.disabled = true; // Keep Add button disabled too during this process

                try {
                  // Retrieve the entry *again* in case something changed while popup was open, though unlikely
                  const entryToUpdateIndex = activeSession.suggestedEntries[worldName]?.findIndex((e) => e.uid === uid);

                  if (entryToUpdateIndex === undefined || entryToUpdateIndex === -1) {
                    st_echo('error', 'Suggested entry disappeared while editing.');
                    node.remove();
                    saveSession();
                    return;
                  }
                  const entryToUpdate = activeSession.suggestedEntries[worldName][entryToUpdateIndex];
                  entryToUpdate.content = newContent;
                  const contentEl = node.querySelector<HTMLElement>('.content');
                  if (contentEl) {
                    contentEl.innerHTML = converter.makeHtml(newContent);
                  } else {
                    console.error('Could not find .content element in the suggestion node to update UI.');
                    st_echo('warning', 'UI update failed for edit, but session data was saved.');
                  }

                  saveSession();
                } catch (error: any) {
                  console.error('Error applying edit to suggested entry:', error);
                  st_echo('error', `Failed to apply edit: ${error instanceof Error ? error.message : String(error)}`);
                } finally {
                  editButtonButton!.disabled = false;
                  regularAddButton!.disabled = false;
                }
              });
            }
          });
        });

        if (type === 'classic' && Object.keys(entries).length > 0) {
          saveSession();
        }
      }

      function handleRemove(event: Event, blacklist: boolean) {
        const button = event.currentTarget as HTMLElement;
        const entryElement = button.closest<HTMLDivElement>('.entry');
        if (!entryElement) return;

        const worldName = entryElement.dataset.worldName;
        const idStr = entryElement.dataset.id;
        const comment = entryElement.dataset.comment;

        if (!worldName || idStr === undefined || !comment) {
          st_echo('warning', 'Entry data is incomplete for removal.');
          return;
        }

        const id = parseInt(idStr);
        if (isNaN(id)) {
          st_echo('warning', 'Invalid entry ID for removal.');
          return;
        }

        if (blacklist) {
          activeSession.blackListedEntries.push(`${worldName} (${comment})`);
        }

        if (activeSession.suggestedEntries[worldName]) {
          activeSession.suggestedEntries[worldName] = activeSession.suggestedEntries[worldName].filter(
            (e) => !(e.uid === id && e.comment === comment),
          );
        }
        entryElement.remove();
        saveSession();
      }

      async function handleAdd(event: Event) {
        const addButton = event.currentTarget as HTMLButtonElement;
        const entryElement = addButton.closest<HTMLDivElement>('.entry');
        if (!entryElement) return;

        addButton.disabled = true;
        try {
          const worldName = entryElement.dataset.worldName;
          const idStr = entryElement.dataset.id;
          const comment = entryElement.dataset.comment;

          if (!worldName || idStr === undefined || !comment) {
            st_echo('warning', 'Entry data is incomplete for adding.');
            return;
          }

          const id = parseInt(idStr);
          if (isNaN(id)) {
            st_echo('warning', 'Invalid entry ID for adding.');
            return;
          }
          const suggestedEntry = structuredClone(
            activeSession.suggestedEntries[worldName]?.find((e) => e.uid === id && e.comment === comment),
          );
          if (!suggestedEntry) {
            return;
          }

          // Get the selected world index from the dropdown
          const worldSelect = entryElement.querySelector<HTMLSelectElement>('.world-select');
          const selectedIndex = parseInt(worldSelect!.value);

          if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allWorldNames.length) {
            st_echo('warning', 'Please select a valid world.');
            return;
          }

          // Update the world name with the selected one
          const selectedWorldName = allWorldNames[selectedIndex];
          lastAddedWorldName = selectedWorldName; // Keep track for potential future adds

          // Remove from UI and session *before* adding to lorebook
          if (activeSession.suggestedEntries[worldName]) {
            activeSession.suggestedEntries[worldName] = activeSession.suggestedEntries[worldName].filter(
              (e) => !(e.uid === id && e.comment === comment),
            );
          }
          entryElement.remove();

          const status = await addEntry(suggestedEntry, selectedWorldName);
          st_echo('success', status === 'added' ? 'Entry added' : 'Entry updated');
        } catch (error: any) {
          console.error(error);
          st_echo('error', error instanceof Error ? error.message : error);
        } finally {
          addButton.disabled = false;
        }
      }

      applyEntriesToUI(activeSession.suggestedEntries, 'initial');

      function resetUIAndSession() {
        suggestedEntriesContainer!.innerHTML = '';
        activeSession.suggestedEntries = {};
        activeSession.blackListedEntries = [];
        if (avatar) {
          activeSession.selectedWorldNames = structuredClone(allWorldNames);
          selectAll();
        } else {
          activeSession.selectedWorldNames = [];
          deselectAll();
        }
        saveSession();
      }

      // Reset button handler
      const resetButton = popupContainer.querySelector<HTMLButtonElement>('#worldInfoRecommend_reset');
      resetButton!.addEventListener('click', async () => {
        try {
          const confirm = await globalContext.Popup.show.confirm(
            'World Info Recommender',
            'Are you sure you want to reset? This will clear all suggested entries and reset the \"Lorebooks to Include\".',
          );
          if (!confirm) {
            return;
          }
          resetUIAndSession();
          st_echo('success', 'Reset successful');
        } catch (error: any) {
          console.error(error);
          st_echo('error', error instanceof Error ? error.message : error);
        }
      });

      // Add all button handler
      addAllButton!.addEventListener('click', async () => {
        if (!addAllButton) return;
        addAllButton.disabled = true;

        try {
          // First, validate that we have worlds to add entries to
          if (allWorldNames.length === 0) {
            st_echo('error', 'No available worlds to add entries to');
            return;
          }

          // Count total entries to process
          const totalEntries = Object.values(activeSession.suggestedEntries).reduce(
            (sum, entries) => sum + entries.length,
            0,
          );

          if (totalEntries === 0) {
            st_echo('warning', 'No entries to add');
            return;
          }

          const confirm = await globalContext.Popup.show.confirm(
            'World Info Recommender',
            `Are you sure you want to add/update all ${totalEntries} suggested entries?`,
          );
          if (!confirm) {
            return;
          }

          let addedCount = 0;
          let updatedCount = 0;
          const modifiedWorlds = new Set<string>();
          const entriesToAdd: { worldName: string; entry: WIEntry }[] = [];

          // Process entries
          for (const [worldName, entries] of Object.entries(activeSession.suggestedEntries)) {
            if (entries.length === 0) continue;

            for (const entry of entries) {
              // If the world doesn't exist in the lorebook, use the first available world
              let targetWorldName = worldName;
              if (!entriesGroupByWorldName[targetWorldName]) {
                if (allWorldNames.length > 0) {
                  targetWorldName = allWorldNames[0];
                } else {
                  console.error(`No target world available for entry: ${entry.comment}`);
                  st_echo('error', `Cannot find target world for entry: ${entry.comment}`);
                  continue;
                }
              }
              entriesToAdd.push({ worldName: targetWorldName, entry });
            }
          }

          // Process collected entries
          for (const { worldName, entry } of entriesToAdd) {
            try {
              const status = await addEntry(entry, worldName, true); // Skip individual saves
              if (status === 'added') addedCount++;
              else updatedCount++;
              modifiedWorlds.add(worldName);
            } catch (error) {
              console.error(`Failed to process entry: ${entry.comment}`, error);
              st_echo('error', `Failed to process entry: ${entry.comment}`);
            }
          }

          // Save and reload all modified worlds at once
          for (const worldName of modifiedWorlds) {
            const stFormat: { entries: Record<number, WIEntry> } = {
              entries: {},
            };
            // Rebuild the format from the potentially updated entriesGroupByWorldName
            for (const entry of entriesGroupByWorldName[worldName]) {
              stFormat.entries[entry.uid] = entry;
            }
            try {
              await globalContext.saveWorldInfo(worldName, stFormat);
              globalContext.reloadWorldInfoEditor(worldName, true);
            } catch (error) {
              console.error(`Failed to save world: ${worldName}`, error);
              st_echo('error', `Failed to save world: ${worldName}`);
            }
          }

          // Clear suggested entries from session and UI after processing all
          activeSession.suggestedEntries = {};
          saveSession();
          suggestedEntriesContainer.innerHTML = '';

          // Show detailed results
          if (addedCount > 0 || updatedCount > 0) {
            const message = `
              <div class="results-summary">
                <p>Successfully processed ${addedCount + updatedCount} entries:</p>
                <ul>
                <li>Added: ${addedCount}</li>
                <li>Updated: ${updatedCount}</li>
                <li>Modified worlds: ${Array.from(modifiedWorlds).join(', ')}</li>
                </ul>
              </div>`;
            st_echo('success', message, { escapeHtml: false });
          } else {
            st_echo('warning', 'No entries were processed successfully');
          }
        } catch (error: any) {
          console.error(error);
          st_echo('error', error instanceof Error ? error.message : error);
        } finally {
          addAllButton.disabled = false;
        }
      });

      async function handleGeneration(continueFrom?: { worldName: string; entry: WIEntry }) {
        if (!sendButton || !promptTextarea) return;
        sendButton.disabled = true;

        try {
          const prompt = promptTextarea.value;

          if (!settings.profileId) {
            st_echo('warning', 'Please select a connection profile.');
            return;
          }
          if (!prompt) {
            st_echo('warning', 'Please enter a prompt.');
            return;
          }

          const selectedCharCardValue = charCardSelect?.value;
          const targetCharacterId = selected_group
            ? ((selectedCharCardValue ? Number(selectedCharCardValue) : undefined) ?? firstGroupMemberIndex)
            : undefined;

          const context = SillyTavern.getContext();
          const profile = context.extensionSettings.connectionManager?.profiles?.find(
            (p) => p.id === settings.profileId,
          );
          if (!profile) {
            st_echo('warning', 'Connection profile not found.');
            return;
          }

          const buildPromptOptions: BuildPromptOptions = {
            presetName: profile.preset,
            contextName: profile.context,
            instructName: profile.instruct,
            syspromptName: profile.sysprompt,
            ignoreCharacterFields: !settings.contextToSend.charCard,
            ignoreWorldInfo: true, // We don't need triggered world info here
            ignoreAuthorNote: !settings.contextToSend.authorNote,
            maxContext:
              settings.maxContextType === 'custom'
                ? settings.maxContextValue
                : settings.maxContextType === 'profile'
                  ? 'preset'
                  : 'active',
            includeNames: !!selected_group,
            targetCharacterId: targetCharacterId,
          };

          // Add message range options if character/group is selected
          if (!avatar) {
            buildPromptOptions.messageIndexesBetween = { start: -1, end: -1 };
          } else {
            switch (settings.contextToSend.messages.type) {
              case 'none':
                buildPromptOptions.messageIndexesBetween = { start: -1, end: -1 };
                break;
              case 'first':
                buildPromptOptions.messageIndexesBetween = {
                  start: 0,
                  end: settings.contextToSend.messages.first ?? 10,
                };
                break;
              case 'last':
                const lastCount = settings.contextToSend.messages.last ?? 10;
                const chatLength = context.chat?.length ?? 0;
                buildPromptOptions.messageIndexesBetween = {
                  end: Math.max(0, chatLength - 1),
                  start: Math.max(0, chatLength - lastCount),
                };
                break;
              case 'range':
                if (settings.contextToSend.messages.range) {
                  buildPromptOptions.messageIndexesBetween = {
                    start: settings.contextToSend.messages.range.start,
                    end: settings.contextToSend.messages.range.end,
                  };
                }
                break;
              case 'all':
              default:
                // No need to set messageIndexesBetween, defaults to all
                break;
            }
          }

          const promptSettings = structuredClone(settings.prompts);
          if (!settings.contextToSend.stDescription) {
            // @ts-ignore
            delete promptSettings.stDescription;
          }
          if (!settings.contextToSend.worldInfo || activeSession.selectedWorldNames.length === 0) {
            // @ts-ignore
            delete promptSettings.currentLorebooks;
          }
          const anySuggestedEntries = Object.values(activeSession.suggestedEntries).some(
            (entries) => entries.length > 0,
          );
          if (!settings.contextToSend.suggestedEntries || !anySuggestedEntries) {
            // @ts-ignore
            delete promptSettings.suggestedLorebooks;
          }
          if (activeSession.blackListedEntries.length === 0) {
            // @ts-ignore
            delete promptSettings.blackListedEntries;
          }

          const resultingEntries = await runWorldInfoRecommendation({
            profileId: settings.profileId,
            userPrompt: prompt,
            buildPromptOptions: buildPromptOptions,
            session: activeSession,
            entriesGroupByWorldName: entriesGroupByWorldName,
            promptSettings,
            mainContextList: settings.mainContextTemplatePresets[settings.mainContextTemplatePreset].prompts
              .filter((p) => p.enabled)
              .map((p) => ({
                promptName: p.promptName,
                role: p.role,
              })),
            maxResponseToken: settings.maxResponseToken,
            continueFrom,
          });

          if (Object.keys(resultingEntries).length > 0) {
            // Pass the last world name used during *this specific run* if any individual adds happened before
            applyEntriesToUI(resultingEntries, 'classic');
          } else {
            st_echo('warning', 'No results from AI');
          }
        } catch (error: any) {
          console.error(error);
          st_echo('error', error instanceof Error ? error.message : String(error));
        } finally {
          sendButton.disabled = false;
        }
      }

      sendButton!.addEventListener('click', () => handleGeneration());
    });
  });
}

function importCheck(): boolean {
  if (!globalContext.ConnectionManagerRequestService) {
    return false;
  }

  if (!globalContext.getCharacterCardFields) {
    return false;
  }

  if (!globalContext.getWorldInfoPrompt) {
    return false;
  }

  if (!globalContext.reloadWorldInfoEditor) {
    return false;
  }

  return true;
}

function main() {
  handleUIChanges();
  initializeCommands();
}

if (!importCheck()) {
  st_echo('error', `[${extensionName}] Make sure ST is updated.`);
} else {
  initializeSettings().then(() => {
    main();
  });
}
