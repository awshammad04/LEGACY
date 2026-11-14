import type { MissionId, Tier } from '../core/types';
import type { Phase } from './controller';

/** Presentation only. Readiness, spacecraft design and destinations remain owned by the game. */
export interface LaunchIdentity {
  number: string;
  missionLabel: string;
  expedition: string;
  title: string;
  description: string;
  readiness: string;
  payload: 'crew' | 'rover' | 'observatory';
  captions: Record<Phase, string>;
}

const pioneerCaptions: Record<Phase, string> = {
  establish: 'Control to Pioneer. The rover is secured. We’re standing by for terminal count.',
  countdown: 'Pioneer, you are go for launch. Stand by for engine start.',
  ignition: 'Main engines are up. Hold the vehicle on the mount.',
  liftoff: 'Liftoff. Pioneer is clear of the tower and climbing.',
  ascent: 'Pioneer is climbing away from the range. Stand by for flight handoff.',
};

export const LAUNCH_MISSIONS: Record<MissionId, LaunchIdentity> = {
  'm1-apollo': {
    number: '01', missionLabel: 'MISSION 01', expedition: 'CREWED LUNAR EXPEDITION', title: 'Echoes of Apollo',
    description: 'Send your crew and lunar equipment toward the Moon.',
    readiness: 'Pioneer 01 · Readiness cleared', payload: 'crew',
    captions: {
      ...pioneerCaptions,
      establish: 'Control to Pioneer. Crew and lunar cargo are secured. Standing by for terminal count.',
      ascent: 'Pioneer is climbing toward Earth orbit. Next stop: the Moon.',
    },
  },
  'm2-martian-mystery': {
    number: '02', missionLabel: 'MISSION 02', expedition: 'ROBOTIC MARS EXPEDITION', title: 'The Martian Mystery',
    description: 'Send your rover to investigate Jezero Crater on Mars.',
    readiness: 'Pioneer 02 · Readiness cleared', payload: 'rover',
    captions: {
      ...pioneerCaptions,
      ascent: 'Pioneer is climbing toward Earth orbit. Next stop: Mars and Jezero Crater.',
    },
  },
  'm3-lost-rover': {
    number: '03', missionLabel: 'MISSION 03', expedition: 'ROBOTIC MARS EXPEDITION', title: 'The Lost Rover',
    description: 'Send an uncrewed expedition to document Opportunity’s final site on Mars.',
    readiness: 'Pioneer 03 · Readiness cleared', payload: 'rover', captions: pioneerCaptions,
  },
  'm4-cosmic-photographer': {
    number: '04', missionLabel: 'MISSION 04', expedition: 'ORBITAL OBSERVATORY', title: 'The Cosmic Photographer',
    description: 'Place your compact observatory in Earth orbit to capture a supernova.',
    readiness: 'Pioneer 04 · Readiness cleared', payload: 'observatory',
    captions: {
      ...pioneerCaptions,
      establish: 'Control to Pioneer. The observatory is secured. Standing by for terminal count.',
      ascent: 'Pioneer is climbing toward Earth orbit. Stand by for observatory handoff.',
    },
  },
};

/** Keep all of Mission 03's geometry unchanged; other missions adapt the payload fairing to the selected launcher. */
export function fairingScale(identity: LaunchIdentity, tier: Tier) {
  if (identity.number === '03') return 1;
  const width = tier === 'advanced' ? 1.04 : tier === 'balanced' ? 1 : 0.96;
  return width * (identity.payload === 'observatory' ? 0.86 : 1);
}
