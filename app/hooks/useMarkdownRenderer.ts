'use client';

import { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import { patchMarkdownScanner } from '../lib/markdown-patches';
import { preprocessMarkdown } from '../lib/preprocess';
import { processImageProtocol } from '../lib/image-protocol';
import { applyInlineStyles } from '../lib/inline-styles';
import { STYLES } from '../config/styles';
import { ImageStore } from '../lib/image-store';

/**
 * Markdown 渲染管线 Hook
 *
 * 完整渲染流程：
 * markdownInput → preprocess → md.render() → processImageProtocol → applyInlineStyles → renderedContent
 *
 * 迁移自 app.js:914-1104
 */
export function useMarkdownRenderer(
  markdownInput: string,
  currentStyle: string,
  imageStore: ImageStore | null
) {
  const [renderedContent, setRenderedContent] = useState('');
  const [mdReady, setMdReady] = useState(false);
  const mdRef = useRef<MarkdownIt | null>(null);
  const imageUrlCacheRef = useRef<Record<string, string>>({});
  const renderCountRef = useRef(0);

  // 初始化 markdown-it（仅一次）
  useEffect(() => {
    const initMarkdown = async () => {
      let hljs: typeof import('highlight.js').default | null = null;
      try {
        const mod = await import('highlight.js');
        hljs = mod.default;
      } catch {
        console.warn('highlight.js 加载失败，代码块将不高亮');
      }

      const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: false,
        highlight: function (str: string, lang: string) {
          const dots = '<div style="display: flex; align-items: center; gap: 6px; padding: 10px 12px; background: #2a2c33; border-bottom: 1px solid #1e1f24;"><span style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56;"></span><span style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></span><span style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></span></div>';

          let codeContent = '';
          if (lang && hljs) {
            try {
              if (hljs.getLanguage(lang)) {
                codeContent = hljs.highlight(str, { language: lang }).value;
              } else {
                codeContent = md.utils.escapeHtml(str);
              }
            } catch {
              codeContent = md.utils.escapeHtml(str);
            }
          } else {
            codeContent = md.utils.escapeHtml(str);
          }

          return `<div style="margin: 20px 0; border-radius: 8px; overflow: hidden; background: #383a42; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">${dots}<div style="padding: 16px; overflow-x: auto; background: #383a42;"><code style="display: block; color: #abb2bf; font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace; font-size: 14px; line-height: 1.6; white-space: pre;">${codeContent}</code></div></div>`;
        },
      });

      patchMarkdownScanner(md);
      mdRef.current = md;
      setMdReady(true);
    };

    initMarkdown();
  }, []);

  // 渲染（markdownInput、currentStyle 变化时触发）
  useEffect(() => {
    if (!mdRef.current || !mdReady) return;

    if (!markdownInput.trim()) {
      setRenderedContent('');
      return;
    }

    const currentRender = ++renderCountRef.current;

    const render = async () => {
      try {
        const preprocessed = preprocessMarkdown(markdownInput);
        let html = mdRef.current!.render(preprocessed);
        html = await processImageProtocol(html, imageStore, imageUrlCacheRef.current);

        const styleConfig = STYLES[currentStyle];
        if (styleConfig) {
          html = applyInlineStyles(html, styleConfig.styles);
        }

        if (currentRender === renderCountRef.current) {
          setRenderedContent(html);
        }
      } catch (error) {
        console.error('Markdown 渲染失败:', error);
      }
    };

    render();
  }, [markdownInput, currentStyle, imageStore, mdReady]);

  // 清理 Object URLs
  useEffect(() => {
    const cache = imageUrlCacheRef.current;
    return () => {
      Object.values(cache).forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
    };
  }, []);

  return renderedContent;
}
