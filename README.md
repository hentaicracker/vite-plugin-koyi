# Koyi ⚡

> AI-powered frontend development assistant — select any DOM element, ask Claude to help.

[中文文档](README_CN.md)

![Koyi demo](https://github.com/hentaicracker/vite-plugin-koyi/blob/main/koyi.gif?raw=true)

## Features

| Feature | Description |
|---------|-------------|
| 🎯 **Visual DOM Selection** | Click any element on the page; automatically resolves `data-insp-path` to the source file and line number |
| 💬 **AI Chat Panel** | Floating chat window with multi-turn conversation, streaming output, and session memory |
| ⚡ **Direct Claude Integration** | Bridges the local `claude` CLI (or Anthropic API) with zero latency |
| 🔌 **Vite Plugin** | Zero-config integration — injects path attributes at build time and starts a WebSocket bridge during development |

## Architecture

```
┌─────────────────── Browser ─────────────────────────────────────┐
│                                                                   │
│   <koyi-overlay> ── Shadow DOM ──────────────────────────────┐  │
│   │  ┌────────────────────────────────────────────────────┐  │  │
│   │  │  Header (⚡ Koyi)              [—] [✕]            │  │  │
│   │  ├────────────────────────────────────────────────────┤  │  │
│   │  │  Messages (streaming Markdown)                     │  │  │
│   │  ├────────────────────────────────────────────────────┤  │  │
│   │  │  [Button.tsx:12] × | [+DOM]                        │  │  │
│   │  ├────────────────────────────────────────────────────┤  │  │
│   │  │  textarea          [↑ Send]                        │  │  │
│   │  └────────────────────────────────────────────────────┘  │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│   DOM Inspector (transparent overlay when picker active)         │
│    hover → highlight element  click → capture data-insp-path     │
│                                                                   │
│   WebSocket  ws://localhost:5173/__koyi_ws                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────── Vite Dev Server (Node.js) ──────────────────────┐
│                                                                   │
│  KoyiServer (upgrade handler)                                    │
│    │                                                              │
│    ├── Read source files from disk (±25 lines around cursor)     │
│    └── ClaudeBridge                                               │
│           ├── mode: 'cli'  → spawn `claude --print <prompt>`    │
│           └── mode: 'api'  → @anthropic-ai/sdk streaming        │
│                                                                   │
│  transformPlugin (Vite transform hook)                            │
│    └── @code-inspector/core transformCode()                       │
│         Injects data-insp-path="file:line:col" into every        │
│         JSX/Vue/Svelte element at build time                      │
└──────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install

```bash
pnpm install
```

### 2. Build the Client Bundle

```bash
pnpm build:client
```

> This compiles the React overlay UI into a single IIFE bundle (`dist/client.iife.js`).
> The Vite plugin injects it into every HTML page automatically.

### 3. Start the Playground

```bash
pnpm playground
```

Open http://localhost:5173 — the **⚡ Koyi** panel appears in the bottom-right corner.

### 4. Configure Claude

**Option A: Local Claude Code CLI (recommended)**

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

**Option B: Anthropic API**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Switch in `vite.config.ts`:
```ts
KoyiPlugin({ claudeMode: 'api', apiKey: process.env.ANTHROPIC_API_KEY })
```

## Usage in Your Own Project

```bash
pnpm add vite-plugin-koyi -D
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
      claudeMode: 'cli',     // or 'api'
      hotkey: 'ctrl+shift+k',
      position: { x: 'right', y: 'bottom' },
    }),
  ],
})
```

## Workflow

1. **During development**, open the page — the **⚡ Koyi** floating panel appears in the bottom-right corner.
2. Click **🎯 Pick Element** in the panel to enter selection mode.
3. Hover over any DOM element → blue highlight + filename tooltip.
4. Click the target element → source context is read from disk; a chip tag appears.
5. Type your question (e.g. _"How do I add a hover effect to this button?"_) and send.
6. Koyi sends the **source snippet + HTML + your question** to Claude and streams back the answer.
7. Press `Ctrl+Shift+K` at any time to toggle the panel.

## Project Structure

```
koyi/
├── packages/
│   ├── vite-plugin-koyi/          # The Vite plugin package
│   │   └── src/
│   │       ├── shared/types.ts    # Shared types (WS protocol, DOM Context)
│   │       ├── node/
│   │       │   ├── index.ts       # Plugin entry point, exports KoyiPlugin()
│   │       │   ├── server.ts      # WebSocket server
│   │       │   └── claude-bridge.ts  # Claude CLI/API bridge
│   │       └── client/
│   │           ├── index.ts       # Web Component registration
│   │           ├── App.tsx        # Floating panel root component
│   │           ├── components/
│   │           │   ├── ChatPanel.tsx     # Chat interface
│   │           │   ├── DomInspector.tsx  # DOM selector
│   │           │   ├── MessageItem.tsx   # Message renderer (with code highlighting)
│   │           │   └── ContextTag.tsx    # DOM context chip
│   │           └── hooks/
│   │               ├── useWebSocket.ts   # WS connection management
│   │               └── useDrag.ts        # Panel drag
│   └── playground/                # Test React application
└── README.md
```

## Development

```bash
# In one terminal — watch client changes
pnpm dev:plugin

# In another terminal — start the playground
pnpm playground
```
