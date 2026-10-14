'use client';
import { useRef, useState } from 'react';
import type { ArticleHistory } from '../types';
import type { ImageStore } from '../lib/image-store';
import { BACKUP_LIMIT, checkBackup, exportBackup, importBackup, readHistory, type CheckedBackup } from '../lib/backup';
import { downloadFile } from '../lib/download';

export default function BackupControls({ content, style, imageStore, onImported, notify }: {
  content: string; style: string; imageStore: ImageStore | null;
  onImported: () => void; notify: (text: string, type: 'success' | 'error') => void;
}) {
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<CheckedBackup | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (error) { notify((error as Error).message, 'error'); }
    finally { setBusy(false); }
  };
  return <div className="flex gap-2 text-xs shrink-0">
    <button disabled={busy || !imageStore} className="cursor-pointer disabled:opacity-40" onClick={() => void run(async () => {
      const articles = readHistory(localStorage);
      if (content.trim() && !articles.some(a => a.content === content && a.style === style)) {
        const now = Date.now();
        articles.unshift({ id: `draft-${crypto.randomUUID()}`, title: '当前草稿', content, style, createdAt: now, updatedAt: now } satisfies ArticleHistory);
      }
      const text = await exportBackup(articles, imageStore!);
      downloadFile(text, `公众号备份-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      notify('备份已下载，包含当前草稿、历史和本地图片', 'success');
    })}>备份</button>
    <button disabled={busy || !imageStore} className="cursor-pointer disabled:opacity-40" onClick={() => fileInput.current?.click()}>导入备份</button>
    <input ref={fileInput} className="hidden" type="file" accept=".json,application/json" aria-label="选择备份文件" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      void run(async () => {
        if (file.size > BACKUP_LIMIT) throw new Error('备份超过 32 MB');
        const checked = await checkBackup(await file.text());
        setBackup(checked); dialog.current?.showModal();
      });
    }} />
    <dialog ref={dialog} className="m-auto rounded-xl p-6 max-w-[90vw] w-96 backdrop:bg-black/40" aria-labelledby="backup-heading" onClose={() => setBackup(null)} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 id="backup-heading" className="font-semibold text-base mb-3">导入备份</h2>
      <p className="text-sm leading-6">已校验 {backup?.articles.length ?? 0} 篇记录、{backup?.images.length ?? 0} 张图片。导入后作为新记录加入历史，现有文章与当前草稿保持原样。</p>
      <p className="text-xs text-tertiary my-3">重复导入会新增副本。本地图片会分配新 ID，避免覆盖已有图片。</p>
      <div className="flex justify-end gap-4 mt-5">
        <button disabled={busy} onClick={() => dialog.current?.close()}>取消</button>
        <button disabled={busy || !backup} className="text-accent" onClick={() => void run(async () => {
          const count = await importBackup(backup!, imageStore!, localStorage);
          onImported(); dialog.current?.close(); notify(`已导入 ${count} 篇历史记录`, 'success');
        })}>{busy ? '正在导入…' : '作为副本导入'}</button>
      </div>
    </dialog>
  </div>;
}
