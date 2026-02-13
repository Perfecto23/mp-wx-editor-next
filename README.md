# 公众号 Markdown 排版器

专为微信公众号设计的 Markdown 编辑器，支持 8 种精选样式主题、实时预览、图片智能压缩、一键复制到公众号后台。

纯前端实现，无需后端服务，数据全部存储在浏览器本地。

## 功能特性

- 8 种精选排版样式 — 经典公众号、Claude、技术风格、宝玉AI 等
- 实时预览 — 编辑即所见，所见即所得
- 智能图片处理 — 粘贴/拖拽图片自动压缩，IndexedDB 本地持久化
- 一键复制 — 复制到公众号后台，格式完美保留
- 智能粘贴 — 从飞书、Notion、网页粘贴自动转换为 Markdown
- 代码高亮 — macOS 风格代码块，多语言语法高亮
- 文章历史 — 自动保存，最多 20 篇历史记录
- 样式收藏 — 收藏常用样式，快速切换
- 响应式布局 — 桌面端左右分栏，移动端上下布局
- CJK 兼容 — 中日韩文字加粗/斜体完美支持

## 技术栈

- Next.js 16 + React 19
- Tailwind CSS v4
- TypeScript
- markdown-it + highlight.js
- IndexedDB + localStorage

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000 即可使用。

## 构建部署

```bash
npm run build
```

项目配置为静态导出（`output: 'export'`），构建产物在 `out/` 目录，可直接部署到任何静态托管服务。

## 项目结构

```
app/
├── components/     UI 组件（Header, Editor, Preview, StyleSelector 等）
├── config/         配置（8 种样式主题、默认示例）
├── hooks/          自定义 Hook（渲染管线、图片处理、智能粘贴等）
├── lib/            工具模块（图片存储、压缩、CJK 补丁等）
├── types/          TypeScript 类型定义
├── globals.css     设计令牌（Flat Design + Swiss Modernism 2.0）
├── layout.tsx      根布局
└── page.tsx        主页面
```

## 许可证

MIT
