import { beforeEach, expect, it } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { ImageStore } from '../../app/lib/image-store';
import { checkBackup, exportBackup, importBackup, readHistory } from '../../app/lib/backup';

class MemoryStorage {
  data = new Map<string, string>();
  fail = false;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error('quota'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  get length() { return this.data.size; }
}
const record = { id: 'old', title: '文章', content: '# 正文\n![图](img://same)', style: 'wechat-default', createdAt: 1, updatedAt: 2 };
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
async function store() { const s = new ImageStore(); await s.init(); return s; }
beforeEach(() => { Object.assign(globalThis, { indexedDB: new IDBFactory(), IDBKeyRange }); });
async function fixture() {
  const s = await store(); const blob = new Blob([png], { type: 'image/png' });
  await s.saveImage('same', blob, { name: '图', originalSize: blob.size, compressedSize: blob.size, compressionRatio: '0%', mimeType: blob.type });
  return { s, text: await exportBackup([record], s) };
}
it('备份往返保留正文、主题和实际图片字节；导入不覆盖同ID本地图', async () => {
  const { text } = await fixture(); globalThis.indexedDB = new IDBFactory(); const target = await store();
  const local = new Blob(['local bytes'], { type: 'image/png' });
  await target.saveImage('same', local, { name: '本地图', originalSize: local.size, compressedSize: local.size, compressionRatio: '0%', mimeType: local.type });
  const storage = new MemoryStorage();storage.setItem('articleHistory', JSON.stringify({ articles: [{ ...record, content: 'existing' }] }));
  const checked = await checkBackup(text); expect(await importBackup(checked, target, storage)).toBe(1);
  const records = readHistory(storage); expect(records).toHaveLength(2); expect(records[0].style).toBe(record.style);
  const id = records[0].content.match(/img:\/\/([^)]*)/)![1];expect(id).not.toBe('same');
  expect(new Uint8Array(await (await target.getImageBlob(id))!.arrayBuffer())).toEqual(png);
  expect(await (await target.getImageBlob('same'))!.text()).toBe('local bytes');
});
it('损坏清单哈希在写入前拒绝；旧数据不变', async () => {
  const { text, s } = await fixture();const bad = JSON.parse(text);bad.images[0].sha256 = '0'.repeat(64);
  await expect(checkBackup(JSON.stringify(bad))).rejects.toThrow('校验失败');
  expect(new Uint8Array(await (await s.getImageBlob('same'))!.arrayBuffer())).toEqual(png);
});
it('历史写入失败时回收本次图片，不删除原图', async () => {
  const { text, s } = await fixture();const storage = new MemoryStorage(); storage.fail = true;
  await expect(importBackup(await checkBackup(text), s, storage)).rejects.toThrow('quota');
  expect((await s.getAllImages()).map(x => x.id)).toEqual(['same']);
});
it('重复ID、未知版本、缺图都拒绝', async () => {
  const { text } = await fixture();const data = JSON.parse(text);
  await expect(checkBackup(JSON.stringify({ ...data, version: 99 }))).rejects.toThrow('版本');
  await expect(checkBackup(JSON.stringify({ ...data, articles: [record, record] }))).rejects.toThrow('重复');
  await expect(checkBackup(JSON.stringify({ ...data, images: [] }))).rejects.toThrow('缺少图片');
});
it('新图片写入事务中止不会报告成功或留下半个批次', async () => {
  const s = await store(); const blob = new Blob(['test'], { type: 'image/png' });
  await expect(s.writeImages([{ id: 'dup', blob }, { id: 'dup', blob }])).rejects.toBeTruthy();
  expect(await s.getAllImages()).toEqual([]);
});
