'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ToastState } from './types';
import { STYLES } from './config/styles';
import { DEFAULT_EXAMPLE } from './config/default-example';

// Hooks
import { useImageStore } from './hooks/useImageStore';
import { useImageCompressor } from './hooks/useImageCompressor';
import { useMarkdownRenderer } from './hooks/useMarkdownRenderer';
import { useStyleManager } from './hooks/useStyleManager';
import { useArticleHistory } from './hooks/useArticleHistory';
import { useClipboard } from './hooks/useClipboard';
import { useTurndown } from './hooks/useTurndown';
import { useSmartPaste } from './hooks/useSmartPaste';

// Components
import Header from './components/Header';
import StyleSelector from './components/StyleSelector';
import EditorPane from './components/EditorPane';
import PreviewPane from './components/PreviewPane';
import HistorySidebar from './components/HistorySidebar';
import Toast from './components/Toast';

export default function EditorPage() {
  // === 基础状态 ===
  const [markdownInput, setMarkdownInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('markdownInput');
      return saved || DEFAULT_EXAMPLE;
    } catch {
      return DEFAULT_EXAMPLE;
    }
  });
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // === Hooks ===
  const {
    currentStyle, setCurrentStyle,
    starredStyles, toggleStar, isStarred, isRecommended,
  } = useStyleManager();

  const { imageStore } = useImageStore();
  const { compressor } = useImageCompressor();
  const renderedContent = useMarkdownRenderer(markdownInput, currentStyle, imageStore);
  const { copyToClipboard } = useClipboard(imageStore);
  const { articles, save, load, remove, resetCurrentArticle } = useArticleHistory();
  const { turndown } = useTurndown();

  // === Toast ===
  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  }, []);

  // === 智能粘贴（onContentInsert 回调） ===
  const handleContentInsert = useCallback((text: string, cursorPos?: number) => {
    setMarkdownInput(prev => {
      if (cursorPos !== undefined) {
        const before = prev.substring(0, cursorPos);
        const after = prev.substring(cursorPos);
        const newValue = before + text + after;

        // 设置光标位置
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = cursorPos + text.length;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);

        return newValue;
      }
      return prev + text;
    });
  }, []);

  const { handleSmartPaste, handleDrop } = useSmartPaste({
    imageStore,
    compressor,
    turndown,
    showToast,
    onContentInsert: handleContentInsert,
  });

  // === 自动保存（防抖 1 秒） ===
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('markdownInput', markdownInput);
      } catch (error) {
        console.error('保存内容失败:', error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [markdownInput]);

  // === 内容变化时重置文章 ID ===
  const prevMarkdownRef = useRef(markdownInput);
  useEffect(() => {
    const prev = prevMarkdownRef.current;
    prevMarkdownRef.current = markdownInput;

    // 内容被清空
    if (!markdownInput || !markdownInput.trim()) {
      resetCurrentArticle();
    }
    // 从空/少内容粘贴大量内容（新文章）
    else if ((!prev || prev.trim().length < 10) && markdownInput.trim().length > 100) {
      resetCurrentArticle();
    }
  }, [markdownInput, resetCurrentArticle]);

  // === 复制到公众号 ===
  const handleCopy = useCallback(async () => {
    const result = await copyToClipboard(
      renderedContent,
      currentStyle,
      (msg) => showToast(msg, 'success'),
    );

    if (result.success) {
      setCopySuccess(true);
      showToast('复制成功', 'success');

      // 自动保存到历史记录
      save(markdownInput, currentStyle);

      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      showToast(result.message, 'error');
    }
  }, [copyToClipboard, renderedContent, currentStyle, showToast, save, markdownInput]);

  // === 文件上传 ===
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setMarkdownInput(e.target?.result as string);
    };
    reader.onerror = () => {
      showToast('文件读取失败', 'error');
    };
    reader.readAsText(file);

    event.target.value = '';
  }, [showToast]);

  // === 从历史加载 ===
  const handleLoadHistory = useCallback((id: string) => {
    const article = load(id);
    if (article) {
      setMarkdownInput(article.content);
      if (article.style && STYLES[article.style]) {
        setCurrentStyle(article.style);
      }
      setShowHistoryPanel(false);
      showToast('已加载文章', 'success');
    }
  }, [load, setCurrentStyle, showToast]);

  // === 保存历史 ===
  const handleSaveHistory = useCallback(() => {
    if (!markdownInput.trim()) {
      showToast('内容为空，无法保存', 'error');
      return;
    }
    const success = save(markdownInput, currentStyle);
    if (success) {
      showToast('已保存到历史记录', 'success');
    }
  }, [save, markdownInput, currentStyle, showToast]);

  return (
    <div className="flex flex-col h-screen bg-bg-main">
      {/* 顶栏 */}
      <Header />

      {/* 样式选择器 */}
      <StyleSelector
        currentStyle={currentStyle}
        onStyleChange={setCurrentStyle}
        starredStyles={starredStyles}
        onToggleStar={toggleStar}
        isStarred={isStarred}
        isRecommended={isRecommended}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex min-h-0 overflow-hidden max-md:flex-col">
        <div className="w-1/2 max-md:w-full max-md:h-[45vh] flex flex-col min-h-0 border-r border-border-light max-md:border-r-0 max-md:border-b">
          <EditorPane
            value={markdownInput}
            onChange={setMarkdownInput}
            onPaste={handleSmartPaste}
            onDrop={handleDrop}
            onFileUpload={handleFileUpload}
            textareaRef={textareaRef}
          />
        </div>

        <div className="w-1/2 max-md:w-full max-md:flex-1 flex flex-col min-h-0">
          <PreviewPane
            content={renderedContent}
            currentStyle={currentStyle}
            copySuccess={copySuccess}
            isStarred={isStarred(currentStyle)}
            onCopy={handleCopy}
            onToggleStar={() => toggleStar(currentStyle)}
            onOpenHistory={() => setShowHistoryPanel(true)}
            onSaveHistory={handleSaveHistory}
          />
        </div>
      </div>

      <HistorySidebar
        open={showHistoryPanel}
        articles={articles}
        styleName={(key) => STYLES[key]?.name ?? key}
        onClose={() => setShowHistoryPanel(false)}
        onLoad={handleLoadHistory}
        onDelete={(id) => { remove(id); showToast('已删除', 'success'); }}
      />

      <Toast toast={toast} />
    </div>
  );
}
