import type { ArticleHistory } from '../types';
import type { ImageStore } from './image-store';

export const HISTORY_KEY = 'articleHistory';
export const BACKUP_LIMIT = 32 * 1024 * 1024;
const MAX_RECORDS = 1000;
const MAX_IMAGES = 200;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_REF = /img:\/\/([^\s)"'<>]+)/g;
const FORMAT = 'mp-wx-editor-history';
type BackupImage = { id: string; type: string; data: string; sha256: string };
export type EditorBackup = { format: typeof FORMAT; version: 1; articles: ArticleHistory[]; images: BackupImage[] };
export type CheckedBackup = { articles: ArticleHistory[]; images: { id: string; blob: Blob }[] };

export function readHistory(storage: Pick<Storage, 'getItem'>): ArticleHistory[] {
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.articles)) throw new Error('历史记录格式损坏，请先导出浏览器原数据');
  return validateArticles(data.articles);
}

function validateArticles(input: unknown[]): ArticleHistory[] {
  if (input.length > MAX_RECORDS) throw new Error('文章数量超过 1000 篇');
  const ids = new Set<string>();
  return input.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('文章格式不完整');
    const a = item as Record<string, unknown>;
    if (typeof a.id !== 'string' || !a.id || ids.has(a.id) || typeof a.content !== 'string' ||
        typeof a.title !== 'string' || typeof a.style !== 'string' ||
        !Number.isFinite(a.createdAt) || !Number.isFinite(a.updatedAt)) throw new Error('文章字段无效或 ID 重复');
    ids.add(a.id);
    return { id: a.id, content: a.content, title: a.title, style: a.style,
      createdAt: a.createdAt as number, updatedAt: a.updatedAt as number };
  });
}

export function imageIds(content: string): string[] {
  return [...new Set(Array.from(content.matchAll(IMAGE_REF), m => m[1]))];
}

async function hash(bytes: Uint8Array): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(result), b => b.toString(16).padStart(2, '0')).join('');
}
function base64(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

export async function exportBackup(articles: ArticleHistory[], store: ImageStore): Promise<string> {
  validateArticles(articles);
  const ids = [...new Set(articles.flatMap(a => imageIds(a.content)))];
  if (ids.length > MAX_IMAGES) throw new Error('图片数量超过 200 张，请分批备份');
  const images: BackupImage[] = [];
  let total = new Blob([JSON.stringify(articles)]).size;
  for (const id of ids) {
    const blob = await store.getImageBlob(id);
    if (!blob) throw new Error(`图片 ${id} 缺失，备份未生成，请先检查文章`);
    if (blob.size > MAX_IMAGE_BYTES || !/^image\/(png|jpeg|gif|webp)$/.test(blob.type)) throw new Error(`图片 ${id} 的格式或大小不支持备份`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    total += Math.ceil(bytes.length / 3) * 4;
    if (total > BACKUP_LIMIT) throw new Error('备份超过 32 MB，请减少历史记录后重试');
    images.push({ id, type: blob.type, data: base64(bytes), sha256: await hash(bytes) });
  }
  const text = JSON.stringify({ format: FORMAT, version: 1, articles, images } satisfies EditorBackup);
  if (new Blob([text]).size > BACKUP_LIMIT) throw new Error('备份超过 32 MB');
  return text;
}

/** 在任何持久化之前校验全部输入；声明的哈希不参与可信判断。 */
export async function checkBackup(text: string): Promise<CheckedBackup> {
  if (new Blob([text]).size > BACKUP_LIMIT) throw new Error('备份超过 32 MB');
  const data = JSON.parse(text);
  if (data?.format !== FORMAT || data.version !== 1) throw new Error('不支持此备份格式或版本');
  if (!Array.isArray(data.articles) || !Array.isArray(data.images) || data.images.length > MAX_IMAGES) throw new Error('备份结构或图片数量无效');
  const articles = validateArticles(data.articles);
  const images: CheckedBackup['images'] = [];
  const seen = new Set<string>();
  for (const image of data.images) {
    if (!image || typeof image.id !== 'string' || !image.id || seen.has(image.id) ||
        !/^image\/(png|jpeg|gif|webp)$/.test(image.type) || typeof image.data !== 'string' ||
        image.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[a-f0-9]{64}$/.test(image.sha256)) throw new Error('图片字段无效、重复或超过大小限制');
    const bytes = Uint8Array.from(atob(image.data), c => c.charCodeAt(0));
    if (bytes.length > MAX_IMAGE_BYTES || await hash(bytes) !== image.sha256) throw new Error(`图片 ${image.id} 校验失败，未导入任何内容`);
    seen.add(image.id);
    images.push({ id: image.id, blob: new Blob([bytes], { type: image.type }) });
  }
  for (const a of articles) for (const id of imageIds(a.content)) {
    if (!seen.has(id)) throw new Error(`文章「${a.title}」缺少图片 ${id}`);
  }
  return { articles, images };
}

/** 导入始终新建副本。先事务写图片，历史写入失败时只回收本次新图。 */
export async function importBackup(backup: CheckedBackup, store: ImageStore, storage: Storage): Promise<number> {
  const idMap = new Map(backup.images.map(i => [i.id, `img-${crypto.randomUUID()}`]));
  const articles = backup.articles.map(a => ({ ...a, id: `article-${crypto.randomUUID()}`,
    content: a.content.replace(IMAGE_REF, (_, id: string) => `img://${idMap.get(id) ?? id}`) }));
  const images = backup.images.map(i => ({ id: idMap.get(i.id)!, blob: i.blob }));
  await store.writeImages(images);
  try {
    // 这里重新读取，保留校验与写图期间其他标签页保存的记录。
    const current = readHistory(storage);
    if (current.length + articles.length > MAX_RECORDS) throw new Error('导入后超过 1000 篇，请先整理历史记录');
    storage.setItem(HISTORY_KEY, JSON.stringify({ articles: [...articles, ...current] }));
  } catch (error) {
    try { await store.removeImages(images.map(i => i.id)); } catch { /* 新图无正文引用，后续备份不会包含它们。 */ }
    throw error;
  }
  return articles.length;
}
