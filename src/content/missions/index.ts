import type { MissionDefinition, MissionId } from '../../core/types';
import { L } from '../l';
import { M2 } from './m2';
import { SHARED_PRE_QUIZ, SHARED_POST_QUIZ } from '../quiz';

/** Missions 1, 3 and 4: honest briefing previews for the Nov 2026 demo (operations in development). */
const preview = (m: Pick<MissionDefinition, 'id' | 'number' | 'title' | 'subtitle' | 'type' | 'destination' | 'objective' | 'budgetCapM' | 'budgetRationale' | 'accent' | 'briefing'>): MissionDefinition => ({
  ...m,
  reserveMinM: 0,
  reserveRecommendedM: 0,
  playable: false,
  stages: [],
  slots: [],
  quizPre: SHARED_PRE_QUIZ,
  quizPost: SHARED_POST_QUIZ,
  hypotheses: [],
  landingSites: [],
  target: [0, 0],
  observations: [],
  statements: [],
  events: [],
  archive: [],
  learnCards: [],
  conjunctionSol: 0,
});

export const M1 = preview({
  id: 'm1-apollo',
  number: '01',
  title: L('Echoes of Apollo'),
  subtitle: L('The Lunar Rover Legacy'),
  type: 'crewed',
  destination: L('The Moon — Hadley–Apennine region'),
  objective: L('Design a crewed lunar expedition, protect your crew, and document Apollo 15 heritage without disturbing it.'),
  budgetCapM: 5000,
  budgetRationale: L('An illustrative new crewed lunar expedition — not the historical Apollo 15 budget. NASA reports about $25.4 billion for the entire Apollo program in historical dollars, which is a whole program, not one mission.'),
  accent: '#c9d4e8',
  briefing: {
    intro: L('A future scientific expedition is planned near the historic Apollo 15 landing region. Your crew must explore safely and treat historic hardware as heritage to observe and protect, not loot to collect.'),
    facts: [
      { text: L('Apollo 15 (1971) was the first mission to carry the Lunar Roving Vehicle, letting astronauts explore much farther from their lunar module.'), sourceId: 'nasa-apollo15' },
      { text: L('NASA has published recommendations for protecting historic lunar sites, including keep-out boundaries around Apollo hardware.'), sourceId: 'nasa-lunar-heritage' },
    ],
    references: [{ label: L('Apollo program (real, published)'), value: L('About $25.4 billion in historical dollars, for the whole program'), sourceId: 'nasa-brief-history' }],
  },
});

export const M3 = preview({
  id: 'm3-lost-rover',
  number: '03',
  title: L('The Lost Rover'),
  subtitle: L("Opportunity's Last Trail"),
  type: 'robotic',
  destination: L('Mars — Perseverance Valley, Endeavour Crater'),
  objective: L("Design a robotic documentation mission to revisit Opportunity's final area and honor its legacy without disturbing it."),
  budgetCapM: 1000,
  budgetRationale: L('A new, fictional robotic documentation mission. It does not reuse or claim to be the $820 million twin-rover Spirit + Opportunity program.'),
  accent: '#d9a066',
  briefing: {
    intro: L('"The Lost Rover" is a storytelling title: NASA knows where Opportunity last operated. Your mission documents its present condition and honors a rover planned for about 90 Martian days that worked for almost 15 years.'),
    facts: [
      { text: L('Opportunity last communicated on June 10, 2018, during a planet-wide dust storm. NASA declared the mission complete on February 13, 2019.'), sourceId: 'nasa-opportunity-end' },
    ],
    references: [{ label: L('Spirit + Opportunity program (real, published)'), value: L('About $820 million for both rovers together'), sourceId: 'jpl-mer-presskit' }],
  },
});

export const M4 = preview({
  id: 'm4-cosmic-photographer',
  number: '04',
  title: L('The Cosmic Photographer'),
  subtitle: L('Capture a rare cosmic event'),
  type: 'telescope',
  destination: L('Earth orbit — compact observatory'),
  objective: L('Build and launch a compact telescope, then plan observations of a supernova before the opportunity fades.'),
  budgetCapM: 300,
  budgetRationale: L('A new, compact orbiting observatory, loosely inspired by smaller missions such as Swift (about $250 million, historical) — not a Webb-class flagship (about $9.66 billion life-cycle estimate).'),
  accent: '#9b8cff',
  briefing: {
    intro: L('An alert reports a short-lived astronomical event. Different instruments and wavelengths reveal different information — and one observation alone cannot answer every question.'),
    facts: [
      { text: L('The James Webb Space Telescope orbits near the Sun–Earth L2 point — a good location for some observatories, not a universal one.'), sourceId: 'nasa-webb-l2' },
    ],
    references: [
      { label: L('Swift Observatory (real, published)'), value: L('About $250 million'), sourceId: 'gsfc-swift-faq' },
      { label: L('James Webb Space Telescope (real, published)'), value: L('$9.66 billion estimated life-cycle cost (2018 review)'), sourceId: 'nasa-webb-review-2018' },
    ],
  },
});

export const MISSIONS: MissionDefinition[] = [M1, M2, M3, M4];

export const getMission = (id: MissionId): MissionDefinition => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
};
