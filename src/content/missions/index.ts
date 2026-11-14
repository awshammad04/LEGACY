import type { MissionDefinition, MissionId } from '../../core/types';
import { M2 as M2_BASE } from './m2';
import { M1 as M1_EARTH, M3 as M3_EARTH, M4 as M4_EARTH } from './previews';
import { M1_WORLD, M3_WORLD, M4_WORLD } from './worlds';

/** Every mission: Earth stage (quiz → briefing → workshop → launch) + its own playable operations. */
const withInterior=(mission:MissionDefinition):MissionDefinition=>{
  const stages=[...mission.stages];stages.splice(stages.indexOf('launch')+1,0,'interior');return {...mission,stages};
};
export const M1 = withInterior({ ...M1_EARTH, ...M1_WORLD, playable: true });
export const M2 = withInterior(M2_BASE);
export const M3 = withInterior({ ...M3_EARTH, ...M3_WORLD, playable: true });
export const M4 = withInterior({ ...M4_EARTH, ...M4_WORLD, playable: true });

export const MISSIONS: MissionDefinition[] = [M1, M2, M3, M4];

export const getMission = (id: MissionId): MissionDefinition => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
};

/** A mission can be started if it has any playable stages. */
export const isStartable = (m: MissionDefinition) => m.stages.length > 0;
