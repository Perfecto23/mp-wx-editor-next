import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_URI_SAFE_ATTR: ['data-image-id'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|img|blob):|data:image\/(?:png|jpeg|gif|webp);|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
  });
}
