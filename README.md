# DND Noticeboard Generator

A terminal-based noticeboard generator for DND-style worldbuilding.

## Requirements

- Node.js installed

## Run it

Open this folder in VS Code, then run:

```bash
npm start
```

No TypeScript setup is needed.

## Files

```text
src/main.js       Starts the app
src/app.js        Main menu and options flow
src/tables.js     Noticeboard quality and size tables
src/dice.js       Dice and weighted table helpers
src/generator.js  Noticeboard generation logic
src/input.js      Terminal input helpers
```

## Modes

- Manual: choose/enter most table results yourself.
- Semi-automatic: manually choose Quality and Size; the rest is rolled automatically.
- Automatic: every table is rolled automatically.
