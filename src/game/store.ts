import { create } from 'zustand';
import type { Action, Lang, LearnCard, MissionId, MissionState, LText } from '../core/types';
import { getMission } from '../content/missions';
import { newSeed, replay, step } from '../core/reducer';
import { applyDocumentLang, localize } from './i18n';

/* ------------------------------------------------------------------ */
/* Persistence (localStorage, versioned, failure-tolerant)             */
/* ------------------------------------------------------------------ */

const KEY = 'legacy.v1';
const SAVE_VERSION = 1;

export interface SaveSlot {
  version: number;
  missionId: MissionId;
  seed: number;
  actions: Action[];
  updatedAt: number;
}
export interface Settings {
  lang: Lang;
  subtitles: boolean;
  narration: boolean;
  sfx: boolean;
  reducedMotion: boolean;
  quality: 'high' | 'low';
}
export interface Profile {
  archive: string[];
  completed: Partial<Record<MissionId, { tier: string; achievements: string[]; at: number }>>;
  discoveries: string[];
}

const read = <T,>(k: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`${KEY}.${k}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(`${KEY}.${k}`, JSON.stringify(v));
  } catch {
    /* storage unavailable (private mode) — game continues without saving */
  }
};
const remove = (k: string) => {
  try {
    localStorage.removeItem(`${KEY}.${k}`);
  } catch {
    /* ignore */
  }
};

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_SETTINGS: Settings = { lang: 'en', subtitles: true, narration: false, sfx: true, reducedMotion: prefersReducedMotion(), quality: 'high' };

function loadSaves(): Partial<Record<MissionId, SaveSlot>> {
  const out: Partial<Record<MissionId, SaveSlot>> = {};
  for (const id of ['m1-apollo', 'm2-martian-mystery', 'm3-lost-rover', 'm4-cosmic-photographer'] as MissionId[]) {
    const s = read<SaveSlot | null>(`save.${id}`, null);
    if (s && s.version === SAVE_VERSION && Array.isArray(s.actions)) out[id] = s;
  }
  return out;
}

export const isTestMode = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export type View = 'home' | 'mission' | 'archive' | 'credits';

interface GameStore {
  view: View;
  settings: Settings;
  profile: Profile;
  saves: Partial<Record<MissionId, SaveSlot>>;
  missionId?: MissionId;
  seed: number;
  actions: Action[];
  state?: MissionState;
  dispatch: (a: Action) => boolean;
  startMission: (id: MissionId) => void;
  continueMission: (id: MissionId) => void;
  restoreActions: (actions: Action[]) => void;
  exitToHome: () => void;
  setView: (v: View) => void;
  setSettings: (s: Partial<Settings>) => void;
  addDiscovery: (id: string) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  view: 'home',
  settings: { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>('settings', {}) },
  profile: read<Profile>('profile', { archive: [], completed: {}, discoveries: [] }),
  saves: loadSaves(),
  seed: 0,
  actions: [],

  dispatch: (a) => {
    const { missionId, state, actions, seed } = get();
    if (!missionId || !state) return false;
    const mission = getMission(missionId);
    const next = step(mission, state, a, actions.length);
    if (next === state) return false;
    const nextActions = [...actions, a];
    const slot: SaveSlot = { version: SAVE_VERSION, missionId, seed, actions: nextActions, updatedAt: Date.now() };
    write(`save.${missionId}`, slot);
    // Profile: archive persistence + completed missions
    const profile = { ...get().profile };
    const newArchive = next.archiveUnlocked.filter((x) => !profile.archive.includes(x));
    if (newArchive.length) profile.archive = [...profile.archive, ...newArchive];
    if (next.outcome && next.stage === 'debrief' && state.stage !== 'debrief') {
      profile.completed = { ...profile.completed, [missionId]: { tier: next.outcome.tier, achievements: next.outcome.achievements, at: Date.now() } };
    }
    write('profile', profile);
    set({ state: next, actions: nextActions, saves: { ...get().saves, [missionId]: slot }, profile });
    return true;
  },

  startMission: (id) => {
    const seed = newSeed();
    const mission = getMission(id);
    const state = replay(mission, seed, []);
    const slot: SaveSlot = { version: SAVE_VERSION, missionId: id, seed, actions: [], updatedAt: Date.now() };
    write(`save.${id}`, slot);
    set({ view: 'mission', missionId: id, seed, actions: [], state, saves: { ...get().saves, [id]: slot } });
  },

  continueMission: (id) => {
    const slot = get().saves[id];
    if (!slot) return get().startMission(id);
    const state = replay(getMission(id), slot.seed, slot.actions);
    set({ view: 'mission', missionId: id, seed: slot.seed, actions: slot.actions, state });
  },

  restoreActions: (actions) => {
    const { missionId, seed } = get();
    if (!missionId) return;
    const state = replay(getMission(missionId), seed, actions);
    const slot: SaveSlot = { version: SAVE_VERSION, missionId, seed, actions, updatedAt: Date.now() };
    write(`save.${missionId}`, slot);
    set({ state, actions, saves: { ...get().saves, [missionId]: slot } });
  },

  exitToHome: () => set({ view: 'home' }),
  setView: (view) => set({ view }),

  setSettings: (s) => {
    const settings = { ...get().settings, ...s };
    write('settings', settings);
    if (s.lang) applyDocumentLang(s.lang);
    set({ settings });
  },

  addDiscovery: (id) => {
    const profile = get().profile;
    if (profile.discoveries.includes(id)) return;
    const next = { ...profile, discoveries: [...profile.discoveries, id] };
    write('profile', next);
    set({ profile: next });
  },
}));

export function deleteSave(id: MissionId) {
  remove(`save.${id}`);
  const saves = { ...useGame.getState().saves };
  delete saves[id];
  useGame.setState({ saves });
}

/** Translate helper bound to current language. */
export function useT() {
  const lang = useGame((s) => s.settings.lang);
  return (text: LText | string | number | undefined | null, vars?: LText['vars']) => localize(text, lang, vars);
}

/* ------------------------------------------------------------------ */
/* Transient UI state (not persisted)                                  */
/* ------------------------------------------------------------------ */

export type MenuPhase = 'intro' | 'main' | 'select';
const introSeen = () => {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('intro')) return false;
    return isTestMode() || localStorage.getItem('legacy.v1.introSeen') === '1';
  } catch {
    return true;
  }
};
export function markIntroSeen() {
  try {
    localStorage.setItem('legacy.v1.introSeen', '1');
  } catch {
    /* storage unavailable */
  }
}

interface UiStore {
  menu: MenuPhase;
  focusMission: MissionId;
  introT0: number;
  learnCard?: LearnCard;
  settingsOpen: boolean;
  previewMission?: MissionId;
  archiveEntry?: string;
  driving: boolean;
  lookAround: boolean;
  waypoints: [number, number][];
  speed: 'cautious' | 'standard' | 'fast';
  set: (p: Partial<Omit<UiStore, 'set'>>) => void;
}
export const useUi = create<UiStore>((set) => ({
  menu: introSeen() ? 'main' : 'intro',
  focusMission: 'm2-martian-mystery',
  introT0: typeof performance !== 'undefined' ? performance.now() : 0,
  settingsOpen: false,
  driving: false,
  lookAround: false,
  waypoints: [],
  speed: 'standard',
  set: (p) => set(p),
}));

if (typeof window !== 'undefined') {
  applyDocumentLang(useGame.getState().settings.lang);
  if (isTestMode()) (window as unknown as Record<string, unknown>).__legacy = { useGame, useUi };
}
