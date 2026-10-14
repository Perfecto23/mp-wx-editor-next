import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const fixture = { format: 'mp-wx-editor-history', version: 1,
  articles: [{ id: 'a', title: '带图文章', content: '# 带图文章\n![图](img://same)', style: 'wechat-default', createdAt: 1, updatedAt: 1 }],
  images: [{ id: 'same', type: 'image/png', data: png.toString('base64'), sha256: createHash('sha256').update(png).digest('hex') }] };
async function editor(page: import('@playwright/test').Page) {
  await page.goto('/'); await expect(page.locator('textarea')).toBeVisible();
  await page.locator('textarea').fill('# 就绪'); await expect(page.locator('.preview-container')).toContainText('就绪');
}

test('输入后立刻复制使用最新内容，列表链接与纯文本层级保留', async ({ page }) => {
  await editor(page);
  await page.locator('textarea').fill('# 最新文章\n\n1. [链接](https://example.com)\n   - **子项**\n2. 第二项\n\n```js\nconst x =  1;\n```');
  await page.getByRole('button', { name: '复制到公众号' }).click();
  await expect(page.getByText('复制成功', { exact: true })).toBeVisible();
  const clip = await page.evaluate(async () => {
    const item = (await navigator.clipboard.read())[0];
    return { html: await (await item.getType('text/html')).text(), text: await (await item.getType('text/plain')).text() };
  });
  expect(clip.html).toContain('最新文章'); expect(clip.html).toContain('https://example.com');
  expect(clip.html).toMatch(/<ol[\s\S]*<ul/); expect(clip.html).toContain('<strong');
  expect(clip.text).toContain('1. 链接'); expect(clip.text).toContain('子项');expect(clip.text).toContain('const x =  1;');
});

test('导入预检→副本→带图备份→新环境恢复，原草稿保留', async ({ page, browser }) => {
  await editor(page);await page.locator('textarea').fill('# 原草稿');
  await page.getByLabel('选择备份文件').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await expect(page.getByRole('dialog')).toContainText('1 篇记录、1 张图片');
  await page.getByRole('button', { name: '作为副本导入' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('textarea')).toHaveValue('# 原草稿');
  const download = page.waitForEvent('download');await page.getByRole('button', { name: '备份', exact: true }).click();
  const file = await download; const bytes = await readFile((await file.path())!);const data = JSON.parse(bytes.toString());
  expect(data.images).toHaveLength(1);expect(Buffer.from(data.images[0].data, 'base64')).toEqual(png);
  expect(data.articles.some((a: { content: string }) => a.content === '# 原草稿')).toBe(true);
  const context = await browser.newContext();const fresh = await context.newPage();await fresh.goto('/');
  await fresh.getByLabel('选择备份文件').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: bytes });
  await fresh.getByRole('button', { name: '作为副本导入' }).click();await expect(fresh.getByRole('dialog')).not.toBeVisible();
  await fresh.getByRole('button', { name: '打开历史记录' }).click();await fresh.getByRole('heading', { name: '带图文章', exact: true }).click();
  await expect(fresh.locator('textarea')).toHaveValue(/# 带图文章/);
  await expect(fresh.locator('.preview-container img')).toHaveCount(1);
  await expect(fresh.locator('.preview-container img')).toBeVisible();
  const htmlDownload=fresh.waitForEvent('download');await fresh.getByRole('button',{name:'下载 HTML'}).click();const html=await readFile((await (await htmlDownload).path())!,'utf8');expect(html).toContain('data:image/png;base64,');expect(html).not.toContain('blob:');
  await context.close();
});

test('坏图片校验值拒绝且已有历史不变', async ({ page }) => {
  await editor(page);const bad=structuredClone(fixture);bad.images[0].sha256='0'.repeat(64);
  await page.getByLabel('选择备份文件').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await expect(page.getByText(/图片 same 校验失败/)).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('articleHistory'))).toBeNull();
});

test('保存失败不假报成功，切换历史保住草稿', async ({ page }) => {
  await editor(page);await page.getByRole('button',{name:'保存到历史记录',exact:true}).click();
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='markdownInput')throw new DOMException('full','QuotaExceededError');return original.call(this,k,v);};});
  await page.locator('textarea').fill('# 未保存的重要草稿');await expect(page.getByRole('status')).toContainText('保存失败');
  await page.getByRole('button',{name:'打开历史记录'}).click();await page.getByRole('heading',{name:'就绪',exact:true}).click();
  await expect(page.locator('textarea')).toHaveValue('# 未保存的重要草稿');await expect(page.getByText('当前草稿保存失败，请先备份再切换')).toBeVisible();
});

test('窄屏可备份，危险HTML在预览和导出前清洗', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await editor(page);
  await page.locator('textarea').fill('# 手机文章\n<script>window.__bad=1</script><img src=x onerror="window.__bad=1">');
  await expect(page.locator('.preview-container')).toContainText('手机文章');
  expect(await page.evaluate(()=>Reflect.get(window,'__bad'))).toBeUndefined();
  expect(await page.locator('.preview-container [onerror], .preview-container script').count()).toBe(0);
  await expect(page.getByRole('button',{name:'备份',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('剪贴板权限拒绝时下载正确HTML，不误报已复制', async ({ page }) => {
  await editor(page);await page.locator('textarea').fill('# 权限回退文章\n\n[链接](https://example.com)');
  await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'write',{value:async()=>{throw new DOMException('denied','NotAllowedError');}}));
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'复制到公众号'}).click();
  const content=await readFile((await (await pending).path())!,'utf8');expect(content).toContain('权限回退文章');expect(content).toContain('https://example.com');
  await expect(page.getByText('剪贴板不可用，已下载 HTML',{exact:true})).toBeVisible();
});

test('旧历史兼容，恢复后再保存保留新旧快照', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('articleHistory',JSON.stringify({articles:[{id:'old',title:'旧稿',content:'# 旧稿正文',style:'wechat-default',createdAt:1,updatedAt:1}]})));
  await editor(page);await page.getByRole('button',{name:'打开历史记录'}).click();await page.getByRole('heading',{name:'旧稿',exact:true}).click();
  await expect(page.locator('textarea')).toHaveValue('# 旧稿正文');await page.locator('textarea').fill('# 新版本正文');await page.getByRole('button',{name:'保存到历史记录',exact:true}).click();
  const articles=await page.evaluate(()=>JSON.parse(localStorage.getItem('articleHistory')!).articles as {content:string}[]);
  expect(articles.some(a=>a.content==='# 旧稿正文')).toBe(true);expect(articles.some(a=>a.content==='# 新版本正文')).toBe(true);
});
