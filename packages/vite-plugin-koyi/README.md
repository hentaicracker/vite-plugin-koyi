# vite-plugin-koyi ⚡

> AI-powered frontend development assistant for Vite — select any DOM element and ask Claude to help.

![Koyi demo](https://github.com/hentaicracker/vite-plugin-koyi/blob/main/koyi.gif?raw=true)

## What it does

- **Visual DOM picker** — click any element on the page; the plugin resolves its source file and line number automatically via `data-insp-path` attributes injected at build time.
- **Floating AI chat panel** — multi-turn conversation with streaming output rendered as rich Markdown (tables, code blocks with syntax highlighting, etc.).
- **Claude integration** — bridges the local `claude` CLI or the Anthropic API with zero configuration.
- **Shadow DOM isolation** — the overlay never interferes with your app's styles or scroll behaviour.

## Installation

```bash
npm install -D vite-plugin-koyi
# or
pnpm add -D vite-plugin-koyi
# or
yarn add -D vite-plugin-koyi
```

## Setup

### Option A — Claude Code CLI (recommended)

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { KoyiPlugin } from 'vite-plugin-koyi'

export default defineConfig({
  plugins: [
    react(),
    ...KoyiPlugin({
      claudeMode: 'cli',
    }),
  ],
})
```

### Option B — Anthropic API

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { KoyiPlugin } from 'vite-plugin-koyi'

export default defineConfig({
  plugins: [
    react(),
    ...KoyiPlugin({
      claudeMode: 'api',
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  ],
})
```

## Configuration

```ts
KoyiPlugin(options?)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `claudeMode` | `'cli' \| 'api'` | `'cli'` | How to call Claude — local CLI or Anthropic API |
| `apiKey` | `string` | `process.env.ANTHROPIC_API_KEY` | API key (required when `claudeMode: 'api'`) |
| `autoApply` | `boolean` | `true` | Pass `--dangerously-skip-permissions` to the CLI so changes are applied without confirmation prompts |
| `hotkey` | `string` | `'ctrl+shift+k'` | Keyboard shortcut to toggle the panel |
| `position` | `{ x: 'left' \| 'right', y: 'top' \| 'bottom' }` | `{ x: 'right', y: 'bottom' }` | Initial position of the floating panel |

## Usage

1. Start your Vite dev server — the **⚡ Koyi** panel appears in the corner of the page.
2. Click **🎯 Pick Element** and hover over any DOM element to highlight it.
3. Click the element — a chip tag appears showing the source file and line number.
4. Type your question in the chat input and send.
5. Koyi streams Claude's answer back in real time, with full Markdown rendering.
6. Press `Ctrl+Shift+K` (or your configured hotkey) to hide/show the panel.

## How it works

```
Browser (Shadow DOM overlay)
  └── WebSocket /__koyi_ws
        └── Vite dev server (Node.js)
              ├── Reads ±25 source lines around each selected element
              └── ClaudeBridge
                    ├── CLI mode  →  spawn `claude --print --output-format stream-json`
                    └── API mode  →  @anthropic-ai/sdk streaming
```

At build time the plugin uses `@code-inspector/core` to inject `data-insp-path="file:line:col"` into every JSX / Vue / Svelte element, which is how the overlay knows which source file to read.

## Requirements

- Node.js ≥ 18
- Vite ≥ 4
- For CLI mode: [`@anthropic-ai/claude-code`](https://www.npmjs.com/package/@anthropic-ai/claude-code) installed globally

## License

MIT
