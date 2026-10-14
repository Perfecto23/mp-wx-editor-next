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


## 保存、历史与带图备份

- 编辑内容自动保存到当前浏览器。状态栏显示真实保存结果；存储失败或另一标签页已改写草稿时，保留编辑器内容并阻止直接切换。可先使用“备份”导出当前内容。
- “保存到历史记录”及成功复制会创建去重后的独立快照。加载旧稿前先保留当前内容，恢复后再保存不会覆盖原记录。历史不再自动截断到20条；1000条上限时会明确提示。
- 顶栏“备份”导出当前草稿、全部历史和它们引用的本地图片，格式为版本化JSON。外链图片仍是外链；需要离线交付单篇文章可用“下载 HTML”。
- “导入备份”先校验结构、图片SHA-256和引用完整性，再显示数量供确认。始终作为新副本导入，当前草稿保持原样；图片重新分配ID，避免覆盖现有图片。写入历史失败时回收本次新增图片。
- 备份上限32MB、200张图、每图10MB；支持PNG/JPEG/GIF/WebP。文件保存在本机，不上传服务端。备份可能包含私人文章，请自行妥善保管。
- 复制和HTML下载按点击时正文即时渲染，保留嵌套列表、链接与代码空白；缺失图片明确报错，剪贴板不可用时交付同内容的HTML文件。

现有 `markdownInput`、`currentStyle`、`articleHistory` 和 IndexedDB `WechatEditorImages` 沿用，无需清空浏览器数据。上线回滚可使用EdgeOne上一部署；部署回滚不会回滚用户浏览器数据。上线前后均可导出备份。

## 验证

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
# 或 CHROMIUM_PATH=/path/to/chrome pnpm run test:e2e
```

浏览器测试覆盖即时复制、带图备份与空环境恢复、坏包拒绝、保存失败切换保护、手机视口与HTML安全处理。测试只使用合成数据；微信后台实际粘贴兼容性需在相应账号中另行确认。
