import { ImageStore } from './image-store';

/**
 * 处理 img:// 协议（从 IndexedDB 加载图片）
 * 迁移自 app.js:974-1028
 */

// 图片丢失占位符
const MISSING_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E图片丢失%3C/text%3E%3C/svg%3E';

// 加载失败占位符
const ERROR_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23fee" width="200" height="200"/%3E%3Ctext fill="%23c00" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E加载失败%3C/text%3E%3C/svg%3E';

export async function processImageProtocol(
  html: string,
  imageStore: ImageStore | null,
  imageUrlCache: Record<string, string>
): Promise<string> {
  if (!imageStore) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));

  for (const img of images) {
    const src = img.getAttribute('src');

    if (src && src.startsWith('img://')) {
      const imageId = src.replace('img://', '');

      try {
        let objectURL = imageUrlCache[imageId];

        if (!objectURL) {
          objectURL = await imageStore.getImage(imageId) as string;

          if (objectURL) {
            imageUrlCache[imageId] = objectURL;
          } else {
            console.warn(`图片不存在: ${imageId}`);
            img.setAttribute('src', MISSING_IMAGE_PLACEHOLDER);
            continue;
          }
        }

        img.setAttribute('src', objectURL);
        img.setAttribute('data-image-id', imageId);
      } catch (error) {
        console.error(`加载图片失败 (${imageId}):`, error);
        img.setAttribute('src', ERROR_IMAGE_PLACEHOLDER);
      }
    }
  }

  return doc.body.innerHTML;
}
