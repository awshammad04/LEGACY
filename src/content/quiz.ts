import type { QuizQuestion } from '../core/types';
import { L } from './l';

/** Pre-mission baseline: exact wording from the LEGACY concept document. Answer key: B, B, B (shuffled in game). */
export const SHARED_PRE_QUIZ: QuizQuestion[] = [
  {
    id: 'pre-q1',
    concept: 'tradeoffs',
    conceptLabel: L('Engineering trade-offs'),
    linkedMoment: L('You will meet this in the Earth Build Workshop.'),
    prompt: L('Your new science camera produces better images, but it uses more power, adds mass, and costs more. What should you do before installing it?'),
    options: [
      { id: 'a', text: L('Choose it immediately because better images guarantee a better mission.') },
      { id: 'b', text: L('Check whether the complete design still satisfies mass, power, data, and budget limits.'), correct: true },
      { id: 'c', text: L('Ignore the extra resource demands because the spacecraft is already built.') },
      { id: 'd', text: L("I'm not sure."), notSure: true },
    ],
    explanation: L('A mission is a system: improving one component can create new limits elsewhere. Always re-check mass, power, data and budget together.'),
  },
  {
    id: 'pre-q2',
    concept: 'hazards',
    conceptLabel: L('Responsible hazard management'),
    linkedMoment: L('You will meet this when Mission Control sends a warning.'),
    prompt: L('Mission Control warns that a serious space-weather event may affect your spacecraft. What is the best first response?'),
    options: [
      { id: 'a', text: L('Ignore it to keep the science schedule unchanged.') },
      { id: 'b', text: L('Review the hazard plan, protect exposed crew or vulnerable equipment as applicable, and adjust operations.'), correct: true },
      { id: 'c', text: L('Increase activity so the mission finishes before the warning arrives.') },
      { id: 'd', text: L("I'm not sure."), notSure: true },
    ],
    explanation: L('Mission safety depends on planning, monitoring and adapting to alerts. The details differ for crewed and robotic missions.'),
  },
  {
    id: 'pre-q3',
    concept: 'evidence',
    conceptLabel: L('Evidence versus certainty'),
    linkedMoment: L('You will meet this when you analyze the rock.'),
    prompt: L('A Mars rover identifies a rock with a possible biosignature. What can scientists responsibly conclude?'),
    options: [
      { id: 'a', text: L('Life on Mars has been proven.') },
      { id: 'b', text: L('The observation is interesting, but further tests and evidence are needed.'), correct: true },
      { id: 'c', text: L('The rock is unimportant because it does not prove life immediately.') },
      { id: 'd', text: L("I'm not sure."), notSure: true },
    ],
    explanation: L('Observations can support a hypothesis without proving it. This is exactly how NASA describes the Cheyava Falls / Sapphire Canyon result.'),
  },
];

/** Post-mission check: different but equivalent questions on the same three concepts. */
export const SHARED_POST_QUIZ: QuizQuestion[] = [
  {
    id: 'post-q1',
    concept: 'tradeoffs',
    conceptLabel: L('Engineering trade-offs'),
    linkedMoment: L('Earth Build Workshop'),
    prompt: L("An additional instrument exceeds your spacecraft's available power. Which decision demonstrates good engineering?"),
    options: [
      { id: 'a', text: L('Install it anyway and hope the batteries cope.') },
      { id: 'b', text: L('Redesign or reprioritize equipment until the mission fits its constraints.'), correct: true },
      { id: 'c', text: L('Turn off the heaters permanently to free up power.') },
      { id: 'd', text: L("I'm not sure."), notSure: true },
    ],
    explanation: L('Good engineering keeps the whole system inside its limits — by redesigning, choosing a lighter option, or dropping a lower-priority instrument.'),
  },
  {
    id: 'post-q2',
    concept: 'hazards',
    conceptLabel: L('Responsible hazard management'),
    linkedMoment: L('Solar particle event warning'),
    prompt: L('Mission Control issues a hazard warning during a sensitive observation. What is the correct approach?'),
    options: [
      { id: 'a', text: L('Finish the observation as fast as possible before anything happens.') },
      { id: 'b', text: L('Follow the applicable hazard plan and adjust the operation rather than ignore the warning.'), correct: true },
      { id: 'c', text: L('Switch off communications so the warnings stop interrupting.') },
      { id: 'd', text: L("I'm not sure."), notSure: true },
    ],
    explanation: L('Warnings exist so the team can protect people and equipment. Adjusting the plan is a sign of good operations, not failure.'),
  },
  {
    id: 'post-q3',
    concept: 'evidence',
    conceptLabel: L('Evidence versus certainty'),
    linkedMoment: L('Science report'),
    prompt: L('A telescope image or rover measurement reveals an unexpected feature. Is one observation enough to claim a major discovery?'),
    options: [
      { id: 'a', text: L('Yes — an unexpected result is automatically a discovery.') },
      { id: 'b', text: L('Not necessarily; assess the uncertainty and obtain supporting observations.'), correct: true },
      { id: 'c', text: L('No — unexpected features are usually errors and should be ignored.') },
      { id: 'd', text: L("I'm not sure."), notSure: true },
    ],
    explanation: L('Extraordinary claims need independent lines of evidence. One observation is a starting point, not a conclusion.'),
  },
];
