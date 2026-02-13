/**
 * Markdown 预处理
 * 迁移自 app.js:941-971
 *
 * 功能：
 * 1. 规范化分割线格式（修复飞书等复制时的解析问题）
 * 2. 修复飞书等复制时的加粗格式断裂问题
 * 3. 规范化列表项格式
 */
export function preprocessMarkdown(content: string): string {
  // 规范化水平分割线格式
  content = content.replace(/^[ ]{0,3}(\*[ ]*\*[ ]*\*[\* ]*)[ \t]*$/gm, '***');
  content = content.replace(/^[ ]{0,3}(-[ ]*-[ ]*-[- ]*)[ \t]*$/gm, '---');
  content = content.replace(/^[ ]{0,3}(_[ ]*_[ ]*_[_ ]*)[ \t]*$/gm, '___');

  // 修复飞书等复制时的加粗格式断裂问题
  content = content.replace(/\*\*\s+\*\*/g, ' ');
  content = content.replace(/\*{4,}/g, '');
  // 中文右标点前的 ** 后添加零宽空格
  content = content.replace(/\*\*([）」』》〉】〕〗］｝"'。，、；：？！])/g, '**\u200B$1');
  // 中文左标点后的 ** 前添加零宽空格
  content = content.replace(/([（「『《〈【〔〖［｛"'])\*\*/g, '$1\u200B**');
  // 下划线格式
  content = content.replace(/__\s+__/g, ' ');
  content = content.replace(/_{4,}/g, '');

  // 规范化列表项格式
  content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+[^:\n]+)\n\s*:\s*(.+?)$/gm, '$1: $2');
  content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+.+?:)\s*\n\s+(.+?)$/gm, '$1 $2');
  content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+[^:\n]+)\n:\s*(.+?)$/gm, '$1: $2');
  content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+.+?)\n\n\s+(.+?)$/gm, '$1 $2');

  return content;
}
