/**
 * LEGACY core types. This layer is pure TypeScript: no React, no Three.js, no DOM.
 * Everything the player decides is an Action; GameState = reduce(initial, actions).
 */

export type Lang = 'en' | 'ar';
export interface LText {
  en: string;
  ar?: string;
  /** Template variables: `{name}` placeholders in en/ar are replaced at display time. */
  vars?: Record<string, string | number | LText>;
}

/** Every displayed fact / number is one of these (spec: "Scientific Integrity"). */
export type Provenance = 'verified' | 'calculated' | 'fictional';

export type MissionId = 'm1-apollo' | 'm2-martian-mystery' | 'm3-lost-rover' | 'm4-cosmic-photographer';
export type MissionType = 'crewed' | 'robotic' | 'telescope';
export type Tier = 'basic' | 'balanced' | 'advanced';

export interface Source {
  id: string;
  title: string;
  credit: string;
  url: string;
  license: string;
  accessed: string;
}

export interface LearnCard {
  id: string;
  name: LText;
  what: LText;
  does: LText;
  why: LText;
  connection: LText;
  sourceId?: string;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Workshop                                                            */
/* ------------------------------------------------------------------ */

export interface ComponentOption {
  id: string;
  slot: string;
  tier?: Tier;
  name: LText;
  description: LText;
  costM: number;
  massKg: number;
  /** Average electrical draw while in use (W). */
  powerW: number;
  /** Heat load units (fictional game-balance scale). */
  thermal: number;
  /** Data produced per observation using this instrument (MB). */
  dataMb?: number;
  // Slot-specific stats (all fictional game-balance values)
  launchCapacityKg?: number;
  edlSystemMassKg?: number;
  landingCapacityKg?: number;
  ellipseKm?: number;
  maxSpeedMPerH?: number;
  slopeLimitDeg?: number;
  wheelDurability?: number;
  drivePowerW?: number;
  autonomy?: number;
  generationWhPerSol?: number;
  batteryWh?: number;
  powerSource?: 'solar' | 'radioisotope';
  heaterSavingsWh?: number;
  downlinkMbPerSol?: number;
  storageMb?: number;
  thermalCapacity?: number;
  heaterWhPerSol?: number;
  radiationHardness?: number;
  capabilities?: string[];
  requires?: string[];
  inspiredBy?: { name: string; sourceId: string };
  /** 'orbiter' parts fly but do not land (excluded from landing mass). */
  segment?: 'orbiter' | 'surface';
  /** Constant electrical load all day (life support, pointing, cryocooler). */
  continuousW?: number;
  /** Crew consumables endurance provided (crewed missions). */
  crewDays?: number;
}

export interface Slot {
  id: string;
  group: 'delivery' | 'vehicle' | 'power' | 'comms' | 'protection' | 'science';
  name: LText;
  help: LText;
  mandatory: boolean;
  /** multi = optional add-ons (instruments). */
  multi?: boolean;
  options: ComponentOption[];
}

export interface Design {
  /** slotId -> optionId for single-choice slots */
  selections: Record<string, string>;
  /** optionIds for multi slots */
  addons: string[];
}

export interface DesignMetrics {
  costM: number;
  budgetCapM: number;
  reserveMinM: number;
  reserveRecommendedM: number;
  reserveRemainingM: number;
  roverMassKg: number;
  launchStackMassKg: number;
  crewDays: number;
  launchCapacityKg: number;
  landingCapacityKg: number;
  generationWhPerSol: number;
  typicalSolDemandWh: number;
  nightDemandWh: number;
  batteryWh: number;
  storageMb: number;
  essentialDataMb: number;
  downlinkMbPerSol: number;
  heatLoad: number;
  thermalCapacity: number;
  capabilities: string[];
  ellipseKm: number;
  maxSpeedMPerH: number;
  slopeLimitDeg: number;
  wheelDurability: number;
  autonomy: number;
  drivePowerW: number;
  radiationHardness: number;
  powerSource: 'solar' | 'radioisotope' | 'none';
  housekeepingWh: number;
}

export interface RuleResult {
  id: string;
  pass: boolean;
  /** blocking rules prevent launch; warnings never block. */
  severity: 'blocking' | 'warning' | 'info';
  measured?: number;
  limit?: number;
  delta?: number;
  unit?: string;
  message: LText;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Quiz                                                                */
/* ------------------------------------------------------------------ */

export interface QuizOption {
  id: string;
  text: LText;
  correct?: boolean;
  notSure?: boolean;
}
export interface QuizQuestion {
  id: string;
  concept: 'tradeoffs' | 'hazards' | 'evidence';
  prompt: LText;
  options: QuizOption[];
  explanation: LText;
  conceptLabel: LText;
  linkedMoment: LText;
}
export interface QuizResult {
  answers: Record<string, string>;
  score: number;
  total: number;
  perConcept: Record<string, boolean>;
}

/* ------------------------------------------------------------------ */
/* Mission definition                                                  */
/* ------------------------------------------------------------------ */

export type StageId =
  | 'quizPre'
  | 'briefing'
  | 'workshop'
  | 'review'
  | 'launch'
  | 'orbit'
  | 'landingSite'
  | 'surface'
  | 'evidence'
  | 'report'
  | 'debrief'
  | 'quizPost'
  | 'results'
  | 'opsPreview';

export interface LandingSite {
  id: string;
  name: LText;
  description: LText;
  maxEllipseKm: number;
  /** start position on the surface map (world units) */
  start: [number, number];
  /** position on the orbital image (0..1, 0..1) */
  mapPos: [number, number];
}

export interface Hypothesis {
  id: string;
  name: LText;
  description: LText;
}

export interface ObservationDef {
  id: string;
  name: LText;
  description: LText;
  requires: string[];
  hours: number;
  energyWh: number;
  dataMb: number;
  /** finding text revealed when performed */
  finding: LText;
  /** finding text when instrument quality is low */
  findingLow?: LText;
  /** support per hypothesis: +1 supports, 0 neutral, -1 weakens */
  support: Record<string, number>;
  /** which capability's tier determines quality */
  qualityFrom?: string;
  enhancedBy?: string;
  learnCardId?: string;
}

export interface ReportStatement {
  id: string;
  text: LText;
  /** Observation ids (downlinked) that support it; empty + valid = always acceptable */
  requiresAny?: string[];
  requiresAll?: string[];
  kind: 'supported-claim' | 'caution' | 'overclaim' | 'dismissive';
  explanation: LText;
}

export interface MissionEventOption {
  id: string;
  label: LText;
  effects: LText;
  unsafe?: boolean;
}
export interface MissionEventDef {
  id: string;
  title: LText;
  from: LText;
  message: LText;
  cause: LText;
  concept: LText;
  options: MissionEventOption[];
}

export interface ArchiveEntry {
  id: string;
  missionId: MissionId;
  title: LText;
  story: LText;
  explanation: LText;
  applyQuestion: LText;
  image?: string;
  imageAlt?: LText;
  sourceId: string;
  provenance: Provenance;
}

export interface MissionDefinition {
  id: MissionId;
  number: string;
  title: LText;
  subtitle: LText;
  type: MissionType;
  destination: LText;
  objective: LText;
  budgetCapM: number;
  reserveMinM: number;
  reserveRecommendedM: number;
  budgetRationale: LText;
  playable: boolean;
  accent: string;
  stages: StageId[];
  slots: Slot[];
  quizPre: QuizQuestion[];
  quizPost: QuizQuestion[];
  hypotheses: Hypothesis[];
  landingSites: LandingSite[];
  target: [number, number];
  observations: ObservationDef[];
  statements: ReportStatement[];
  events: MissionEventDef[];
  archive: ArchiveEntry[];
  learnCards: LearnCard[];
  briefing: { intro: LText; facts: { text: LText; sourceId: string }[]; references: { label: LText; value: LText; sourceId: string }[] };
  conjunctionSol: number;
  /** Blocking readiness rules that apply to this mission (default: all Mars-rover rules). */
  rules?: string[];
  dayWord?: 'sol' | 'day';
  requiredCrewDays?: number;
  priorityPrompt?: LText;
  priorityHelp?: LText;
  /** Honest end screen for missions whose operations stage is still in development. */
  opsPreview?: { title: LText; intro: LText; next: LText[] };
  /** Open-world exploration sites (Mission 02). */
  sites?: ExploreSite[];
  /** Which 3D model the workshop shows. */
  model?: 'rover' | 'telescope' | 'lunar';
}

/* ------------------------------------------------------------------ */
/* Runtime state                                                       */
/* ------------------------------------------------------------------ */

export interface DecisionEntry {
  /** index into the action log that produced it */
  actionIndex: number;
  stage: StageId;
  title: LText;
  detail: LText;
  kind: 'design' | 'operation' | 'event' | 'science' | 'safety' | 'quiz';
  /** checkpoint entries can be rewound to */
  checkpoint?: boolean;
}

export interface DriveSegmentResult {
  from: [number, number];
  to: [number, number];
  distanceM: number;
  maxSlopeDeg: number;
  energyWh: number;
  hours: number;
  risk: number;
  blocked: boolean;
}

export interface RoutePrediction {
  segments: DriveSegmentResult[];
  distanceM: number;
  energyWh: number;
  hours: number;
  sols: number;
  risk: number;
  blocked: boolean;
  blockedReason?: 'slope';
  incidentSegment: number | null;
  endsAtTarget: boolean;
}

export interface OpsState {
  sol: number;
  batteryWh: number;
  batteryCapWh: number;
  wheelHealth: number;
  electronicsHealth: number;
  pos: [number, number];
  path: [number, number][];
  drives: number;
  arrived: boolean;
  opsReserveM: number;
  disabledCaps: string[];
  energyUsedWh: number;
  incidents: number;
  dataStoredMb: number;
  /** Open-world exploration */
  heading: number;
  distanceU: number;
  rests: number;
  bumps: number;
  sitesFound: string[];
  /** Solar output multiplier (dust on panels; a dust devil can clean them). */
  solarFactor: number;
  /** A dust storm reduces solar output until this sol. */
  dustUntil: number;
}

export interface ObservationResult {
  id: string;
  quality: 'none' | 'low' | 'good' | 'high';
  sol: number;
  site?: string;
}

export interface Outcome {
  scienceScore: number;
  reportScore: number;
  safetyIssues: number;
  solsUsed: number;
  energyMarginPct: number;
  observationsDone: number;
  downlinkedCount: number;
  tier: 'exemplary' | 'solid' | 'incomplete' | 'compromised';
  achievements: string[];
  beforeConjunction: boolean;
}

export interface MissionState {
  missionId: MissionId;
  seed: number;
  stage: StageId;
  quiz: { pre?: QuizResult; post?: QuizResult; preSkipped: boolean };
  sciencePriority?: string;
  design: Design;
  reviewAttempts: number;
  failedReviews: number;
  launched: boolean;
  orbit: { matched: string[]; mistakes: number; explored: string[] };
  landingSite?: string;
  ops: OpsState;
  events: Record<string, { choice?: string }>;
  pendingEvent?: string;
  evidence: {
    observations: ObservationResult[];
    alertShown: boolean;
    alertChoice?: 'announce' | 'gather' | 'cautious';
    downlinked: string[];
    report?: string[];
  };
  log: DecisionEntry[];
  flags: { unsafeChoices: string[]; overclaimed: boolean; notes: LText[] };
  archiveUnlocked: string[];
  outcome?: Outcome;
}

export type Action =
  | { type: 'ANSWER_PRE_QUIZ'; answers: Record<string, string> }
  | { type: 'SKIP_PRE_QUIZ' }
  | { type: 'SET_PRIORITY'; hypothesisId: string }
  | { type: 'ADVANCE'; to: StageId }
  | { type: 'SELECT_COMPONENT'; slot: string; optionId: string }
  | { type: 'TOGGLE_ADDON'; optionId: string }
  | { type: 'REQUEST_REVIEW' }
  | { type: 'CONFIRM_LAUNCH' }
  | { type: 'EXPLORE'; cardId: string }
  | { type: 'PUZZLE_MATCH'; clueId: string; missionKey: string }
  | { type: 'CHOOSE_LANDING_SITE'; siteId: string }
  | { type: 'EXECUTE_ROUTE'; waypoints: [number, number][]; speed: SpeedMode }
  | { type: 'EVENT_CHOICE'; eventId: string; optionId: string }
  | { type: 'RUN_OBSERVATION'; observationId: string }
  | { type: 'ALERT_CHOICE'; choice: 'announce' | 'gather' | 'cautious' }
  | { type: 'SET_DOWNLINK'; observationIds: string[] }
  | { type: 'SUBMIT_REPORT'; statementIds: string[] }
  | { type: 'ANSWER_POST_QUIZ'; answers: Record<string, string> }
  | { type: 'DRIVE'; dist: number; slopeAvg: number; boostFrac: number; bumps: number; pos: [number, number]; heading: number }
  | { type: 'REST' }
  | { type: 'DISCOVER'; siteId: string }
  | { type: 'INVESTIGATE'; siteId: string; observationId: string }
  | { type: 'SEND_REPORT'; conclusion: 'proven' | 'potential' | 'untested' | 'nothing' };

export type SpeedMode = 'cautious' | 'standard' | 'fast';

export interface ExploreSite {
  id: string;
  kind: 'rock' | 'layers' | 'weather' | 'depot';
  name: LText;
  hint: LText;
  pos: [number, number];
  radius: number;
  observations: string[];
}
