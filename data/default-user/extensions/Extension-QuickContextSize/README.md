# Quick Context Buttons

Adds buttons to quickly set a context size without having to use a slider or type in a number.

## Installation

No special requirements. Install via built-in extensions installer.

```txt
https://github.com/SillyTavern/Extension-QuickContextSize
```

## Tips

You can hide unneeded buttons with custom CSS or a slash command `/qcs-toggle`.

```css
/* Hide the 8k button */
.quick_context_size[data-size="8192"] {
    display: none;
}
```

```stscript
// Hide the 8k button ||
/qcs-toggle 8192 ||
```

## License

AGPL-3.0
