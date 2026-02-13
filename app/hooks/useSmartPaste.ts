'use client';

import { useCallback } from 'react';
import TurndownService from 'turndown';
import { ImageStore } from '../lib/image-store';
import { ImageCompressor } from '../lib/image-compressor';
import { formatSize } from '../lib/utils';

/**
 * 智能粘贴 Hook
 * 迁移自 app.js:1881-2227
 *
 * 处理：
 * - 图片粘贴（截图、文件）
 * - HTML → Markdown 转换（飞书/Notion/Word）
 * - IDE 代码识别
 * - 图片拖拽
 */

/**
 * 检测文本是否为 Markdown 格式
 */
function isMarkdown(text: string): boolean {
  if (!text) return false;

  const patterns = [
    /^#{1,6}\s+/m,
    /\*\*[^*]+\*\*/,
    /\*[^*\n]+\*/,
    /\[[^\]]+\]\([^)]+\)/,
    /!\[[^\]]*\]\([^)]+\)/,
    /^[\*\-\+]\s+/m,
    /^\d+\.\s+/m,
    /^>\s+/m,
    /`[^`]+`/,
    /```[\s\S]*?```/,
    /^\|.*\|$/m,
    /<!--.*?-->/,
    /^---+$/m,
  ];

  const matchCount = patterns.filter(pattern => pattern.test(text)).length;
  return matchCount >= 2 || text.includes('<!-- img:');
}

/**
 * 检测 HTML 是否来自 IDE
 */
function isIDEFormattedHTML(htmlData: string, textData: string): boolean {
  if (!htmlData || !textData) return false;

  let matchCount = 0;

  // VS Code 特征
  if (/<meta\s+charset=['"]utf-8['"]/i.test(htmlData)) matchCount++;
  if (/<div\s+class=["']ace_line["']/.test(htmlData)) matchCount++;
  if (/style=["'][^"']*font-family:\s*['"]?(?:Consolas|Monaco|Menlo|Courier)/i.test(htmlData)) matchCount++;

  // 简单 div/span 结构（无富文本语义标签）
  const hasDivSpan = /<(?:div|span)[\s>]/.test(htmlData);
  const hasSemanticTags = /<(?:p|h[1-6]|strong|em|ul|ol|li|blockquote)[\s>]/i.test(htmlData);
  if (hasDivSpan && !hasSemanticTags) matchCount++;

  // HTML 只是简单包裹纯文本
  const strippedHtml = htmlData.replace(/<[^>]+>/g, '').trim();
  if (strippedHtml === textData.trim()) matchCount++;

  return matchCount >= 2;
}

interface UseSmartPasteOptions {
  imageStore: ImageStore | null;
  compressor: ImageCompressor | null;
  turndown: TurndownService | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onContentInsert: (text: string, cursorPos?: number) => void;
}

export function useSmartPaste({
  imageStore,
  compressor,
  turndown,
  showToast,
  onContentInsert,
}: UseSmartPasteOptions) {

  /**
   * 处理图片上传（压缩 + 存储 + 插入）
   */
  const handleImageUpload = useCallback(async (
    file: File,
    textarea: HTMLTextAreaElement | null
  ) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('图片大小不能超过 10MB', 'error');
      return;
    }

    if (!imageStore || !compressor) {
      showToast('图片系统未就绪', 'error');
      return;
    }

    const imageName = file.name.replace(/\.[^/.]+$/, '') || '图片';
    const originalSize = file.size;

    try {
      showToast('正在压缩图片...', 'success');

      const compressedBlob = await compressor.compress(file);
      const compressedSize = compressedBlob.size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(0);

      const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await imageStore.saveImage(imageId, compressedBlob, {
        name: imageName,
        originalName: file.name,
        originalSize,
        compressedSize,
        compressionRatio,
        mimeType: compressedBlob.type || file.type,
      });

      const markdownImage = `![${imageName}](img://${imageId})`;

      if (textarea) {
        const currentPos = textarea.selectionStart;
        onContentInsert(markdownImage, currentPos);
      } else {
        onContentInsert('\n' + markdownImage);
      }

      if (Number(compressionRatio) > 10) {
        showToast(`已保存 (${formatSize(originalSize)} → ${formatSize(compressedSize)})`, 'success');
      } else {
        showToast(`已保存 (${formatSize(compressedSize)})`, 'success');
      }
    } catch (error) {
      console.error('图片处理失败:', error);
      showToast('图片处理失败: ' + (error as Error).message, 'error');
    }
  }, [imageStore, compressor, showToast, onContentInsert]);

  /**
   * 智能粘贴处理
   */
  const handleSmartPaste = useCallback(async (
    event: React.ClipboardEvent<HTMLTextAreaElement>
  ): Promise<boolean> => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;

    // 检查文件（图片）
    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      if (file && file.type && file.type.startsWith('image/')) {
        event.preventDefault();
        await handleImageUpload(file, event.currentTarget);
        return true;
      }
    }

    // 检查 items
    const items = clipboardData.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type && item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleImageUpload(file, event.currentTarget);
            return true;
          }
        }
      }
    }

    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    // 图片占位符文本检测
    if (textData && /^\[Image\s*#?\d*\]$/i.test(textData.trim())) {
      showToast('请尝试：截图工具 / 浏览器复制 / 拖拽文件', 'error');
      event.preventDefault();
      return true;
    }

    // IDE 代码检测
    const isFromIDE = isIDEFormattedHTML(htmlData, textData);

    if (isFromIDE && textData && isMarkdown(textData)) {
      return false; // 使用默认粘贴行为
    }

    // HTML 富文本处理
    if (htmlData && htmlData.trim() !== '' && turndown) {
      const hasPreTag = /<pre[\s>]/.test(htmlData);
      const hasCodeTag = /<code[\s>]/.test(htmlData);
      const isMainlyCode = (hasPreTag || hasCodeTag) && !htmlData.includes('<p') && !htmlData.includes('<div');

      if (isMainlyCode) {
        return false; // 代码内容，使用默认粘贴
      }

      // 本地文件路径的图片
      if (htmlData.includes('file:///') || htmlData.includes('src="file:')) {
        showToast('本地图片请直接拖拽文件到编辑器', 'error');
        event.preventDefault();
        return true;
      }

      event.preventDefault();

      try {
        let markdown = turndown.turndown(htmlData);
        markdown = markdown.replace(/\n{3,}/g, '\n\n');

        const textarea = event.currentTarget;
        const start = textarea.selectionStart;
        onContentInsert(markdown, start);
        showToast('已智能转换为 Markdown 格式', 'success');
        return true;
      } catch (error) {
        console.error('HTML 转 Markdown 失败:', error);
        // 转换失败使用纯文本
        if (textData) {
          const textarea = event.currentTarget;
          const start = textarea.selectionStart;
          onContentInsert(textData, start);
        }
        return true;
      }
    }

    // Markdown 文本直接粘贴
    if (textData && isMarkdown(textData)) {
      return false;
    }

    return false; // 普通文本使用默认行为
  }, [handleImageUpload, turndown, showToast, onContentInsert]);

  /**
   * 拖拽处理
   */
  const handleDrop = useCallback(async (
    event: React.DragEvent<HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await handleImageUpload(file, event.currentTarget);
      } else {
        showToast('只支持拖拽图片文件', 'error');
      }
    }
  }, [handleImageUpload, showToast]);

  return {
    handleSmartPaste,
    handleImageUpload,
    handleDrop,
  };
}
