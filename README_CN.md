# Koyi ⚡

> AI 驱动的前端开发助手 —— 选中任意 DOM 元素，让 Claude 帮你解决问题。

[English](README.md)

![Koyi 演示](https://github.com/hentaicracker/vite-plugin-koyi/blob/main/koyi.gif?raw=true)

## 核心特性

| 功能 | 说明 |
|------|------|
| 🎯 **DOM 可视化选择** | 点击页面任意元素，自动解析 `data-insp-path` 定位源文件+行号 |
| 💬 **AI 对话面板** | 悬浮聊天窗口，支持多轮对话、流式输出、会话记忆 |
| ⚡ **直连 Claude Code** | 桥接本地 `claude` CLI（或 Anthropic API），零延迟 |
| 🔌 **Vite 插件** | 零配置集成，构建时自动注入路径属性，开发时启动 WebSocket 桥接 |

## 架构

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
│   DOM Inspector（选择模式下的透明覆盖层）                          │
│    悬停 → 高亮元素   点击 → 捕获 data-insp-path                   │
│                                                                   │
│   WebSocket  ws://localhost:5173/__koyi_ws                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────── Vite Dev Server (Node.js) ──────────────────────┐
│                                                                   │
│  KoyiServer (upgrade handler)                                    │
│    │                                                              │
│    ├── 从磁盘读取源文件（光标前后各 ±25 行）                       │
│    └── ClaudeBridge                                               │
│           ├── mode: 'cli'  → spawn `claude --print <prompt>`    │
│           └── mode: 'api'  → @anthropic-ai/sdk streaming        │
│                                                                   │
│  transformPlugin (Vite transform hook)                            │
│    └── @code-inspector/core transformCode()                       │
│         在构建时为每个 JSX/Vue/Svelte 元素注入                    │
│         data-insp-path="file:line:col"                           │
└──────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 安装

```bash
pnpm install
```

### 2. 构建客户端 Bundle

```bash
pnpm build:client
```

> 这一步把 React overlay UI 编译为一个 IIFE bundle (`dist/client.iife.js`)，
> Vite 插件会在每个 HTML 页面中注入它。

### 3. 启动 Playground

```bash
pnpm playground
```

打开 http://localhost:5173，右下角会出现 **⚡ Koyi** 面板。

### 4. 配置 Claude

**方式一：使用本地 Claude Code CLI（推荐）**

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

**方式二：使用 Anthropic API**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

在 `vite.config.ts` 中切换：
```ts
KoyiPlugin({ claudeMode: 'api', apiKey: process.env.ANTHROPIC_API_KEY })
```

## 在自己的项目中使用

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
    ...KoyiPlugin({
      claudeMode: 'cli',     // or 'api'
      hotkey: 'ctrl+shift+k',
      position: { x: 'right', y: 'bottom' },
    }),
    react(),
  ],
})
```

## 使用流程

1. **开发时** 打开页面，右下角出现 **⚡ Koyi** 浮动面板
2. 点击面板中的 **🎯 Pick Element** 进入选择模式
3. 鼠标悬停到任意 DOM 元素 → 蓝色高亮 + 文件名提示
4. 点击目标元素 → 自动读取源文件上下文，出现 chip 标签
5. 在输入框输入问题（如：_"这个 button 的 hover 效果怎么加？"_）→ 发送
6. Koyi 将**源代码片段 + HTML + 你的问题**一起发给 Claude，流式返回答案
7. `Ctrl+Shift+K` 随时隐藏/显示面板

## 项目结构

```
koyi/
├── packages/
│   ├── vite-plugin-koyi/          # Vite 插件包
│   │   └── src/
│   │       ├── shared/types.ts    # 共享类型（WS 协议、DOM Context）
│   │       ├── node/
│   │       │   ├── index.ts       # 插件入口，export KoyiPlugin()
│   │       │   ├── server.ts      # WebSocket 服务器
│   │       │   └── claude-bridge.ts  # Claude CLI/API 桥接
│   │       └── client/
│   │           ├── index.ts       # Web Component 注册
│   │           ├── App.tsx        # 浮动面板根组件
│   │           ├── components/
│   │           │   ├── ChatPanel.tsx     # 对话界面
│   │           │   ├── DomInspector.tsx  # DOM 选择器
│   │           │   ├── MessageItem.tsx   # 消息渲染（含代码高亮）
│   │           │   └── ContextTag.tsx    # DOM 上下文 chip
│   │           └── hooks/
│   │               ├── useWebSocket.ts   # WS 连接管理
│   │               └── useDrag.ts        # 面板拖拽
│   └── playground/                # 测试用 React 应用
└── README.md
```

## 开发

```bash
# 在一个终端监听 client 变化
pnpm dev:plugin

# 在另一个终端启动 playground
pnpm playground
```
