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

const M1_PACKAGES: RoverPackage[] = [
  {
    id: 'walkers',
    icon: '🚶',
    name: L('Moonwalkers'),
    tagline: L('No rover: cheaper and lighter, but the crew can only walk — slower, and every trip uses more suit time.'),
    bars: { speed: 1, science: 2, power: 3, data: 1 },
    design: {
      selections: { launcher: 'm1-launcher-basic', crew: 'm1-crew-basic', edl: 'm1-lander-basic', chassis: 'm1-rover-basic', life: 'm1-life-balanced', power: 'm1-power-basic', comms: 'm1-comms-basic', protection: 'm1-protection-basic', camera: 'm1-camera-basic', storage: 'm1-storage-basic' },
      addons: ['m1-inst-geology'],
    },
  },
  {
    id: 'rover-team',
    icon: '🚙',
    name: L('Apollo-style Rover Team'),
    tagline: L('A Lunar Roving Vehicle, zoom cameras, storm shelter and geology tools. Balanced and safe.'),
    recommended: true,
    bars: { speed: 3, science: 3, power: 3, data: 3 },
    design: {
      selections: { launcher: 'm1-launcher-balanced', crew: 'm1-crew-balanced', edl: 'm1-lander-balanced', chassis: 'm1-rover-balanced', life: 'm1-life-balanced', power: 'm1-power-balanced', comms: 'm1-comms-balanced', protection: 'm1-protection-balanced', camera: 'm1-camera-balanced', storage: 'm1-storage-balanced' },
      addons: ['m1-inst-geology'],
    },
  },
  {
    id: 'long-range',
    icon: '🛞',
    name: L('Long-Range Explorers'),
    tagline: L('Fast rover, 20-day life support, best radiation protection and a long-lens camera — but a tight budget.'),
    bars: { speed: 5, science: 4, power: 4, data: 3 },
    design: {
      selections: { launcher: 'm1-launcher-balanced', crew: 'm1-crew-basic', edl: 'm1-lander-balanced', chassis: 'm1-rover-advanced', life: 'm1-life-advanced', power: 'm1-power-balanced', comms: 'm1-comms-balanced', protection: 'm1-protection-advanced', camera: 'm1-camera-advanced', storage: 'm1-storage-basic' },
      addons: ['m1-inst-geology'],
    },
  },
];

const M3_PACKAGES: RoverPackage[] = [
  {
    id: 'scout',
    icon: '🛰',
    name: L('Budget Scout'),
    tagline: L('Cheapest. Wide cameras only, small battery, solar power that suffers in dust storms.'),
    bars: { speed: 2, science: 1, power: 1, data: 1 },
    design: {
      selections: { launcher: 'm3-launcher-basic', edl: 'm3-edl-basic', chassis: 'm3-chassis-basic', nav: 'm3-nav-basic', power: 'm3-power-basic', comms: 'm3-comms-basic', storage: 'm3-storage-basic', protection: 'm3-protection-basic', camera: 'm3-camera-balanced' },
      addons: [],
    },
  },
  {
    id: 'documenter',
    icon: '📸',
    name: L('Heritage Documenter'),
    tagline: L('Zoom stereo cameras, a close-up imager and a strong antenna. Solar powered.'),
    recommended: true,
    bars: { speed: 3, science: 4, power: 3, data: 3 },
    design: {
      selections: { launcher: 'm3-launcher-balanced', edl: 'm3-edl-balanced', chassis: 'm3-chassis-balanced', nav: 'm3-nav-balanced', power: 'm3-power-balanced', comms: 'm3-comms-balanced', storage: 'm3-storage-balanced', protection: 'm3-protection-balanced', camera: 'm3-camera-balanced' },
      addons: ['m3-inst-arm', 'm3-inst-closeup'],
    },
  },
  {
    id: 'dustproof',
    icon: '⚛',
    name: L('Dust-Proof Explorer'),
    tagline: L('Radioisotope power keeps working through dust storms — but a small antenna sends less data.'),
    bars: { speed: 3, science: 3, power: 5, data: 1 },
    design: {
      selections: { launcher: 'm3-launcher-balanced', edl: 'm3-edl-balanced', chassis: 'm3-chassis-balanced', nav: 'm3-nav-balanced', power: 'm3-power-advanced', comms: 'm3-comms-basic', storage: 'm3-storage-balanced', protection: 'm3-protection-balanced', camera: 'm3-camera-balanced' },
      addons: [],
    },
  },
];

const M4_PACKAGES: RoverPackage[] = [
  {
    id: 'snapshot',
    icon: '📷',
    name: L('Visible Snapshot'),
    tagline: L('Small, cheap telescope that sees visible light only.'),
    bars: { speed: 1, science: 1, power: 2, data: 1 },
    design: {
      selections: { launcher: 'm4-launcher-basic', platform: 'm4-bus-basic', optics: 'm4-optics-basic', camera: 'm4-sensor-basic', power: 'm4-power-basic', comms: 'm4-comms-basic', storage: 'm4-storage-basic', protection: 'm4-protection-basic' },
      addons: [],
    },
  },
  {
    id: 'uv-hunter',
    icon: '🔭',
    name: L('UV Hunter'),
    tagline: L('Bigger mirror, ultraviolet camera and a spectrograph to learn what the explosion is made of.'),
    recommended: true,
    bars: { speed: 3, science: 4, power: 3, data: 3 },
    design: {
      selections: { launcher: 'm4-launcher-balanced', platform: 'm4-bus-balanced', optics: 'm4-optics-balanced', camera: 'm4-sensor-balanced', power: 'm4-power-balanced', comms: 'm4-comms-balanced', storage: 'm4-storage-balanced', protection: 'm4-protection-balanced' },
      addons: ['m4-inst-spectro'],
    },
  },
  {
    id: 'infrared',
    icon: '🌡',
    name: L('Infrared Explorer'),
    tagline: L('Infrared camera with a cooler that needs lots of power, plus a spectrograph. Sees through dust.'),
    bars: { speed: 3, science: 4, power: 5, data: 3 },
    design: {
      selections: { launcher: 'm4-launcher-balanced', platform: 'm4-bus-balanced', optics: 'm4-optics-balanced', camera: 'm4-sensor-advanced', power: 'm4-power-advanced', comms: 'm4-comms-balanced', storage: 'm4-storage-balanced', protection: 'm4-protection-advanced' },
      addons: ['m4-inst-spectro'],
    },
  },
];

export const PACKAGES: Partial<Record<MissionId, RoverPackage[]>> = {
  'm1-apollo': M1_PACKAGES,
  'm2-martian-mystery': M2_PACKAGES,
  'm3-lost-rover': M3_PACKAGES,
  'm4-cosmic-photographer': M4_PACKAGES,
};

export const sameDesign = (a: Design, b: Design) =>
  Object.keys(b.selections).every((k) => a.selections[k] === b.selections[k]) && a.addons.length === b.addons.length && b.addons.every((x) => a.addons.includes(x));
