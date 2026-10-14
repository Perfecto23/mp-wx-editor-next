// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { sanitizeHtml } from '../../app/lib/sanitize-html';
it('保留列表、链接、本地图片，移除可执行HTML', () => {
  const html = sanitizeHtml('<ul><li><a href="https://example.com">链接</a><ul><li>子项</li></ul></li></ul><img src="img://same" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">危险</a>');
  expect(html).toContain('img://same'); expect(html).toContain('<ul>');expect(html).toContain('https://example.com');
  expect(html).not.toMatch(/onerror|<script|javascript:/);
});
