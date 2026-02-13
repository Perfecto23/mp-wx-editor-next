# 公众号 Markdown 排版器 (mp-wx-editor-next)

> 专为微信公众号设计的纯前端 Markdown 编辑器，支持 8 种样式主题、实时预览、图片压缩存储、一键复制富文本到公众号后台。
>
> 从 Vue 3 单文件架构重写为 Next.js 16 + React 19 + Tailwind CSS v4 模块化架构。

---

## 架构总览

```
app/
├── components/        6 个 UI 组件
│   ├── Header.tsx         顶部导航栏（蓝色 accent logo）
│   ├── StyleSelector.tsx  样式选择器（横向滚动 pill 按钮）
│   ├── EditorPane.tsx     编辑器面板（textarea + 工具栏）
│   ├── PreviewPane.tsx    预览面板（渲染结果 + 操作按钮）
│   ├── HistorySidebar.tsx 历史记录侧边栏（slide-in 动画）
│   └── Toast.tsx          Toast 提示
├── config/
│   ├── styles.ts          8 种公众号样式主题（内联 CSS）
│   └── default-example.ts 默认示例 Markdown
├── hooks/             8 个自定义 Hook
│   ├── useMarkdownRenderer.ts  渲染管线（preprocess → md.render → image → inline styles）
│   ├── useSmartPaste.ts        智能粘贴（HTML/图片/Markdown 自动识别）
│   ├── useClipboard.ts         复制到公众号（Grid→Table + Base64）
│   ├── useImageStore.ts        IndexedDB 图片存储
│   ├── useImageCompressor.ts   Canvas 图片压缩
│   ├── useArticleHistory.ts    文章历史记录（localStorage）
│   ├── useStyleManager.ts      样式选择/收藏/持久化
│   └── useTurndown.ts          HTML→Markdown 转换
├── lib/               7 个工具模块
│   ├── image-store.ts       ImageStore 类（IndexedDB CRUD）
│   ├── image-compressor.ts  ImageCompressor 类（Canvas 压缩）
│   ├── image-protocol.ts    img:// 协议解析
│   ├── image-grouping.ts    连续图片网格分组
│   ├── grid-to-table.ts     CSS Grid → HTML Table（公众号兼容）
│   ├── inline-styles.ts     DOM 遍历 + 内联样式应用
│   ├── markdown-patches.ts  CJK 加粗/斜体补丁
│   ├── preprocess.ts        Markdown 预处理（飞书兼容）
│   └── utils.ts             通用工具函数
├── types/
│   └── index.ts         TypeScript 接口定义
├── globals.css          Tailwind v4 设计令牌（Flat Design + Swiss Modernism 2.0）
├── layout.tsx           根布局（Inter 字体）
└── page.tsx             主页面（EditorPage 组件，flex 布局）
```

---

## 核心数据流

### Markdown 渲染管线

```
markdownInput (useState)
    → preprocessMarkdown()        飞书格式修复、列表规范化
    → md.render()                 markdown-it + highlight.js
    → processImageProtocol()      img:// → IndexedDB → Object URL
    → applyInlineStyles()         DOM 遍历 + 当前主题内联样式
    → renderedContent (useState)
```

### 复制到公众号管线

```
copyToClipboard()
    → convertGridToTable()        CSS Grid → HTML Table
    → convertImageToBase64()      IndexedDB Blob → Base64
    → Section 容器包裹
    → 代码块简化 + 列表扁平化
    → ClipboardItem(text/html + text/plain)
```

### 图片处理管线

```
粘贴/拖拽图片
    → handleSmartPaste()          检测 clipboardData
    → ImageCompressor.compress()  Canvas 缩放 ≤1920px, JPEG 0.85
    → ImageStore.saveImage()      IndexedDB 持久化
    → 插入 ![name](img://img-xxx)
    → 渲染时 processImageProtocol() 替换为 blob: URL
```

---

## 样式系统

`config/styles.ts` 包含 8 种公众号样式主题：

1. 默认公众号风格
2. Claude（Anthropic 品牌色）
3. 技术风格（推荐）
4. 优雅简约
5. Hische·编辑部
6. 少数派·极客
7. 包豪斯·几何
8. 宝玉AI（#0F4C81 深蓝，h2 蓝底白字块）

每个主题定义 h1-h6, p, strong, em, a, ul, ol, li, blockquote, code, pre, hr, img, table, th, td, tr 的完整内联 CSS。

所有样式值为内联 CSS 字符串（公众号兼容要求：不支持 class、CSS Variables、外部样式表）。所有主题均无 container 背景色。

---

## 设计令牌

`globals.css` 使用 Tailwind v4 `@theme inline` 定义 Flat Design + Swiss Modernism 2.0 设计令牌：

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--color-primary` | `#111111` | 主文字 |
| `--color-secondary` | `#444444` | 次要文字 |
| `--color-tertiary` | `#888888` | 辅助文字 |
| `--color-accent` | `#2563EB` | 蓝色强调色 |
| `--color-accent-hover` | `#1D4ED8` | 强调色 hover |
| `--color-surface` | `#FFFFFF` | 表面白 |
| `--color-bg-main` | `#F7F7F8` | 冷灰背景 |
| `--color-bg-secondary` | `#EEEFF2` | 次要背景 |
| `--color-border` | `#D1D5DB` | 边框 |
| `--color-border-light` | `#E5E7EB` | 浅边框 |
| `--color-error` | `#DC2626` | 错误色 |
| `--color-success` | `#16A34A` | 成功色 |

字体栈：Inter + PingFang SC + Noto Sans SC 回退链。

---

## 布局架构

主页面使用 flex 布局，关键约束：

- `h-screen` 全屏高度
- `flex-1 flex min-h-0 overflow-hidden` 主内容区（防止子面板撑破容器）
- 左右面板各 `w-1/2`，组件根 div 均带 `min-h-0` 确保独立滚动
- 移动端 `max-md:flex-col`，编辑器 `h-[45vh]`，预览区 `flex-1`

---

## 持久化方案

| 存储 | Key | 数据 |
|------|-----|------|
| IndexedDB `WechatEditorImages` | `images` store | 图片 Blob + 元数据 |
| localStorage | `markdownInput` | 当前编辑内容 |
| localStorage | `currentStyle` | 当前选中样式 |
| localStorage | `starredStyles` | 收藏的样式列表 (JSON) |
| localStorage | `articleHistory` | 文章历史记录 (JSON, 最多 20 篇) |

---

## 公众号兼容约束

- 不支持: CSS Grid, Flexbox（部分）, CSS Variables, 外部样式表, class 选择器
- 必须使用: 内联 `style` 属性, `<table>` 布局替代 Grid, Base64 图片
- 深色模式: 使用 `rgba(0,0,0,x)` 替代固定颜色

---

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.6 | 框架 (Turbopack, 静态导出) |
| React | 19 | UI |
| Tailwind CSS | v4 | 样式 (`@theme inline`) |
| markdown-it | 14.0.0 | Markdown → HTML |
| highlight.js | 11.9.0 | 代码语法高亮 |
| turndown | 7.2.0 | HTML → Markdown（智能粘贴） |
| html2canvas | 1.4.1 | 图片生成 |

---

## 开发指南

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run lint     # ESLint 检查
```

### 添加新样式主题

1. `app/config/styles.ts` — 添加新的 key-value 配置
2. 确保所有必需元素（h1-h6, p, strong, em, a, ul, ol, li, blockquote, code, pre, hr, img, table, th, td, tr）都有定义
3. 样式选择器会自动渲染新主题
4. 不要给 container 添加 background-color

### 修改图片处理

- 压缩参数: `app/hooks/useImageCompressor.ts`
- 网格布局: `app/lib/image-grouping.ts`
- Grid→Table: `app/lib/grid-to-table.ts`

### CJK 加粗兼容

- `app/lib/markdown-patches.ts` — markdown-it delimiter 扫描器补丁
- `app/lib/preprocess.ts` — 飞书等来源的格式修复
