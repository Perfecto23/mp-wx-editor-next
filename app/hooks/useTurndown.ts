'use client';

import { useMemo } from 'react';
import TurndownService from 'turndown';

/**
 * Turndown HTML→Markdown 转换服务 Hook
 * 迁移自 app.js:1808-1878
 */
export function useTurndown() {
  const turndown = useMemo(() => {
    const td = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
    });

    // 保留表格标签
    td.keep(['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']);

    // 自定义规则：表格转 Markdown
    td.addRule('table', {
      filter: 'table',
      replacement: (_content: string, node: TurndownService.Node) => {
        const el = node as HTMLTableElement;
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        let markdown = '\n\n';
        let headerProcessed = false;

        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          const cellContents = cells.map(cell => {
            const text = (cell.textContent || '').replace(/\n/g, ' ').trim();
            return text;
          });

          if (cellContents.length > 0) {
            markdown += '| ' + cellContents.join(' | ') + ' |\n';

            if (index === 0 || (!headerProcessed && row.querySelector('th'))) {
              markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
              headerProcessed = true;
            }
          }
        });

        return markdown + '\n';
      },
    });

    // 自定义规则：优化图片处理
    td.addRule('image', {
      filter: 'img',
      replacement: (_content: string, node: TurndownService.Node) => {
        const el = node as HTMLImageElement;
        const alt = el.alt || '图片';
        const src = el.src || '';
        const title = el.title || '';

        if (src.startsWith('data:image')) {
          const type = src.match(/data:image\/(\w+);/)?.[1] || 'image';
          return `![${alt}](data:image/${type};base64,...)${title ? ` "${title}"` : ''}\n`;
        }

        return `![${alt}](${src})${title ? ` "${title}"` : ''}\n`;
      },
    });

    return td;
  }, []);

  return { turndown };
}
