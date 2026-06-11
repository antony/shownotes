# Welcome to md-present

A simple markdown presentation tool built with SvelteKit.

Use **arrow keys** to navigate between slides.

!---
@animate fade
Welcome the audience. Mention this is built with SvelteKit and uses markdown files for content.

Remember to demo the **keyboard navigation** at the end.
---!

# Features

- Reads markdown from a file specified in `.env`
- Splits on `# headings` into slides
- Renders markdown content per slide
- Keyboard navigation (← →, space, backspace)
- Presenter notes with `Ctrl+Alt+T`
- Slide directives like `@animate`

!---
@animate slide-in
Walk through each bullet point. Emphasise that the `!---` / `---!` blocks are **not shown** on the slide itself.
---!

# Code Example

Here's some code:

```js
const greeting = 'Hello, world!';
console.log(greeting);
```

Pretty neat, right?

!---
@animate zoom
This slide has no special talking points — just show the code rendering.
---!

# Lists & Formatting

1. **Bold text** for emphasis
2. *Italic text* for style
3. `inline code` for technical terms
4. ~~Strikethrough~~ for corrections

> Blockquotes work too!

!---
@animate flip
Point out each formatting style. The blockquote is a nice touch.
---!

# Thank You

That's all folks. 🎉

!---
@animate drop
Ask if there are any questions. Thank everyone for attending.
---!
