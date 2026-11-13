import type { LText } from '../core/types';

/** Author content in English; Arabic comes from the translation map (game/i18n/ar.json) or an inline `ar`. */
export const L = (en: string, ar?: string): LText => (ar ? { en, ar } : { en });
