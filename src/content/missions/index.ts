import type { MissionDefinition, MissionId } from '../../core/types';
import { M2 } from './m2';
import { M1 as M1_EARTH, M3 as M3_EARTH, M4 as M4_EARTH } from './previews';
import { M1_WORLD, M3_WORLD, M4_WORLD } from './worlds';

/** Every mission: Earth stage (quiz → briefing → workshop → launch) + its own playable operations. */
export const M1: MissionDefinition = { ...M1_EARTH, ...M1_WORLD, playable: true };
export const M3: MissionDefinition = { ...M3_EARTH, ...M3_WORLD, playable: true };
export const M4: MissionDefinition = { ...M4_EARTH, ...M4_WORLD, playable: true };
export { M2 };

export const MISSIONS: MissionDefinition[] = [M1, M2, M3, M4];

export const getMission = (id: MissionId): MissionDefinition => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
};

/** A mission can be started if it has any playable stages. */
export const isStartable = (m: MissionDefinition) => m.stages.length > 0;
