# Changelog

#### v0.9.5
**ST Version Requirement:** You must be on ST version 1.12.14 or greater as it relies on this PR https://github.com/SillyTavern/SillyTavern/pull/3763#issue-2948421833

**IMPORTANT**: Due to some changes with how the prompt injections are built, you should go to your short-term and long-term config sections and click "Edit", then click "Restore Default", then edit how you want from there.

- **New Feature**: You can now use `{{short_term_memory}}` and `{{long_term_memory}}` macros in your story string (or in chat completion prompts) if you want to manually inject them. If you do this, make sure to select "Do not inject" in the config, or they will be injected twice.
- **New Feature**: You can now specify a summary injection threshold - a number of messages after which summaries will start being injected. You can also optionally remove messages from context after that threshold as well. If you set the threshold to 0 and *don't* exclude messages, the behavior is equivalent to before this version. 
- **Removed**: Because of the new summary injection threshold and the ability to exclude messages after it, the "Message Injection Limit" config has been removed.
- **Change**: Reworked how you define the short-term and long-term injections - they now define the new memory macros. If there are no memories, the macros will be empty - this means you no longer need to use {{#if ..}} clauses in the memory injection templates.
- **Change**: Changed how custom colors are defined for the extension. Instead of using classes you can now just set variables. See the custom CSS section of README.md
- **Fix**: Summary injections are now wrapped in a system prompt if injected automatically (no system prompt if using the macros).
- **Fix**: Fixed summary injection not immediately updating when updating the template.

#### v0.8.22
- **IMPORTANT #1:** The max token length used for your summaries will be broken and you will need to update your config.

- **IMPORTANT #2:** You must be on ST version 1.12.13 or above as it relies on the following PRs: 
  - https://github.com/SillyTavern/SillyTavern/pull/3544#issue-2873858897
  - https://github.com/SillyTavern/SillyTavern/pull/3592#issue-2889204530
  - https://github.com/SillyTavern/SillyTavern/pull/3673#issue-2915351656

- **New Feature**: You can now choose a completion preset to use for summaries. Notably, this is how the max token length of summaries is now defined, and the previous "Summary Max Token Length" setting has been removed. By default, your currently selected preset will be used until changed. This means that **upon updating, your summaries will use the token length from your current preset** until you assign a custom preset which uses a different token length. The {{words}} macro also uses the value from the selected preset.
- **New Feature**: You can now choose a connection profile to use for summaries. By default, your currently selected profile will be used.
- **New Feature**: New "Edit Memory" interface, allowing compact access to all summaries in the chat where you can edit, delete, re-summarize, etc. The "preview memory state" button has been moved to this interface, and the "mass re-summarize" button has been removed completely as the interface provides all the same functionality. The ability to copy summaries has also been moved to this interface.
- **New Feature**: You can now separately lock a profile to the current character OR chat, and there is an option to show a notification when switching profiles.
- **New Feature**: You can now import and export config profiles.
- **New Feature**: The advanced formatting setting "Trim Incomplete Sentences" now affects summaries. Note that this is an instruction template setting, which means it will be included in connection profiles. If you use a different connection profile for summaries, you must make sure that the associated instruction template has this option toggled how you want it.
- **New Feature**: You can now specify the separator string between summaries when they are injected.
- **New Feature**: Support for reasoning models. Reasoning portion of a summary generation is removed from the response.
- **New Feature**: You can now optionally provide a prefill for summary generations.
- **New Feature**: You can now optionally specify short and long-term context limit directly by number of tokens.
- **New Feature**: You can now optionally make profiles use a global toggle state between all chats that use this option. This means that if you toggle the extension off in one chat with this option, it will be off in all chats that also use this option. Chats that don't have this option enabled will not be affected, as is the current behavior.
- **New Slash Command**: `/toggle_memory_edit_interface` will open the memory edit interface.
- **New Slash Command**: `/toggle_memory_injection_preview` will open a preview of what will be injected into context (same as the "Preview Memory State" button).
- **New Slash Command**: `/get_memory <n>` will return the memory associated with the given message index.
- **Fix**: Optimized the extension in huge chats (10k+ messages), no longer freezes.
- **Fix**: The summaries used in the {{history}} macro now match the inclusion criteria of the summary injection. The *messages* included are not affected, just the associated summaries.
- **Fix**: Memories can still be edited from the main chat even when not displayed below each message.
- **Change**: The old "Include System Messages" option has been renamed to "Include Hidden Messages", as it really refers to messages which are hidden from context. A new option now called "Include System Messages" has been added which instead refers to *narrator* messages, like those from the `/sys` command.


#### v0.7.3
- **IMPORTANT:** You must be on ST version 1.12.12 or above as it relies on the following PRs:
  - https://github.com/SillyTavern/SillyTavern/pull/3327#issue-2803062094
  - https://github.com/SillyTavern/SillyTavern/pull/3331#issue-2803412920
  - https://github.com/SillyTavern/SillyTavern/pull/3430#issue-2831026016
- **New Feature**: You can now manually exclude a summarization from being injected without deleting it. A new button has been added to the message button menu to toggle the inclusion of the summary (labelled "Force Exclude"). Manually excluded summaries will be colored a darker grey color than automatically excluded summaries.
- **New Feature**: You can now prevent specific characters from being summarized in group chats. To do this, open the group chat panel and go down to where you would normally mute characters. Use the glowing brain icon to toggle whether a character will be summarized. Note that this is separate from config profiles, and will only apply to the group chat you are in.
- **New Feature**: Option to trigger auto-summarization immediately *before* a new message instead of *after* a new message. This is useful if you don't want to use message lag to prevent the most recent message from getting immediately summarized after it is received. The tradeoff between this and message lag is that with this setting you don't get the opportunity to edit the summary before it is injected for the next message, whereas with message lag the summary of the most recent message won't be generated until after the next message. An example use-case for this setting would be if you have set your "Message History Limit" to 0, meaning that your previous messages aren't injected into context at all and you are completely relying on summaries. But, you also want to save on generation tokens by waiting until you have finished editing/swiping to perform a summary of the most recent message. In this case, you can't use message lag because then the most recent summary wouldn't be present for context. Instead, you would need to use this setting to prevent the most recent message from getting immediately summarized while also ensuring that the summary is generated before the next message.
- **New Feature**: New button to copy all summaries in the entire chat to clipboard.
- **New Slash Command**: `/stop_summarization` -  same as the stop button, aborts any summarization currently running.
- **New Slash Command**: `/toggle_memory_popout` - toggles the memory config popout.
- **New Slash Command**: `/summarize <n>` - summarizes the given message index (default to most recent message)
- **New Slash Command**: `/get_memory_enabled` - returns whether the extension is enabled in the current chat.
- **New Slash Command**: `/force_exclude_memory <n>` - toggles the inclusion of the summary for the given message index, same as the new "Force Exclude" button.
- **New Menu Button**: You can now also toggle memory for the current chat in the wand menu.
- **Change**: Finally reworked the popout logic to fix the problem with the escape key. For real this time.
- **Change**: Message visuals now properly update retroactively when clicking "load more messages" for long chats.
- **Change**: Auto-summarize now immediately triggers a summarization on user message if the option is selected, instead of waiting until the character sends a message.
- **Change**: You guessed it, moved settings around again.
- **Change**: Moved the "summarize" message button away from the "remember" button to prevent accidentally re-summarizing a message when trying to mark it for long-term memory.
- **Change**: The `/toggle_memory` slash command can now take a boolean argument to toggle the extension on and off directly within the current chat.
- **Fix**: Fixed issue causing old swipes to not have their memory saved properly. The chat also now properly scrolls to the bottom when summarizing and swiping the most recent message to accommodate the space of the displayed memory.
- **Fix**: Fixed issue causing the most recent message's previous summary to be injected into the main prompt when swiping it.
- **Fix**: Fixed the `/remember` command not working properly when provided a message index.
- **Misc**: This changelog and previous versions are now present on the github page.


#### v0.7.1
- **IMPORTANT:** Your current profiles will be unbound from their characters, and you will need to re-lock them.
- **Change**: Changed how profiles are stored, now properly using character avatar paths instead of character_id to keep track of locked profiles. This means that your current profiles will be unbound from their characters, and you will need to re-lock them. Sorry about this, it shouldn't change again after this update unless ST makes an internal change.
- **Fix**: Fixing several bugs with the progress bar and adding a background to make it more readable.
- **Fix**: Fixing issue causing some config settings to not be applied properly in some circumstances.
- **New Feature**: Added option to specify a time delay (in seconds) between consecutive summarizations, useful for external APIs that have rate limit. Integrated with the progress bar, and stopping summarizing will also cancel the delay.

#### v0.6.0
- **IMPORTANT**: the summarization prompt now requires the **{{message}}** macro, and optionally the **{{history}}** macro. You can temporarily reset the templates to default settings to see how they are used.

- **Change**: I changed the settings UI again, sorry couldn't help it. Things were getting cluttered.
  - All prompt editing has been moved to separate popups
  - The "current memory state" has been moved to a separate popup
  - Moved "Summarization" section to the top, as it is probably be used the most
  - Some buttons shrunk down, some settings moved around

- **New feature**: Ability to add message history to summarization prompt using the {{history}} macro.
You can configure how many messages (and/or summaries) to add as context when summarizing a given message. 

- **Change**: The summarization prompt now requires the {{message}} macro to insert the message for summarization. If your prompt doesn't have it, it will automatically be inserted at the bottom.

- **New Feature**: New button to preview an example of the summarization prompt with everything filled into the instruct template. Useful for tweaking how the prompt is structured so you don't have to run a test generation and check the console.

- **New feature**: Ability to do summaries in "batches", specifying how many messages to wait before catching up. Summaries are still done one message at a time, but this means you don't have to wait after every single message.

- **New feature**: Progress bar added to show summarization progress (when more than 1 message is being summarized). Can be disabled for auto-summarization.

- **New feature**: The button in the config to re-summarize the chat now has a popup to select various inclusion options (only summarize messages without summaries, only re-summarize short-term memories, etc).
 
- **Change**: because of the new ability to add previous summarizations as context, summarizations now must occur in chronological order. There is now a config option to limit how far back auto-summarization will start (default 100 messages). This means that if you start summarizing on a fresh new chat, it will start 100 messages back unless you change the config setting.


#### v0.4.5
- **New Feature**: Added the ability to limit the number of messages sent in normal generations. By default it is -1 (disabled), but making this 4 for example would mean only 4 recent messages get sent when generating. The memories still get sent normally.
- **Change**: Reworked method used to "lock" a profile to specific characters. Now there is just a button to lock the currently selected profile (similar to how you lock a persona), instead of selecting it in a separate dropdown. Looks less cluttered I think.
- **Fix**: Made the default profile selection work with groups.
- **New Feature**: Added the ability to completely disable the extension on a chat-by-chat basis. Either use the button at the very top of the config, or use the /toggle_memory command.
- **New Feature**: Added option to have the extension disabled by default for newly created chats
- **New Feature**: Added an option to delay summarization by some number of messages.
