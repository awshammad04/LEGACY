import type { MissionDefinition, MissionId } from '../../core/types';
import { M2 } from './m2';
import { M1, M3, M4 } from './previews';

export { M1, M2, M3, M4 };

/** Mission 02 is fully playable; 01, 03 and 04 have a playable Earth stage with operations in development. */
export const MISSIONS: MissionDefinition[] = [M1, M2, M3, M4];

export const getMission = (id: MissionId): MissionDefinition => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
};

/** A mission can be started if it has any playable stages. */
export const isStartable = (m: MissionDefinition) => m.stages.length > 0;
