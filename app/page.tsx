'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ToastState } from './types';
import { STYLES } from './config/styles';
import { useDraft } from './hooks/useDraft';
import BackupControls from './components/BackupControls';

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
  const { content: markdownInput, setContent: setMarkdownInput, ready, status, flush } = useDraft();
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
  const { renderedContent, renderNow } = useMarkdownRenderer(markdownInput, currentStyle, imageStore);
  const { copyToClipboard } = useClipboard(imageStore);
  const { articles, save, remove, refresh, error: historyError } = useArticleHistory();
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
  }, [setMarkdownInput]);

  const { handleSmartPaste, handleDrop } = useSmartPaste({
    imageStore,
    compressor,
    turndown,
    showToast,
    onContentInsert: handleContentInsert,
  });

  // === 复制到公众号 ===
  const handleCopy = useCallback(async (downloadOnly = false) => {
    try {
      // 按点击时的正文即时渲染，避免复制到防抖之前的旧内容。
      const html = await renderNow(markdownInput, currentStyle);
      const result = await copyToClipboard(html, currentStyle, undefined, downloadOnly);
      if (result.success) {
        setCopySuccess(!result.downloaded);
        showToast(result.message, 'success');
        if (!save(markdownInput, currentStyle)) showToast('内容已导出，但历史保存失败，请保留备份', 'error');
        setTimeout(() => setCopySuccess(false), 2000);
      } else showToast(result.message, 'error');
    } catch (error) { showToast((error as Error).message, 'error'); }
  }, [renderNow, markdownInput, currentStyle, copyToClipboard, save, showToast]);

  // === 文件上传 ===
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!flush() || !save(markdownInput, currentStyle)) { showToast('当前内容尚未安全保存，请先备份', 'error'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setMarkdownInput(e.target?.result as string);
    };
    reader.onerror = () => {
      showToast('文件读取失败', 'error');
    };
    reader.readAsText(file);

    event.target.value = '';
  }, [showToast, flush, save, markdownInput, currentStyle, setMarkdownInput]);

  // === 从历史加载 ===
  const handleLoadHistory = useCallback((id: string) => {
    if (!flush() || !save(markdownInput, currentStyle)) { showToast('当前草稿保存失败，请先备份再切换', 'error'); return; }
    const article = articles.find(a => a.id === id);
    if (article) {
      setMarkdownInput(article.content);
      if (article.style && STYLES[article.style]) {
        setCurrentStyle(article.style);
      }
      setShowHistoryPanel(false);
      showToast('已加载文章', 'success');
    }
  }, [articles, flush, save, markdownInput, currentStyle, setCurrentStyle, showToast, setMarkdownInput]);

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

  if (!ready) return <div role="status" className="p-8">{status}</div>;

  return (
    <div className="flex flex-col h-screen bg-bg-main">
      {/* 顶栏 */}
      <Header />
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border-light text-xs">
        <span role="status" className="truncate">{historyError || status}</span>
        <BackupControls content={markdownInput} style={currentStyle} imageStore={imageStore}
          onImported={refresh} notify={showToast} />
      </div>

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
            onCopy={() => void handleCopy()}
            onDownload={() => void handleCopy(true)}
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
        onDelete={(id) => { if (remove(id)) showToast('已删除', 'success'); }}
      />

      <Toast toast={toast} />
    </div>
  );
}
