import type MarkdownIt from 'markdown-it';

/**
 * CJK 强调标记补丁
 * 修补 markdown-it 的 delimiter 扫描器以正确处理中文上下文中的 ** 和 * 标记
 * 迁移自 app.js:1713-1805, 483-504
 */

// 强调标记字符
const EMPHASIS_MARKERS = new Set([0x2A /* * */, 0x5F /* _ */]);

/**
 * 检测字符是否是 CJK 字母
 */
function isCjkLetter(charCode: number): boolean {
  return (
    (charCode >= 0x4E00 && charCode <= 0x9FFF) ||   // CJK Unified Ideographs
    (charCode >= 0x3400 && charCode <= 0x4DBF) ||   // CJK Unified Ideographs Extension A
    (charCode >= 0x20000 && charCode <= 0x2A6DF) || // CJK Unified Ideographs Extension B
    (charCode >= 0x2A700 && charCode <= 0x2B73F) || // CJK Unified Ideographs Extension C
    (charCode >= 0x2B740 && charCode <= 0x2B81F) || // CJK Unified Ideographs Extension D
    (charCode >= 0xF900 && charCode <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (charCode >= 0x2F800 && charCode <= 0x2FA1F) || // CJK Compatibility Ideographs Supplement
    (charCode >= 0x3000 && charCode <= 0x303F) ||   // CJK Symbols and Punctuation
    (charCode >= 0x3040 && charCode <= 0x309F) ||   // Hiragana
    (charCode >= 0x30A0 && charCode <= 0x30FF) ||   // Katakana
    (charCode >= 0x31F0 && charCode <= 0x31FF) ||   // Katakana Phonetic Extensions
    (charCode >= 0xAC00 && charCode <= 0xD7AF) ||   // Hangul Syllables
    (charCode >= 0x1100 && charCode <= 0x11FF) ||   // Hangul Jamo
    (charCode >= 0xFF01 && charCode <= 0xFF60) ||   // Full-width ASCII variants
    (charCode >= 0xFF61 && charCode <= 0xFF9F) ||   // Half-width Katakana
    (charCode >= 0xFFA0 && charCode <= 0xFFDC)      // Full-width Latin letters
  );
}

/**
 * 创建安全的前导标点检查器
 */
function createSafeLeadingPunctuationChecker(): (charCode: number, marker: number) => boolean {
  const fallbackChars = '「『《〈（【〔〖［｛﹁﹃﹙﹛﹝"\'（';
  const fallbackSet = new Set(
    fallbackChars.split('').map(char => char.codePointAt(0)!)
  );

  let unicodeRegex: RegExp | null = null;
  try {
    unicodeRegex = new RegExp('[\\p{Ps}\\p{Pi}]', 'u');
  } catch {
    unicodeRegex = null;
  }

  return (charCode: number, marker: number): boolean => {
    if (!EMPHASIS_MARKERS.has(marker)) {
      return false;
    }

    if (unicodeRegex) {
      const char = String.fromCharCode(charCode);
      if (unicodeRegex.test(char)) {
        return true;
      }
    }

    return fallbackSet.has(charCode);
  };
}

/**
 * 应用 CJK 补丁到 markdown-it 实例
 */
export function patchMarkdownScanner(md: MarkdownIt): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineModule = md.inline as any;
  if (!md || !inlineModule || !inlineModule.State) {
    return;
  }

  const utils = md.utils;
  const StateInline = inlineModule.State;
  const allowLeadingPunctuation = createSafeLeadingPunctuationChecker();

  const originalScanDelims = StateInline.prototype.scanDelims;

  StateInline.prototype.scanDelims = function(start: number, canSplitWord: boolean) {
    const max = this.posMax;
    const marker = this.src.charCodeAt(start);

    if (!EMPHASIS_MARKERS.has(marker)) {
      return originalScanDelims.call(this, start, canSplitWord);
    }

    const lastChar = start > 0 ? this.src.charCodeAt(start - 1) : 0x20;

    let pos = start;
    while (pos < max && this.src.charCodeAt(pos) === marker) {
      pos++;
    }

    const count = pos - start;
    const nextChar = pos < max ? this.src.charCodeAt(pos) : 0x20;

    const isLastWhiteSpace = utils.isWhiteSpace(lastChar);
    const isNextWhiteSpace = utils.isWhiteSpace(nextChar);

    let isLastPunctChar =
      utils.isMdAsciiPunct(lastChar) || utils.isPunctChar(String.fromCharCode(lastChar));

    let isNextPunctChar =
      utils.isMdAsciiPunct(nextChar) || utils.isPunctChar(String.fromCharCode(nextChar));

    if (isNextPunctChar && allowLeadingPunctuation(nextChar, marker)) {
      isNextPunctChar = false;
    }

    if (marker === 0x5F /* _ */) {
      if (!isLastWhiteSpace && !isLastPunctChar && isCjkLetter(lastChar)) {
        isLastPunctChar = true;
      }
      if (!isNextWhiteSpace && !isNextPunctChar && isCjkLetter(nextChar)) {
        isNextPunctChar = true;
      }
    }

    const left_flanking =
      !isNextWhiteSpace && (!isNextPunctChar || isLastWhiteSpace || isLastPunctChar);
    const right_flanking =
      !isLastWhiteSpace && (!isLastPunctChar || isNextWhiteSpace || isNextPunctChar);

    const can_open = left_flanking && (canSplitWord || !right_flanking || isLastPunctChar);
    const can_close = right_flanking && (canSplitWord || !left_flanking || isNextPunctChar);

    return { can_open, can_close, length: count };
  };
}
