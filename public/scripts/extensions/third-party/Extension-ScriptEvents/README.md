# Script Events

Allows setting app event listeners that execute STscript commands.

Events are cleared when the SillyTavern page is refreshed or closed.

## Usage

1. Install the extension.
2. Use `/event-on event=eventId {: closure code :}` to set an event listener. Get the event ID using the autocomplete feature. The closure is an STscript command that will be executed when the event is triggered (string subcommands are not supported). The command returns a listener ID that can be used to remove the event listener.
    - Use `/var arg0` to access the event argument, or `/var arg0.key` to access a specific key if the argument is a map.
    - Array elements can be accessed by index key, e.g. `/var arg0.0` for the first element.
3. Use `/event-off listenerId` to remove an event listener.
4. Use `/event-once` to set a one-time event listener that will be removed after it is triggered.

## Examples

Set an event listener that outputs a current chat name.

```stscript
/event-on event=CHAT_CHANGED {: /var arg0 | /echo :}
```

## License

AGPL-3.0
