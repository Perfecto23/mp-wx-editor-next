'use client';

import React from 'react';

interface PreviewPaneProps {
  content: string;
  currentStyle: string;
  copySuccess: boolean;
  isStarred: boolean;
  onCopy: () => void;
  onToggleStar: () => void;
  onOpenHistory: () => void;
  onSaveHistory: () => void;
}

export default function PreviewPane({
  content,
  copySuccess,
  isStarred,
  onCopy,
  onToggleStar,
  onOpenHistory,
  onSaveHistory,
}: PreviewPaneProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-border-light shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStar}
            className={`
              flex items-center justify-center w-8 h-7 rounded-md
              transition-colors duration-150 cursor-pointer
              ${isStarred
                ? 'text-accent bg-accent/10'
                : 'text-tertiary hover:text-accent hover:bg-bg-secondary'
              }
            `}
            title="收藏此样式"
            aria-label={isStarred ? '取消收藏' : '收藏此样式'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>

          <button
            onClick={onSaveHistory}
            className="flex items-center justify-center w-8 h-7 rounded-md text-tertiary hover:text-primary hover:bg-bg-secondary transition-colors duration-150 cursor-pointer"
            title="保存到历史记录"
            aria-label="保存到历史记录"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center justify-center w-8 h-7 rounded-md text-tertiary hover:text-primary hover:bg-bg-secondary transition-colors duration-150 cursor-pointer"
            title="历史记录"
            aria-label="打开历史记录"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <button
          onClick={onCopy}
          disabled={!content}
          className={`
            flex items-center gap-1.5 h-7 px-3.5 rounded-md text-xs font-medium
            cursor-pointer transition-all duration-150
            ${copySuccess
              ? 'bg-success text-white'
              : content
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-bg-secondary text-ink-disabled cursor-not-allowed'
            }
          `}
        >
          {copySuccess ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              已复制
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              复制到公众号
            </>
          )}
        </button>
      </div>

      {/* 预览内容 */}
      <div className="flex-1 overflow-y-auto bg-bg-main">
        {content ? (
          <div className="max-w-[720px] mx-auto bg-white min-h-full">
            <div
              className="preview-container px-8 py-6"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-secondary mb-1">开始编辑</p>
            <p className="text-xs text-tertiary">左侧输入 Markdown，这里实时预览</p>
          </div>
        )}
      </div>
    </div>
  );
}
