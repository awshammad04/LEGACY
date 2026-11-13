import type { Design, LText, MissionId } from '../core/types';
import { L } from './l';

/** Ready-made rover packages: the quick way to build. Every package passes the readiness review; each has a real trade-off. */
export interface RoverPackage {
  id: string;
  icon: string;
  name: LText;
  tagline: LText;
  recommended?: boolean;
  bars: { speed: number; science: number; power: number; data: number };
  design: Design;
}

const M2_PACKAGES: RoverPackage[] = [
  {
    id: 'scout',
    icon: '🛰',
    name: L('Budget Scout'),
    tagline: L('Cheapest and lightest. It can photograph the rock but cannot test its chemistry, and it must land far away.'),
    bars: { speed: 2, science: 1, power: 2, data: 1 },
    design: {
      selections: { launcher: 'launcher-basic', edl: 'edl-basic', chassis: 'chassis-basic', nav: 'nav-basic', power: 'power-basic', comms: 'comms-basic', storage: 'storage-basic', protection: 'protection-basic', camera: 'camera-balanced' },
      addons: [],
    },
  },
  {
    id: 'explorer',
    icon: '🚙',
    name: L('Balanced Explorer'),
    tagline: L('Solar power, chemistry and organics tools, and a strong antenna. Lands right beside the river valley.'),
    recommended: true,
    bars: { speed: 3, science: 4, power: 3, data: 4 },
    design: {
      selections: { launcher: 'launcher-balanced', edl: 'edl-advanced', chassis: 'chassis-balanced', nav: 'nav-balanced', power: 'power-balanced', comms: 'comms-balanced', storage: 'storage-balanced', protection: 'protection-balanced', camera: 'camera-balanced' },
      addons: ['inst-arm', 'inst-abrasion', 'inst-xrf', 'inst-raman'],
    },
  },
  {
    id: 'lab',
    icon: '⚛',
    name: L('Radioisotope Lab'),
    tagline: L('Power that keeps working through dust storms, plus the full science toolkit — but a small antenna sends less data home.'),
    bars: { speed: 3, science: 5, power: 5, data: 2 },
    design: {
      selections: { launcher: 'launcher-balanced', edl: 'edl-advanced', chassis: 'chassis-balanced', nav: 'nav-balanced', power: 'power-advanced', comms: 'comms-basic', storage: 'storage-balanced', protection: 'protection-advanced', camera: 'camera-balanced' },
      addons: ['inst-arm', 'inst-abrasion', 'inst-xrf', 'inst-raman'],
    },
  },
];

export const PACKAGES: Partial<Record<MissionId, RoverPackage[]>> = { 'm2-martian-mystery': M2_PACKAGES };

export const sameDesign = (a: Design, b: Design) =>
  Object.keys(b.selections).every((k) => a.selections[k] === b.selections[k]) && a.addons.length === b.addons.length && b.addons.every((x) => a.addons.includes(x));
