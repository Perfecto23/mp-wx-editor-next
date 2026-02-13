'use client';

import { useState, useEffect, useRef } from 'react';
import { ImageStore } from '../lib/image-store';

/**
 * IndexedDB 图片存储 Hook
 * 封装 ImageStore 类的初始化和生命周期管理
 */
export function useImageStore() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeRef = useRef<ImageStore | null>(null);
  const [store, setStore] = useState<ImageStore | null>(null);

  useEffect(() => {
    const s = new ImageStore();
    s.init()
      .then(() => {
        storeRef.current = s;
        setStore(s);
        setIsReady(true);
      })
      .catch((err) => {
        console.error('图片存储系统初始化失败:', err);
        setError(err.message);
      });
  }, []);

  return {
    imageStore: store,
    isReady,
    error,
  };
}
