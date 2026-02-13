'use client';

import React from 'react';
import { ArticleHistory } from '../types';
import { formatHistoryDate } from '../lib/utils';

interface HistorySidebarProps {
  open: boolean;
  articles: ArticleHistory[];
  styleName: (key: string) => string;
  onClose: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HistorySidebar({
  open,
  articles,
  styleName,
  onClose,
  onLoad,
  onDelete,
}: HistorySidebarProps) {
  if (!open) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 z-[950] animate-fade-in cursor-pointer"
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <div className="fixed top-0 right-0 w-[400px] max-w-[90vw] h-full bg-white z-[950] flex flex-col shadow-sidebar animate-slide-in-right">
        {/* 标题栏 */}
        <div className="flex items-center justify-between h-12 px-5 border-b border-border-light shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-primary">历史记录</h3>
            <span className="text-[11px] text-tertiary bg-bg-secondary rounded-full px-2 py-0.5 tabular-nums">
              {articles.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-tertiary hover:text-primary hover:bg-bg-secondary transition-colors duration-150 cursor-pointer"
            aria-label="关闭"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto">
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm text-secondary font-medium">暂无历史记录</p>
              <p className="text-xs text-tertiary mt-1">复制文章时会自动保存</p>
            </div>
          ) : (
            <div className="p-2">
              {articles.map(article => (
                <div
                  key={article.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-secondary/60 transition-colors duration-150 cursor-pointer group"
                  onClick={() => onLoad(article.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-medium text-primary truncate">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-tertiary">
                        {styleName(article.style)}
                      </span>
                      <span className="text-[11px] text-tertiary/50">
                        {formatHistoryDate(article.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(article.id);
                    }}
                    className="flex items-center justify-center w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 text-tertiary hover:text-error hover:bg-error/5 transition-all duration-150 cursor-pointer shrink-0"
                    title="删除"
                    aria-label="删除此记录"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
