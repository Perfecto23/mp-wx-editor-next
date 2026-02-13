// 样式元素类型
export interface StyleElements {
  container: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  p: string;
  strong: string;
  em: string;
  a: string;
  ul: string;
  ol: string;
  li: string;
  blockquote: string;
  code: string;
  pre: string;
  hr: string;
  img: string;
  table: string;
  th: string;
  td: string;
  tr: string;
}

// 样式主题
export interface StyleTheme {
  name: string;
  styles: StyleElements;
}

// 样式配置
export type StylesConfig = Record<string, StyleTheme>;

// 图片元数据
export interface ImageMetadata {
  id: string;
  name: string;
  originalName?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: string;
  mimeType: string;
  createdAt?: number;
}

// 图片存储记录
export interface ImageRecord {
  id: string;
  blob: Blob;
  metadata: ImageMetadata;
}

// 文章历史记录
export interface ArticleHistory {
  id: string;
  title: string;
  content: string;
  style: string;
  createdAt: number;
  updatedAt: number;
}

// Toast 状态
export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

// 图片压缩选项
export interface CompressorOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}
