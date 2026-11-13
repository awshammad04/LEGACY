import type { QuizOption, QuizQuestion, QuizResult } from './types';
import { hashString, seededShuffle } from './rng';

/** Shuffle answer options (keeping "I'm not sure" last) so the correct answer is not always in the same position. */
export function shuffledOptions(q: QuizQuestion, seed: number): QuizOption[] {
  const notSure = q.options.filter((o) => o.notSure);
  const rest = q.options.filter((o) => !o.notSure);
  return [...seededShuffle(rest, seed ^ hashString(q.id)), ...notSure];
}

/** Score answers. "I'm not sure" and unanswered both count as not correct — never as a penalty. */
export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, string>): QuizResult {
  const perConcept: Record<string, boolean> = {};
  let score = 0;
  for (const q of questions) {
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    const correct = !!chosen?.correct;
    perConcept[q.concept] = correct;
    if (correct) score++;
  }
  return { answers, score, total: questions.length, perConcept };
}

export interface QuizComparison {
  available: boolean;
  before?: number;
  after: number;
  total: number;
  improved: string[];
  needsPractice: string[];
  kept: string[];
}

/** Compare only measured answers. Never invent an improvement. */
export function compareQuizzes(pre: QuizResult | undefined, post: QuizResult): QuizComparison {
  if (!pre) {
    return { available: false, after: post.score, total: post.total, improved: [], needsPractice: Object.keys(post.perConcept).filter((c) => !post.perConcept[c]), kept: [] };
  }
  const improved: string[] = [];
  const needsPractice: string[] = [];
  const kept: string[] = [];
  for (const c of Object.keys(post.perConcept)) {
    const b = pre.perConcept[c];
    const a = post.perConcept[c];
    if (a && !b) improved.push(c);
    else if (a && b) kept.push(c);
    else needsPractice.push(c);
  }
  return { available: true, before: pre.score, after: post.score, total: post.total, improved, needsPractice, kept };
}
