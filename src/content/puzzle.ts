import type { LText } from '../core/types';
import { L } from './l';

/** Mission Parts & Orbit Puzzle: virtual archive fragments (not real hardware drifting in orbit). */
export interface PuzzleBin {
  key: string;
  name: LText;
  story: LText;
}
export interface PuzzleClue {
  id: string;
  text: LText;
  answer: string;
  hint: LText;
}

export const PUZZLE_BINS: PuzzleBin[] = [
  { key: 'apollo15', name: L('Apollo 15 (1971)'), story: L('Apollo 15 carried the first Lunar Roving Vehicle, letting astronauts explore the Hadley–Apennine region far from their lunar module.') },
  { key: 'perseverance', name: L('Perseverance (2021–)'), story: L('Perseverance explores Jezero Crater, studying ancient lake sediments and caching rock samples.') },
  { key: 'opportunity', name: L('Opportunity (2004–2018)'), story: L('Solar-powered Opportunity was planned for about 90 sols and worked for almost 15 years, until a planet-wide dust storm in 2018.') },
  { key: 'telescope', name: L('Space telescopes'), story: L('Space telescopes rely on precise pointing, sensitive instruments and enough downlink to send their images home.') },
];

export const PUZZLE_CLUES: PuzzleClue[] = [
  { id: 'c-lrv', text: L('Lunar Roving Vehicle'), answer: 'apollo15', hint: L('This vehicle drove on a world with no air — and humans drove it.') },
  { id: 'c-hadley', text: L('Hadley–Apennine region'), answer: 'apollo15', hint: L('A region on the Moon, not on Mars.') },
  { id: 'c-jezero', text: L('Jezero Crater'), answer: 'perseverance', hint: L('An ancient Martian lake explored since 2021.') },
  { id: 'c-tubes', text: L('Sealed rock-sample tubes'), answer: 'perseverance', hint: L('Samples kept for a possible future return to Earth.') },
  { id: 'c-dust', text: L('Solar panels vs. a planet-wide dust storm'), answer: 'opportunity', hint: L('A 2018 storm blocked the sunlight this rover needed.') },
  { id: 'c-valley', text: L('Perseverance Valley'), answer: 'opportunity', hint: L('Careful: the valley was explored by a different, older rover than Perseverance.') },
  { id: 'c-pointing', text: L('Precision pointing system'), answer: 'telescope', hint: L('Needed to hold a faint target steady for long exposures.') },
  { id: 'c-wavelength', text: L('Observing wavelengths (UV, visible, infrared)'), answer: 'telescope', hint: L('Different light reveals different information about the same object.') },
];
