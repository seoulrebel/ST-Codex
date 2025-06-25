# Sampler Commands

Adds slash commands for manipulating sampler parameters for the currently selected API.

## Installation

Install from the URL using the extension installer.

```sh
https://github.com/SillyTavern/Extension-SamplerCommands
```

## Slash Commands

### `/sampler-get`

Gets a value of the sampling parameter. Can return either a number or a boolean depending on the type of the control.

```stscript
/sampler-get temp | /echo
```

### `/sampler-set`

Sets a value of the sampling parameter. Accepts both numbers (for sliders) and boolean values (for checkboxes).

```stscript
/sampler-set name=temp 1.1
```

## License

AGPL-3.0
