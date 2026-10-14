'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArticleHistory } from '../types';
import { extractTitle } from '../lib/utils';
import { readHistory, HISTORY_KEY } from '../lib/backup';

/** 每次显式保存保留独立快照，恢复旧稿后再保存也不会覆盖原版本。 */
export function useArticleHistory() {
  const [articles, setArticles] = useState<ArticleHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    try { setArticles(readHistory(localStorage)); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => { if (event.key === HISTORY_KEY) refresh(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const save = useCallback((content: string, style: string): boolean => {
    if (!content.trim()) return true;
    try {
      const current = readHistory(localStorage);
      if (current.some(a => a.content === content && a.style === style)) { setArticles(current); return true; }
      if (current.length >= 1000) throw new Error('历史记录已达 1000 篇，请先备份并整理');
      const now = Date.now();
      const next = [{ id: `article-${crypto.randomUUID()}`, title: extractTitle(content), content,
        style, createdAt: now, updatedAt: now }, ...current];
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ articles: next }));
      setArticles(next); setError(null); return true;
    } catch (e) { setError(`保存历史失败：${(e as Error).message}`); return false; }
  }, []);

  const remove = useCallback((id: string): boolean => {
    try {
      const next = readHistory(localStorage).filter(a => a.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ articles: next }));
      setArticles(next); setError(null); return true;
    } catch (e) { setError(`删除失败：${(e as Error).message}`); return false; }
  }, []);
  return { articles, save, remove, refresh, error };
}
