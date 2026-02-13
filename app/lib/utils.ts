/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * 从 Markdown 内容提取标题
 */
export function extractTitle(markdownContent: string): string {
  if (!markdownContent || !markdownContent.trim()) {
    return '无标题';
  }

  // 尝试匹配第一个 # 标题
  const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    let title = titleMatch[1].trim();
    title = title.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
    return title.substring(0, 50);
  }

  // 如果没有标题，取前 20 个字符
  const cleanContent = markdownContent
    .replace(/^!\[.*?\]\(.*?\)$/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();

  if (cleanContent) {
    return cleanContent.substring(0, 20) + (cleanContent.length > 20 ? '...' : '');
  }

  return '无标题';
}

/**
 * 格式化历史记录时间
 */
export function formatHistoryDate(timestamp: number): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) {
    return '刚刚';
  }

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} 分钟前`;
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} 小时前`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  if (year === now.getFullYear()) {
    return `${month}-${day} ${hour}:${minute}`;
  }

  return `${year}-${month}-${day}`;
}

/**
 * 从内联样式字符串提取背景颜色
 */
export function extractBackgroundColor(styleString: string): string | null {
  if (!styleString) return null;

  const bgColorMatch = styleString.match(/background-color:\s*([^;]+)/);
  if (bgColorMatch) {
    return bgColorMatch[1].trim();
  }

  const bgMatch = styleString.match(/background:\s*([#rgb][^;]+)/);
  if (bgMatch) {
    const bgValue = bgMatch[1].trim();
    if (bgValue.startsWith('#') || bgValue.startsWith('rgb')) {
      return bgValue;
    }
  }

  return null;
}
