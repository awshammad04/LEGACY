import { create } from 'zustand';

/** Real-time telemetry from the 3D rover controller (not persisted; the reducer stays the source of truth). */
interface LiveStore {
  pos: [number, number];
  heading: number;
  speed: number;
  pendingWh: number;
  nearSiteId?: string;
  blocked?: 'slope' | 'battery' | null;
  moved: boolean;
  /** Visual scan beam: site id + start time */
  scan?: { siteId: string; at: number };
  /** Touch / on-screen controls */
  touch: { fwd: boolean; back: boolean; left: boolean; right: boolean; boost: boolean };
  /** UI panels that pause driving */
  panel: 'none' | 'actions' | 'journal' | 'report' | 'intro';
  set: (p: Partial<Omit<LiveStore, 'set'>>) => void;
}

export const useLive = create<LiveStore>((set) => ({
  pos: [0, 0],
  heading: 0,
  speed: 0,
  pendingWh: 0,
  blocked: null,
  moved: false,
  touch: { fwd: false, back: false, left: false, right: false, boost: false },
  panel: 'none',
  set: (p) => set(p),
}));

if (typeof window !== 'undefined' && new URLSearchParams(location.search).has('test')) (window as unknown as Record<string, unknown>).__legacyLive = useLive;
