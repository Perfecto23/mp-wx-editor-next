import { StyleElements } from '../types';
import { groupConsecutiveImages } from './image-grouping';

/**
 * 标题内行内元素的覆盖样式
 * 确保标题内的 strong/em/a/code 等继承标题颜色
 */
const HEADING_INLINE_OVERRIDES: Record<string, string> = {
  strong: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
  em: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
  a: 'color: inherit !important; text-decoration: none !important; border-bottom: 1px solid currentColor !important; background-color: transparent !important;',
  code: 'color: inherit !important; background-color: transparent !important; border: none !important; padding: 0 !important;',
  span: 'color: inherit !important; background-color: transparent !important;',
  b: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
  i: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
  del: 'color: inherit !important; background-color: transparent !important;',
  mark: 'color: inherit !important; background-color: transparent !important;',
  s: 'color: inherit !important; background-color: transparent !important;',
  u: 'color: inherit !important; text-decoration: underline !important; background-color: transparent !important;',
  ins: 'color: inherit !important; text-decoration: underline !important; background-color: transparent !important;',
  kbd: 'color: inherit !important; background-color: transparent !important; border: none !important; padding: 0 !important;',
  sub: 'color: inherit !important; background-color: transparent !important;',
  sup: 'color: inherit !important; background-color: transparent !important;'
};

const HEADING_INLINE_SELECTORS = Object.keys(HEADING_INLINE_OVERRIDES).join(', ');

/**
 * 应用内联样式到 HTML
 * 迁移自 app.js:1030-1104
 */
export function applyInlineStyles(html: string, style: StyleElements): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 先处理图片网格布局
  groupConsecutiveImages(doc);

  // 应用每个选择器的样式
  (Object.keys(style) as (keyof StyleElements)[]).forEach(selector => {
    // 跳过 pre/code 相关（代码块由 highlight.js 处理）
    if (selector === 'pre' || selector === 'code') {
      return;
    }

    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => {
      // 跳过网格容器中的图片
      if (el.tagName === 'IMG' && el.closest('.image-grid')) {
        return;
      }

      const currentStyle = el.getAttribute('style') || '';
      el.setAttribute('style', currentStyle + '; ' + style[selector]);
    });
  });

  // 标题内行内元素继承处理
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    const inlineNodes = heading.querySelectorAll(HEADING_INLINE_SELECTORS);
    inlineNodes.forEach(node => {
      const tag = node.tagName.toLowerCase();
      const override = HEADING_INLINE_OVERRIDES[tag];
      if (!override) return;

      const currentStyle = node.getAttribute('style') || '';
      const sanitizedStyle = currentStyle
        .replace(/color:\s*[^;]+;?/gi, '')
        .replace(/background(?:-color)?:\s*[^;]+;?/gi, '')
        .replace(/border(?:-bottom)?:\s*[^;]+;?/gi, '')
        .replace(/text-decoration:\s*[^;]+;?/gi, '')
        .replace(/box-shadow:\s*[^;]+;?/gi, '')
        .replace(/padding:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .trim();
      node.setAttribute('style', sanitizedStyle + '; ' + override);
    });
  });

  // 包裹容器
  const container = doc.createElement('div');
  container.setAttribute('style', style.container);
  container.innerHTML = doc.body.innerHTML;

  return container.outerHTML;
}
