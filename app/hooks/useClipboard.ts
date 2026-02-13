'use client';

import { useCallback } from 'react';
import { ImageStore } from '../lib/image-store';
import { convertGridToTable } from '../lib/grid-to-table';
import { extractBackgroundColor } from '../lib/utils';
import { STYLES } from '../config/styles';

/**
 * 复制到公众号 Hook
 * 迁移自 app.js:1411-1589
 *
 * 9 步转换管线：
 * 1. DOMParser 解析
 * 2. Grid → Table
 * 3. 图片 → Base64
 * 4. Section 背景色包裹
 * 5. 代码块简化
 * 6. 列表项扁平化
 * 7. 引用块深色模式适配
 * 8. 生成 ClipboardItem
 * 9. clipboard.write
 */
export function useClipboard(imageStore: ImageStore | null) {

  /**
   * 将单个 img 元素转为 Base64
   */
  const convertImageToBase64 = useCallback(async (imgElement: HTMLImageElement): Promise<string> => {
    const src = imgElement.getAttribute('src') || '';

    // 已经是 Base64
    if (src.startsWith('data:')) return src;

    // 优先从 IndexedDB 获取
    const imageId = imgElement.getAttribute('data-image-id');
    if (imageId && imageStore) {
      try {
        const blob = await imageStore.getImageBlob(imageId);
        if (blob) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(new Error('FileReader failed: ' + error));
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.error(`从 IndexedDB 读取图片失败 (${imageId}):`, error);
      }
    }

    // 后备方案：fetch URL
    try {
      const response = await fetch(src, { mode: 'cors', cache: 'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(new Error('FileReader failed: ' + error));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`图片加载失败 (${src}): ${(error as Error).message}`);
    }
  }, [imageStore]);

  /**
   * 主复制方法
   */
  const copyToClipboard = useCallback(async (
    renderedContent: string,
    currentStyle: string,
    onProgress?: (msg: string) => void,
  ): Promise<{ success: boolean; message: string }> => {
    if (!renderedContent) {
      return { success: false, message: '没有内容可复制' };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(renderedContent, 'text/html');

      // Step 1: Grid → Table
      convertGridToTable(doc);

      // Step 2: 图片 → Base64
      const images = doc.querySelectorAll('img');
      if (images.length > 0) {
        onProgress?.(`正在处理 ${images.length} 张图片...`);

        let successCount = 0;
        let failCount = 0;

        const imagePromises = Array.from(images).map(async (img) => {
          try {
            const base64 = await convertImageToBase64(img as HTMLImageElement);
            img.setAttribute('src', base64);
            successCount++;
          } catch (error) {
            console.error('图片转换失败:', img.getAttribute('src'), error);
            failCount++;
          }
        });

        await Promise.all(imagePromises);

        if (failCount > 0) {
          onProgress?.(`图片处理完成：${successCount} 成功，${failCount} 失败（保留原链接）`);
        }
      }

      // Step 3: Section 容器包裹（有背景色时）
      const styleConfig = STYLES[currentStyle];
      if (styleConfig) {
        const containerBg = extractBackgroundColor(styleConfig.styles.container);

        if (containerBg && containerBg !== '#fff' && containerBg !== '#ffffff') {
          const section = doc.createElement('section');
          const containerStyle = styleConfig.styles.container;
          const paddingMatch = containerStyle.match(/padding:\s*([^;]+)/);
          const maxWidthMatch = containerStyle.match(/max-width:\s*([^;]+)/);
          const padding = paddingMatch ? paddingMatch[1].trim() : '40px 20px';
          const maxWidth = maxWidthMatch ? maxWidthMatch[1].trim() : '100%';

          section.setAttribute('style',
            `background-color: ${containerBg}; ` +
            `padding: ${padding}; ` +
            `max-width: ${maxWidth}; ` +
            `margin: 0 auto; ` +
            `box-sizing: border-box; ` +
            `word-wrap: break-word;`
          );

          while (doc.body.firstChild) {
            section.appendChild(doc.body.firstChild);
          }

          // 清理子元素中重复的容器样式
          const allElements = section.querySelectorAll('*');
          allElements.forEach(el => {
            const elStyle = el.getAttribute('style') || '';
            let newStyle = elStyle;
            newStyle = newStyle.replace(/max-width:\s*[^;]+;?/g, '');
            newStyle = newStyle.replace(/margin:\s*0\s+auto;?/g, '');
            if (newStyle.includes(`background-color: ${containerBg}`)) {
              newStyle = newStyle.replace(
                new RegExp(`background-color:\\s*${containerBg.replace(/[()]/g, '\\$&')};?`, 'g'),
                ''
              );
            }
            newStyle = newStyle.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '').trim();
            if (newStyle) {
              el.setAttribute('style', newStyle);
            } else {
              el.removeAttribute('style');
            }
          });

          doc.body.appendChild(section);
        }
      }

      // Step 4: 代码块简化
      const codeBlocks = doc.querySelectorAll('div[style*="border-radius: 8px"]');
      codeBlocks.forEach(block => {
        const codeElement = block.querySelector('code');
        if (codeElement) {
          const codeText = codeElement.textContent || '';
          const pre = doc.createElement('pre');
          const code = doc.createElement('code');

          pre.setAttribute('style',
            'background: linear-gradient(to bottom, #2a2c33 0%, #383a42 8px, #383a42 100%);' +
            'padding: 0;' +
            'border-radius: 6px;' +
            'overflow: hidden;' +
            'margin: 24px 0;' +
            'box-shadow: 0 2px 8px rgba(0,0,0,0.15);'
          );

          code.setAttribute('style',
            'color: #abb2bf;' +
            'font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace;' +
            'font-size: 14px;' +
            'line-height: 1.7;' +
            'display: block;' +
            'white-space: pre;' +
            'padding: 16px 20px;' +
            '-webkit-font-smoothing: antialiased;' +
            '-moz-osx-font-smoothing: grayscale;'
          );

          code.textContent = codeText;
          pre.appendChild(code);
          block.parentNode!.replaceChild(pre, block);
        }
      });

      // Step 5: 列表项扁平化
      const listItems = doc.querySelectorAll('li');
      listItems.forEach(li => {
        let text = li.textContent || '';
        text = text.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
        li.innerHTML = '';
        li.textContent = text;
      });

      // Step 6: 引用块深色模式适配
      const blockquotes = doc.querySelectorAll('blockquote');
      blockquotes.forEach(blockquote => {
        const bqStyle = blockquote.getAttribute('style') || '';
        let newStyle = bqStyle
          .replace(/background(?:-color)?:\s*[^;]+;?/gi, '')
          .replace(/color:\s*[^;]+;?/gi, '');

        newStyle += '; background: rgba(0, 0, 0, 0.05) !important';
        newStyle += '; color: rgba(0, 0, 0, 0.8) !important';
        newStyle = newStyle.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '').trim();
        blockquote.setAttribute('style', newStyle);
      });

      // Step 7: 写入剪贴板
      const simplifiedHTML = doc.body.innerHTML;
      const plainText = doc.body.textContent || '';

      const htmlBlob = new Blob([simplifiedHTML], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });

      await navigator.clipboard.write([clipboardItem]);

      return { success: true, message: '复制成功' };
    } catch (error) {
      console.error('复制失败:', error);
      return { success: false, message: '复制失败' };
    }
  }, [convertImageToBase64]);

  return { copyToClipboard };
}
