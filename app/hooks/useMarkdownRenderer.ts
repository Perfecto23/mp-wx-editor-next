'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
      let hljs: typeof import('highlight.js/lib/core').default | null = null;
      try {
        const [{ default: core }, ...langs] = await Promise.all([
          import('highlight.js/lib/core'),
          import('highlight.js/lib/languages/javascript'),
          import('highlight.js/lib/languages/typescript'),
          import('highlight.js/lib/languages/python'),
          import('highlight.js/lib/languages/java'),
          import('highlight.js/lib/languages/go'),
          import('highlight.js/lib/languages/rust'),
          import('highlight.js/lib/languages/cpp'),
          import('highlight.js/lib/languages/c'),
          import('highlight.js/lib/languages/bash'),
          import('highlight.js/lib/languages/shell'),
          import('highlight.js/lib/languages/json'),
          import('highlight.js/lib/languages/xml'),
          import('highlight.js/lib/languages/css'),
          import('highlight.js/lib/languages/sql'),
          import('highlight.js/lib/languages/yaml'),
          import('highlight.js/lib/languages/markdown'),
          import('highlight.js/lib/languages/diff'),
          import('highlight.js/lib/languages/plaintext'),
        ]);
        const langNames = [
          'javascript', 'typescript', 'python', 'java', 'go', 'rust',
          'cpp', 'c', 'bash', 'shell', 'json', 'xml', 'css', 'sql',
          'yaml', 'markdown', 'diff', 'plaintext',
        ];
        langs.forEach((lang, i) => core.registerLanguage(langNames[i], lang.default));
        // Register common aliases
        core.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
        core.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
        core.registerAliases(['py'], { languageName: 'python' });
        core.registerAliases(['sh', 'zsh'], { languageName: 'bash' });
        core.registerAliases(['html'], { languageName: 'xml' });
        core.registerAliases(['yml'], { languageName: 'yaml' });
        core.registerAliases(['rs'], { languageName: 'rust' });
        hljs = core;
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

  // 渲染函数（可被防抖调用）
  const renderMarkdown = useCallback(async (input: string, style: string) => {
    if (!mdRef.current || !mdReady) return;

    if (!input.trim()) {
      setRenderedContent('');
      return;
    }

    const currentRender = ++renderCountRef.current;

    try {
      const preprocessed = preprocessMarkdown(input);
      let html = mdRef.current!.render(preprocessed);
      html = await processImageProtocol(html, imageStore, imageUrlCacheRef.current);

      const styleConfig = STYLES[style];
      if (styleConfig) {
        html = applyInlineStyles(html, styleConfig.styles);
      }

      if (currentRender === renderCountRef.current) {
        setRenderedContent(html);
      }
    } catch (error) {
      console.error('Markdown 渲染失败:', error);
    }
  }, [imageStore, mdReady]);

  // 防抖渲染（markdownInput 变化时延迟 150ms，currentStyle 变化时立即渲染）
  const prevStyleRef = useRef(currentStyle);
  useEffect(() => {
    const isStyleChange = prevStyleRef.current !== currentStyle;
    prevStyleRef.current = currentStyle;

    // 样式切换立即渲染，内容输入防抖 150ms
    const delay = isStyleChange ? 0 : 150;
    const timer = setTimeout(() => {
      renderMarkdown(markdownInput, currentStyle);
    }, delay);

    return () => clearTimeout(timer);
  }, [markdownInput, currentStyle, renderMarkdown]);

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
