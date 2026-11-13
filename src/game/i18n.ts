import type { Lang, LText } from '../core/types';
import AR_MAP from './ar.json';

const AR = AR_MAP as Record<string, string>;

export type TextLike = LText | string | number | undefined | null;

export function fmtNum(n: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

/** Localize a content text or UI string. Arabic comes from an inline `ar`, else the translation map, else English. */
export function localize(text: TextLike, lang: Lang, extraVars?: LText['vars']): string {
  if (text === undefined || text === null) return '';
  if (typeof text === 'number') return fmtNum(text, lang, 1);
  const base: LText = typeof text === 'string' ? { en: text } : text;
  let s = lang === 'ar' ? base.ar ?? AR[base.en] ?? base.en : base.en;
  const vars = { ...(base.vars ?? {}), ...(extraVars ?? {}) };
  if (Object.keys(vars).length) {
    s = s.replace(/\{(\w+)\}/g, (m, k: string) => {
      const v = vars[k];
      if (v === undefined) return m;
      if (typeof v === 'number') return fmtNum(v, lang, Number.isInteger(v) ? 0 : 1);
      if (typeof v === 'string') return lang === 'ar' ? AR[v] ?? v : v;
      return localize(v, lang);
    });
  }
  return s;
}

export function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
