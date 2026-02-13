'use client';

import React, { useRef, useState, useCallback } from 'react';

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => Promise<boolean>;
  onDrop: (event: React.DragEvent<HTMLTextAreaElement>) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function EditorPane({
  value,
  onChange,
  onPaste,
  onDrop,
  onFileUpload,
  textareaRef,
}: EditorPaneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const actualTextareaRef = textareaRef || internalTextareaRef;

  const charCount = value.length;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if ((e.target as HTMLElement).classList?.contains('markdown-input')) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDropWrapper = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    setIsDraggingOver(false);
    onDrop(e);
  }, [onDrop]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-border-light shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-secondary cursor-pointer transition-colors duration-150 hover:text-primary hover:bg-bg-secondary"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            上传
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.mdown,.mkd,.mkdn,.mdwn,.mdtxt,.mdtext,.text,.txt"
            onChange={onFileUpload}
            className="hidden"
          />
          <span className="text-[11px] text-tertiary max-md:hidden">
            .md / .txt / 飞书 / Notion
          </span>
        </div>
        <span className="text-[11px] text-tertiary tabular-nums">{charCount.toLocaleString()} 字</span>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={actualTextareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={async (e) => { await onPaste(e); }}
          onDrop={handleDropWrapper}
          onDragOver={handleDragOver}
          onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={handleDragLeave}
          placeholder={"在此输入 Markdown 内容...\n\n支持：\n• 直接粘贴图片（截图 / Ctrl+V）\n• 拖拽图片文件到编辑器\n• 从飞书 / Notion 复制富文本自动转 Markdown"}
          className={`
            markdown-input
            w-full h-full resize-none
            px-5 py-4 text-[13px] leading-[1.75] font-mono
            text-primary bg-white
            focus:outline-none
            placeholder:text-tertiary/30 placeholder:text-[12px]
            ${isDraggingOver ? 'bg-accent/[0.02]' : ''}
          `}
          spellCheck={false}
        />
        {isDraggingOver && (
          <div className="absolute inset-4 flex items-center justify-center bg-accent/5 border-2 border-dashed border-accent/20 rounded-lg pointer-events-none z-10">
            <div className="flex items-center gap-2 text-accent text-sm font-medium">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              释放以上传图片
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
