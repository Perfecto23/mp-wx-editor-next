'use client';

import { useMemo } from 'react';
import { ImageCompressor } from '../lib/image-compressor';

/**
 * 图片压缩 Hook
 * 封装 ImageCompressor 实例的创建（单例）
 */
export function useImageCompressor() {
  const compressor = useMemo(() => new ImageCompressor({
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
  }), []);

  return { compressor };
}
