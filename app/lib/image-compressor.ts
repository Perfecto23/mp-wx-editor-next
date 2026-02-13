import { formatSize } from './utils';

/**
 * Canvas 图片压缩器
 * 迁移自 app.js:215-313
 */

interface CompressorOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export class ImageCompressor {
  private maxWidth: number;
  private maxHeight: number;
  private quality: number;

  constructor(options: CompressorOptions = {}) {
    this.maxWidth = options.maxWidth || 1920;
    this.maxHeight = options.maxHeight || 1920;
    this.quality = options.quality || 0.85;
  }

  /**
   * 压缩图片文件
   * - GIF/SVG 不压缩
   * - PNG 保持 PNG（透明度）
   * - 其他转 JPEG
   * - 智能对比：压缩后更大则用原图
   */
  async compress(file: File): Promise<Blob> {
    // GIF 和 SVG 不压缩
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        try {
          // 计算缩放后的尺寸
          let { width, height } = img;

          if (width > this.maxWidth || height > this.maxHeight) {
            const ratio = Math.min(this.maxWidth / width, this.maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // 创建 Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'));
            return;
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 确定输出格式
          const isPNG = file.type === 'image/png';
          const outputType = isPNG ? 'image/png' : 'image/jpeg';
          const quality = isPNG ? undefined : this.quality;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob 失败'));
                return;
              }

              // 智能对比：如果压缩后更大，用原图
              if (blob.size >= file.size) {
                resolve(file);
              } else {
                resolve(blob);
              }
            },
            outputType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };

      img.src = url;
    });
  }

  static formatSize(bytes: number): string {
    return formatSize(bytes);
  }
}
