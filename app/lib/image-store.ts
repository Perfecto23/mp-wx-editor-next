/**
 * IndexedDB 图片存储管理器
 * 数据库: WechatEditorImages, 存储: images
 * 迁移自 app.js:9-213
 */

interface ImageMetadata {
  name: string;
  originalName?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: string;
  mimeType: string;
}

interface StoredImage {
  id: string;
  blob: Blob;
  metadata: ImageMetadata;
  createdAt: number;
}

export class ImageStore {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'WechatEditorImages';
  private readonly storeName = 'images';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('无法打开 IndexedDB: ' + request.error?.message));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveImage(id: string, blob: Blob, metadata: ImageMetadata): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const record: StoredImage = {
        id,
        blob,
        metadata,
        createdAt: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('保存图片失败: ' + request.error?.message));
    });
  }

  /**
   * 获取图片的 Object URL（用于预览）
   */
  async getImage(id: string): Promise<string | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as StoredImage | undefined;
        if (record && record.blob) {
          const objectURL = URL.createObjectURL(record.blob);
          resolve(objectURL);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error('获取图片失败: ' + request.error?.message));
    });
  }

  /**
   * 获取图片 Blob（用于复制时转 Base64）
   */
  async getImageBlob(id: string): Promise<Blob | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as StoredImage | undefined;
        if (record && record.blob) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error('获取图片 Blob 失败: ' + request.error?.message));
    });
  }

  async deleteImage(id: string): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('删除图片失败: ' + request.error?.message));
    });
  }

  async getAllImages(): Promise<StoredImage[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as StoredImage[]);
      request.onerror = () => reject(new Error('获取所有图片失败: ' + request.error?.message));
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('清空图片失败: ' + request.error?.message));
    });
  }

  async getTotalSize(): Promise<number> {
    const images = await this.getAllImages();
    return images.reduce((total, img) => total + (img.blob?.size || 0), 0);
  }
}
