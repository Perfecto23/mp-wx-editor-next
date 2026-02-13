'use client';

import { useState, useEffect, useCallback } from 'react';

const RECOMMENDED_STYLES = ['nikkei', 'wechat-anthropic', 'wechat-ft', 'wechat-nyt', 'latepost-depth', 'wechat-tech'];

/**
 * 样式选择/收藏/持久化 Hook
 * 迁移自 app.js 的样式相关方法
 */
export function useStyleManager() {
  const [currentStyle, setCurrentStyle] = useState(() => {
    if (typeof window === 'undefined') return 'wechat-default';
    try {
      return localStorage.getItem('currentStyle') || 'wechat-default';
    } catch {
      return 'wechat-default';
    }
  });

  const [starredStyles, setStarredStyles] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('starredStyles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 持久化当前样式
  useEffect(() => {
    try {
      localStorage.setItem('currentStyle', currentStyle);
    } catch (error) {
      console.error('保存样式偏好失败:', error);
    }
  }, [currentStyle]);

  // 切换收藏
  const toggleStar = useCallback((styleKey: string) => {
    setStarredStyles(prev => {
      const index = prev.indexOf(styleKey);
      let next: string[];
      if (index > -1) {
        next = prev.filter(s => s !== styleKey);
      } else {
        next = [...prev, styleKey];
      }

      try {
        localStorage.setItem('starredStyles', JSON.stringify(next));
      } catch (error) {
        console.error('保存星标样式失败:', error);
      }

      return next;
    });
  }, []);

  const isStarred = useCallback((styleKey: string) => {
    return starredStyles.includes(styleKey);
  }, [starredStyles]);

  const isRecommended = useCallback((styleKey: string) => {
    return RECOMMENDED_STYLES.includes(styleKey);
  }, []);

  return {
    currentStyle,
    setCurrentStyle,
    starredStyles,
    toggleStar,
    isStarred,
    isRecommended,
  };
}
