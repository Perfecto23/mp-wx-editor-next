'use client';

import { useState, useCallback, useRef } from 'react';
import { ArticleHistory } from '../types';
import { extractTitle } from '../lib/utils';

const MAX_HISTORY = 20;
const STORAGE_KEY = 'articleHistory';

/**
 * 文章历史记录 Hook
 * 迁移自 app.js:2653-2854 的历史记录相关方法
 */
export function useArticleHistory() {
  const [articles, setArticles] = useState<ArticleHistory[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data && Array.isArray(data.articles)) {
          return data.articles;
        }
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
    return [];
  });
  const currentArticleIdRef = useRef<string | null>(null);

  // 持久化到 localStorage
  const persist = useCallback((arts: ArticleHistory[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ articles: arts }));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }, []);

  /**
   * 保存文章到历史记录
   * 如果有当前文章 ID，更新已有记录；否则创建新记录
   */
  const save = useCallback((content: string, style: string): boolean => {
    if (!content || !content.trim()) {
      return false;
    }

    const title = extractTitle(content);
    const now = Date.now();
    const currentId = currentArticleIdRef.current;

    setArticles(prev => {
      let next: ArticleHistory[];

      // 如果有当前文章 ID，尝试更新
      if (currentId) {
        const existingIndex = prev.findIndex(a => a.id === currentId);
        if (existingIndex !== -1) {
          // 更新已有文章
          const updated = { ...prev[existingIndex], title, content, style, updatedAt: now };
          next = [updated, ...prev.filter((_, i) => i !== existingIndex)];
          persist(next);
          return next;
        }
      }

      // 创建新文章
      const newId = `article-${now}-${Math.random().toString(36).substring(2, 8)}`;
      const newArticle: ArticleHistory = {
        id: newId,
        title,
        content,
        style,
        createdAt: now,
        updatedAt: now,
      };

      currentArticleIdRef.current = newId;
      next = [newArticle, ...prev].slice(0, MAX_HISTORY);
      persist(next);
      return next;
    });

    return true;
  }, [persist]);

  /**
   * 从历史记录加载文章
   */
  const load = useCallback((articleId: string): ArticleHistory | null => {
    const article = articles.find(a => a.id === articleId);
    if (article) {
      currentArticleIdRef.current = articleId;
      return article;
    }
    return null;
  }, [articles]);

  /**
   * 删除历史记录
   */
  const remove = useCallback((articleId: string) => {
    setArticles(prev => {
      const next = prev.filter(a => a.id !== articleId);
      persist(next);
      return next;
    });
  }, [persist]);

  /**
   * 重置当前文章 ID（用于内容被清空或大量粘贴时）
   */
  const resetCurrentArticle = useCallback(() => {
    currentArticleIdRef.current = null;
  }, []);

  return {
    articles,
    save,
    load,
    remove,
    resetCurrentArticle,
  };
}
