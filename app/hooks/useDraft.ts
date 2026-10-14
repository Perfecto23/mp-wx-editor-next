'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_EXAMPLE } from '../config/default-example';

/** 保留旧存储key；遇到另一个标签页的新内容时阻止静默覆盖。 */
export function useDraft() {
  const [content, setContent] = useState('');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('正在读取草稿');
  const latest = useRef('');
  const base = useRef<string | null>(null);
  const loaded = useRef(false);
  const dirty = useRef(false);
  const change = useCallback((next: React.SetStateAction<string>) => {
    const value = typeof next === 'function' ? next(latest.current) : next;
    latest.current = value; dirty.current = true; setContent(value); setStatus('未保存');
  }, []);
  const flush = useCallback((): boolean => {
    if (!loaded.current || !dirty.current) return true;
    try {
      const remote = localStorage.getItem('markdownInput');
      if (remote !== base.current && remote !== latest.current) {
        setStatus('其他标签页已修改草稿，请先备份当前内容再刷新'); return false;
      }
      localStorage.setItem('markdownInput', latest.current);
      base.current = latest.current; dirty.current = false; setStatus('已保存到本机'); return true;
    } catch { setStatus('保存失败，当前内容仍在编辑器中，请备份后再离开'); return false; }
  }, []);
  useEffect(() => {
    try {
      base.current = localStorage.getItem('markdownInput');
      latest.current = base.current ?? DEFAULT_EXAMPLE;
      setContent(latest.current); setStatus('已读取本机草稿');
      loaded.current = true; setReady(true);
    } catch { setStatus('无法读取本机草稿，请检查浏览器存储权限'); }
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(flush, 800);
    return () => clearTimeout(timer);
  }, [content, ready, flush]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => { if (!flush()) { e.preventDefault(); e.returnValue = ''; } };
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', unload); document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('visibilitychange', hide); };
  }, [flush]);
  return { content, setContent: change, ready, status, flush };
}
