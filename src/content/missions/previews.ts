import type { ComponentOption, LText, MissionDefinition, QuizQuestion, Slot } from '../../core/types';
import { L } from '../l';
import { SHARED_POST_QUIZ, SHARED_PRE_QUIZ } from '../quiz';

/*
 * Missions 01, 03 and 04 — playable EARTH STAGE (quiz → briefing → workshop → review → launch),
 * then an honest "operations in development" screen. All component values are FICTIONAL,
 * game-balanced educational values — not NASA costs, masses or capacities.
 */

const tiers = (slot: string, list: Omit<ComponentOption, 'slot'>[]): ComponentOption[] => list.map((x) => ({ ...x, slot }));
const slot = (id: string, group: Slot['group'], name: LText, help: LText, options: Omit<ComponentOption, 'slot'>[], mandatory = true, multi = false): Slot => ({
  id, group, name, help, mandatory, multi, options: tiers(id, options),
});

/* ---------------- Heritage & observation quiz variants (same 3-question format) ---------------- */

const HERITAGE_PRE: QuizQuestion = {
  id: 'pre-q3-heritage',
  concept: 'evidence',
  conceptLabel: L('Protecting heritage and evidence'),
  linkedMoment: L('You will meet this when you reach historic hardware.'),
  prompt: L('Your rover reaches a historic spacecraft left on another world. What is the most responsible action?'),
  options: [
    { id: 'a', text: L('Take a small piece home for a museum.') },
    { id: 'b', text: L('Document it from a safe distance without touching or disturbing it.'), correct: true },
    { id: 'c', text: L('Drive right up to it for the best photos, even across its old tracks.') },
    { id: 'd', text: L("I'm not sure."), notSure: true },
  ],
  explanation: L('Historic sites hold scientific and cultural value. Observing from a distance keeps that value intact for everyone.'),
};
const HERITAGE_POST: QuizQuestion = {
  id: 'post-q3-heritage',
  concept: 'evidence',
  conceptLabel: L('Protecting heritage and evidence'),
  linkedMoment: L('Heritage documentation'),
  prompt: L("A future crew lands near historic Apollo hardware. Which plan best protects the site's scientific and historical value?"),
  options: [
    { id: 'a', text: L('Collect small items so they are not lost.') },
    { id: 'b', text: L('Observe and photograph from outside a protective boundary, avoiding old tracks.'), correct: true },
    { id: 'c', text: L('Move the hardware somewhere safer.') },
    { id: 'd', text: L("I'm not sure."), notSure: true },
  ],
  explanation: L('NASA has recommended keep-out boundaries around Apollo sites. Even footprints and rover tracks are part of the record.'),
};
const OBSERVATION_PRE: QuizQuestion = {
  id: 'pre-q3-observation',
  concept: 'evidence',
  conceptLabel: L('Evidence versus certainty'),
  linkedMoment: L('You will meet this when you observe the event.'),
  prompt: L('A telescope image shows a new bright point of light in a distant galaxy. What can astronomers responsibly conclude from this one image?'),
  options: [
    { id: 'a', text: L('It is definitely a new kind of star never seen before.') },
    { id: 'b', text: L('It deserves follow-up: more observations, at other times and wavelengths, are needed to identify it.'), correct: true },
    { id: 'c', text: L('It must be a camera error, so it can be ignored.') },
    { id: 'd', text: L("I'm not sure."), notSure: true },
  ],
  explanation: L('One image shows that something changed. Light curves and spectra from follow-up observations reveal what it is.'),
};

/* ================================ MISSION 01 ================================ */

export const M1: MissionDefinition = {
  id: 'm1-apollo',
  number: '01',
  title: L('Echoes of Apollo'),
  subtitle: L('The Lunar Rover Legacy'),
  type: 'crewed',
  destination: L('The Moon — Hadley–Apennine region'),
  objective: L('Design a crewed lunar expedition, protect your crew, and document Apollo 15 heritage without disturbing it.'),
  budgetCapM: 5000,
  reserveMinM: 400,
  reserveRecommendedM: 600,
  budgetRationale: L('An illustrative new crewed lunar expedition — not the historical Apollo 15 budget. NASA reports about $25.4 billion for the entire Apollo program in historical dollars, which is a whole program, not one mission.'),
  playable: false,
  accent: '#c9d4e8',
  model: 'lunar',
  dayWord: 'day',
  requiredCrewDays: 12,
  rules: ['mandatory', 'budget', 'launch-mass', 'landing-mass', 'power', 'battery', 'storage', 'downlink', 'thermal', 'dependencies'],
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'opsPreview'],
  priorityPrompt: L('What is your expedition\'s first priority?'),
  priorityHelp: L('Every priority changes what you should carry. Crew safety limits apply whatever you choose.'),
  slots: [
    slot('launcher', 'delivery', L('Launch vehicle'), L('Lifts the crew capsule, lander and surface cargo toward the Moon.'), [
      { id: 'm1-launcher-basic', tier: 'basic', name: L('Heavy-lift launcher'), description: L('Sends 40,000 kg toward the Moon.'), costM: 1250, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 40000 },
      { id: 'm1-launcher-balanced', tier: 'balanced', name: L('Heavy-lift launcher, upgraded upper stage'), description: L('Sends 44,000 kg toward the Moon.'), costM: 1450, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 44000 },
      { id: 'm1-launcher-advanced', tier: 'advanced', name: L('Super-heavy launcher'), description: L('Sends 50,000 kg toward the Moon.'), costM: 1750, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 50000 },
    ]),
    slot('crew', 'vehicle', L('Crew vehicle'), L('Carries the crew to lunar orbit and back. It stays in orbit while the lander goes down.'), [
      { id: 'm1-crew-basic', tier: 'basic', name: L('Crew capsule + service module'), description: L('Four seats, standard shielding.'), costM: 900, massKg: 24000, powerW: 0, thermal: 0, segment: 'orbiter', radiationHardness: 0.3 },
      { id: 'm1-crew-balanced', tier: 'balanced', name: L('Capsule with storm shelter'), description: L('Adds a shielded corner where the crew can wait out a solar storm.'), costM: 1050, massKg: 25000, powerW: 0, thermal: 0, segment: 'orbiter', radiationHardness: 0.6 },
      { id: 'm1-crew-advanced', tier: 'advanced', name: L('Capsule, storm shelter + extended service module'), description: L('More shielding and more propellant for abort options.'), costM: 1250, massKg: 26500, powerW: 0, thermal: 0, segment: 'orbiter', radiationHardness: 0.9 },
    ]),
    slot('edl', 'delivery', L('Crew lander'), L('Takes two astronauts and their surface cargo from lunar orbit to the surface and back.'), [
      { id: 'm1-lander-basic', tier: 'basic', name: L('Crew lander'), description: L('Carries up to 1,800 kg of surface cargo.'), costM: 700, massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 13000, landingCapacityKg: 1800, ellipseKm: 2 },
      { id: 'm1-lander-balanced', tier: 'balanced', name: L('Crew lander + cargo deck'), description: L('Carries up to 2,600 kg of surface cargo.'), costM: 850, massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 13800, landingCapacityKg: 2600, ellipseKm: 1 },
      { id: 'm1-lander-advanced', tier: 'advanced', name: L('Precision crew lander'), description: L('Carries up to 2,800 kg and lands with hazard avoidance.'), costM: 1000, massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 14000, landingCapacityKg: 2800, ellipseKm: 0.3 },
    ]),
    slot('chassis', 'vehicle', L('Surface mobility'), L('Apollo 15 was the first mission to carry a Lunar Roving Vehicle. A rover extends how far the crew can explore — but adds mass and power.'), [
      { id: 'm1-rover-basic', tier: 'basic', name: L('Foot traverses only'), description: L('No rover. The crew can only explore close to the lander.'), costM: 0, massKg: 0, powerW: 0, thermal: 0, drivePowerW: 0, maxSpeedMPerH: 0, slopeLimitDeg: 15, wheelDurability: 1 },
      { id: 'm1-rover-balanced', tier: 'balanced', name: L('Unpressurized lunar rover'), description: L('Two-seat rover inspired by the Apollo Lunar Roving Vehicle.'), costM: 180, massKg: 220, powerW: 0, thermal: 10, drivePowerW: 250, maxSpeedMPerH: 10000, slopeLimitDeg: 20, wheelDurability: 0.8, inspiredBy: { name: 'Apollo Lunar Roving Vehicle', sourceId: 'nasa-apollo15' } },
      { id: 'm1-rover-advanced', tier: 'advanced', name: L('Long-range lunar rover'), description: L('Bigger batteries and tougher wheels for longer traverses.'), costM: 300, massKg: 300, powerW: 0, thermal: 15, drivePowerW: 350, maxSpeedMPerH: 12000, slopeLimitDeg: 25, wheelDurability: 1 },
    ]),
    slot('life', 'protection', L('Crew life support & consumables'), L('Food, water, oxygen and air scrubbing for the whole expedition. The plan lasts 12 days, and safety rules add a 20% margin.'), [
      { id: 'm1-life-basic', tier: 'basic', name: L('10-day consumables'), description: L('Lightest option.'), costM: 200, massKg: 800, powerW: 0, thermal: 20, continuousW: 300, crewDays: 10 },
      { id: 'm1-life-balanced', tier: 'balanced', name: L('16-day consumables'), description: L('Covers the plan plus margin.'), costM: 280, massKg: 1000, powerW: 0, thermal: 25, continuousW: 300, crewDays: 16 },
      { id: 'm1-life-advanced', tier: 'advanced', name: L('20-day consumables with water recycling'), description: L('Largest safety margin; recycling adds power demand.'), costM: 380, massKg: 1050, powerW: 0, thermal: 25, continuousW: 350, crewDays: 20 },
    ]),
    slot('power', 'power', L('Surface power'), L('Life support never switches off, so power must cover it day and night.'), [
      { id: 'm1-power-basic', tier: 'basic', name: L('Small solar array + batteries'), description: L('9,000 Wh per day, 6,000 Wh battery.'), costM: 90, massKg: 300, powerW: 0, thermal: 10, generationWhPerSol: 9000, batteryWh: 6000, powerSource: 'solar' },
      { id: 'm1-power-balanced', tier: 'balanced', name: L('Large solar array + batteries'), description: L('12,000 Wh per day, 9,000 Wh battery.'), costM: 140, massKg: 380, powerW: 0, thermal: 12, generationWhPerSol: 12000, batteryWh: 9000, powerSource: 'solar' },
      { id: 'm1-power-advanced', tier: 'advanced', name: L('Fuel cells + solar array'), description: L('15,000 Wh per day, 12,000 Wh battery.'), costM: 220, massKg: 420, powerW: 0, thermal: 15, generationWhPerSol: 15000, batteryWh: 12000, powerSource: 'solar' },
    ]),
    slot('comms', 'comms', L('Communications'), L('The Moon is only about 1.3 light-seconds away, so the crew can talk with Mission Control almost live.'), [
      { id: 'm1-comms-basic', tier: 'basic', name: L('Direct-to-Earth S-band'), description: L('About 2,000 MB per day.'), costM: 60, massKg: 40, powerW: 30, thermal: 5, downlinkMbPerSol: 2000 },
      { id: 'm1-comms-balanced', tier: 'balanced', name: L('High-gain antenna + lunar relay'), description: L('About 8,000 MB per day.'), costM: 110, massKg: 60, powerW: 50, thermal: 8, downlinkMbPerSol: 8000 },
      { id: 'm1-comms-advanced', tier: 'advanced', name: L('Optical terminal + relay'), description: L('About 20,000 MB per day.'), costM: 170, massKg: 70, powerW: 60, thermal: 10, downlinkMbPerSol: 20000 },
    ]),
    slot('protection', 'protection', L('EVA suits, thermal & radiation protection'), L('Protects astronauts outside and inside the lander, from −170 °C shade to blazing sunlight and solar storms.'), [
      { id: 'm1-protection-basic', tier: 'basic', name: L('EVA suits + standard thermal control'), description: L('Basic radiation monitoring.'), costM: 150, massKg: 200, powerW: 0, thermal: 0, thermalCapacity: 150, heaterWhPerSol: 300, radiationHardness: 0.3 },
      { id: 'm1-protection-balanced', tier: 'balanced', name: L('Upgraded suits + radiation alerts'), description: L('Personal dosimeters and early warnings.'), costM: 220, massKg: 240, powerW: 0, thermal: 0, thermalCapacity: 220, heaterWhPerSol: 250, radiationHardness: 0.6 },
      { id: 'm1-protection-advanced', tier: 'advanced', name: L('Advanced suits, lander shelter & dosimetry'), description: L('Best protection during a solar particle event.'), costM: 300, massKg: 280, powerW: 0, thermal: 0, thermalCapacity: 300, heaterWhPerSol: 220, radiationHardness: 0.9 },
    ]),
    slot('camera', 'science', L('Documentation cameras'), L('Better cameras let the crew document heritage sites from farther away.'), [
      { id: 'm1-camera-basic', tier: 'basic', name: L('Handheld EVA cameras'), description: L('Good photos up close.'), costM: 15, massKg: 5, powerW: 10, thermal: 2, dataMb: 500, capabilities: ['context-imaging'] },
      { id: 'm1-camera-balanced', tier: 'balanced', name: L('Rover-mounted 4K cameras'), description: L('Video and zoom from the rover.'), costM: 40, massKg: 15, powerW: 30, thermal: 5, dataMb: 2000, capabilities: ['context-imaging', 'zoom-imaging'] },
      { id: 'm1-camera-advanced', tier: 'advanced', name: L('Long-lens heritage documentation camera'), description: L('Detailed images from outside protective boundaries.'), costM: 70, massKg: 25, powerW: 40, thermal: 8, dataMb: 5000, capabilities: ['context-imaging', 'zoom-imaging'], inspiredBy: { name: 'NASA recommendations for lunar historic sites', sourceId: 'nasa-lunar-heritage' } },
    ]),
    slot('storage', 'comms', L('Data storage'), L('Holds photos, video and science data until it can be sent home.'), [
      { id: 'm1-storage-basic', tier: 'basic', name: L('64 GB recorder'), description: L('64,000 MB.'), costM: 8, massKg: 2, powerW: 5, thermal: 1, storageMb: 64000 },
      { id: 'm1-storage-balanced', tier: 'balanced', name: L('256 GB recorder'), description: L('256,000 MB.'), costM: 15, massKg: 3, powerW: 6, thermal: 1, storageMb: 256000 },
      { id: 'm1-storage-advanced', tier: 'advanced', name: L('1 TB recorder'), description: L('1,000,000 MB.'), costM: 25, massKg: 4, powerW: 8, thermal: 2, storageMb: 1000000 },
    ]),
    slot('instruments', 'science', L('Science equipment'), L('Optional tools for lunar science.'), [
      { id: 'm1-inst-geology', name: L('Geology sampling tools'), description: L('Hammers, scoops, rakes and sample bags.'), costM: 40, massKg: 30, powerW: 0, thermal: 0, capabilities: ['sampling'] },
      { id: 'm1-inst-seismometer', name: L('Portable seismometer'), description: L('Listens for moonquakes and impacts.'), costM: 35, massKg: 20, powerW: 10, thermal: 2, dataMb: 300, capabilities: ['seismic'] },
      { id: 'm1-inst-drill', name: L('Core drill'), description: L('Collects layered soil cores.'), costM: 70, massKg: 60, powerW: 200, thermal: 20, dataMb: 100, capabilities: ['drill'] },
      { id: 'm1-inst-retro', name: L('New laser retroreflector'), description: L('A mirror array for measuring the Earth–Moon distance.'), costM: 20, massKg: 25, powerW: 0, thermal: 0, capabilities: ['ranging'] },
    ], false, true),
  ],
  quizPre: [SHARED_PRE_QUIZ[0], SHARED_PRE_QUIZ[1], HERITAGE_PRE],
  quizPost: [SHARED_POST_QUIZ[0], SHARED_POST_QUIZ[1], HERITAGE_POST],
  hypotheses: [
    { id: 'p-heritage', name: L('Document Apollo 15 heritage from a safe distance'), description: L('Photograph the historic hardware and rover tracks without disturbing them.') },
    { id: 'p-geology', name: L('Lunar geology traverse'), description: L('Collect samples along a route like the Apollo 15 crew did near Hadley Rille.') },
    { id: 'p-safety', name: L('Maximum crew safety margin'), description: L('Keep the most consumables, power and shelter in reserve.') },
  ],
  landingSites: [],
  target: [0, 0],
  observations: [],
  statements: [],
  events: [],
  archive: [],
  learnCards: [],
  conjunctionSol: 0,
  briefing: {
    intro: L('A future scientific expedition is planned near the historic Apollo 15 landing region. Your crew must explore safely and treat historic hardware as heritage to observe and protect, not loot to collect.'),
    facts: [
      { text: L('Apollo 15 (1971) was the first mission to carry the Lunar Roving Vehicle, letting astronauts explore much farther from their lunar module.'), sourceId: 'nasa-apollo15' },
      { text: L('NASA has published recommendations for protecting historic lunar sites, including keep-out boundaries around Apollo hardware.'), sourceId: 'nasa-lunar-heritage' },
    ],
    references: [{ label: L('Apollo program (real, published)'), value: L('About $25.4 billion in historical dollars, for the whole program'), sourceId: 'nasa-brief-history' }],
  },
  opsPreview: {
    title: L('Your crew is on the way to the Moon'),
    intro: L('Your design passed the readiness review and launched. The lunar operations stage for this mission is still in development, so the journey pauses here. This is what comes next, and it will use the design you just built:'),
    next: [
      L('The Space Highway: low Earth orbit, the transfer to the Moon, and lunar orbit.'),
      L('Crew Health dashboard: sleep, food, water, exercise, workload and simulated radiation exposure.'),
      L("A rover traverse that keeps a protective distance from Apollo 15 hardware, simplified from NASA's recommendations."),
      L('Crew decision: an astronaut tires during a spacewalk — shorten it, reorganize the tasks, or continue only within safety limits.'),
    ],
  },
};

/* ================================ MISSION 03 ================================ */

const c3 = (n: number) => Math.round(n * 1.3);

export const M3: MissionDefinition = {
  id: 'm3-lost-rover',
  number: '03',
  title: L('The Lost Rover'),
  subtitle: L("Opportunity's Last Trail"),
  type: 'robotic',
  destination: L('Mars — Perseverance Valley, Endeavour Crater'),
  objective: L("Design a robotic documentation mission to revisit Opportunity's final area and honor its legacy without disturbing it."),
  budgetCapM: 1000,
  reserveMinM: 60,
  reserveRecommendedM: 100,
  budgetRationale: L('A new, fictional robotic documentation mission. It does not reuse or claim to be the $820 million twin-rover Spirit + Opportunity program.'),
  playable: false,
  accent: '#d9a066',
  model: 'rover',
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'opsPreview'],
  priorityPrompt: L('Which inspection goal will your mission pursue?'),
  priorityHelp: L('Your goal decides which cameras and sensors matter most.'),
  slots: [
    slot('launcher', 'delivery', L('Launch vehicle'), L('Sends the cruise stage, landing system and rover toward Mars.'), [
      { id: 'm3-launcher-basic', tier: 'basic', name: L('Medium launcher'), description: L('Sends 1,800 kg toward Mars.'), costM: c3(180), massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 1800 },
      { id: 'm3-launcher-balanced', tier: 'balanced', name: L('Medium-plus launcher'), description: L('Sends 2,200 kg toward Mars.'), costM: c3(230), massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 2200 },
      { id: 'm3-launcher-advanced', tier: 'advanced', name: L('Heavy-lift launcher'), description: L('Sends 2,800 kg toward Mars.'), costM: c3(300), massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 2800 },
    ]),
    slot('edl', 'delivery', L('Cruise & landing system'), L('A smaller ellipse lands closer to Perseverance Valley.'), [
      { id: 'm3-edl-basic', tier: 'basic', name: L('Airbag landing'), description: L('Lands up to 250 kg inside a 30 km ellipse — the method Opportunity itself used in 2004.'), costM: c3(70), massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 1100, landingCapacityKg: 250, ellipseKm: 30, inspiredBy: { name: 'Mars Exploration Rover airbag landing', sourceId: 'nasa-opportunity' } },
      { id: 'm3-edl-balanced', tier: 'balanced', name: L('Airbags + guided entry'), description: L('Lands up to 320 kg inside a 15 km ellipse.'), costM: c3(95), massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 1250, landingCapacityKg: 320, ellipseKm: 15 },
      { id: 'm3-edl-advanced', tier: 'advanced', name: L('Retro-rocket landing platform'), description: L('Lands up to 450 kg inside an 8 km ellipse.'), costM: c3(130), massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 1500, landingCapacityKg: 450, ellipseKm: 8 },
    ]),
    slot('chassis', 'vehicle', L('Rover chassis & wheels'), L('Opportunity famously got stuck in a sand ripple in 2005. Traction and wheel strength matter.'), [
      { id: 'm3-chassis-basic', tier: 'basic', name: L('Micro-rover chassis'), description: L('Very light, slow, climbs 16° slopes.'), costM: c3(60), massKg: 90, powerW: 0, thermal: 5, maxSpeedMPerH: 40, slopeLimitDeg: 16, wheelDurability: 0.6, drivePowerW: 60 },
      { id: 'm3-chassis-balanced', tier: 'balanced', name: L('Six-wheel compact rover'), description: L('Rocker-bogie suspension, climbs 22° slopes.'), costM: c3(85), massKg: 140, powerW: 0, thermal: 6, maxSpeedMPerH: 60, slopeLimitDeg: 22, wheelDurability: 0.8, drivePowerW: 80 },
      { id: 'm3-chassis-advanced', tier: 'advanced', name: L('Reinforced six-wheel rover'), description: L('Wide wheels for sand, climbs 28° slopes.'), costM: c3(110), massKg: 185, powerW: 0, thermal: 8, maxSpeedMPerH: 80, slopeLimitDeg: 28, wheelDurability: 1, drivePowerW: 95 },
    ]),
    slot('nav', 'vehicle', L('Navigation & autonomy'), L('The rover must drive itself between commands sent minutes earlier.'), [
      { id: 'm3-nav-basic', tier: 'basic', name: L('Ground-planned driving'), description: L('Slow and cautious.'), costM: c3(30), massKg: 4, powerW: 8, thermal: 3, autonomy: 0.3 },
      { id: 'm3-nav-balanced', tier: 'balanced', name: L('Visual-odometry autonav'), description: L('Tracks its own motion with cameras.'), costM: c3(50), massKg: 6, powerW: 12, thermal: 5, autonomy: 0.65 },
      { id: 'm3-nav-advanced', tier: 'advanced', name: L('Advanced autonomous navigation'), description: L('Maps hazards while driving.'), costM: c3(75), massKg: 8, powerW: 20, thermal: 7, autonomy: 0.9 },
    ]),
    slot('power', 'power', L('Power system'), L('Opportunity was solar powered. A planet-wide dust storm in 2018 blocked the sunlight it needed.'), [
      { id: 'm3-power-basic', tier: 'basic', name: L('Solar panels + small battery'), description: L('1,050 Wh per sol in clear skies, 550 Wh battery.'), costM: c3(35), massKg: 25, powerW: 0, thermal: 0, generationWhPerSol: 1050, batteryWh: 550, powerSource: 'solar' },
      { id: 'm3-power-balanced', tier: 'balanced', name: L('Large solar panels + bigger battery'), description: L('1,400 Wh per sol in clear skies, 900 Wh battery.'), costM: c3(55), massKg: 35, powerW: 0, thermal: 0, generationWhPerSol: 1400, batteryWh: 900, powerSource: 'solar' },
      { id: 'm3-power-advanced', tier: 'advanced', name: L('Radioisotope power + battery'), description: L('1,500 Wh per sol, day or night, dust or not. Expensive.'), costM: c3(140), massKg: 45, powerW: 0, thermal: 15, generationWhPerSol: 1500, batteryWh: 900, powerSource: 'radioisotope', heaterSavingsWh: 150 },
    ]),
    slot('comms', 'comms', L('Communications'), L('Images of Opportunity are only useful once they reach Earth.'), [
      { id: 'm3-comms-basic', tier: 'basic', name: L('UHF relay radio'), description: L('About 60 MB per sol.'), costM: c3(20), massKg: 4, powerW: 10, thermal: 3, downlinkMbPerSol: 60 },
      { id: 'm3-comms-balanced', tier: 'balanced', name: L('Relay radio + small high-gain antenna'), description: L('About 150 MB per sol.'), costM: c3(35), massKg: 7, powerW: 18, thermal: 5, downlinkMbPerSol: 150 },
      { id: 'm3-comms-advanced', tier: 'advanced', name: L('High-gain antenna + priority relay'), description: L('About 300 MB per sol.'), costM: c3(55), massKg: 10, powerW: 25, thermal: 7, downlinkMbPerSol: 300 },
    ]),
    slot('storage', 'comms', L('Onboard data storage'), L('Holds documentation images until they can be sent.'), [
      { id: 'm3-storage-basic', tier: 'basic', name: L('0.5 GB recorder'), description: L('500 MB.'), costM: c3(5), massKg: 1, powerW: 2, thermal: 1, storageMb: 500 },
      { id: 'm3-storage-balanced', tier: 'balanced', name: L('2 GB recorder'), description: L('2,000 MB.'), costM: c3(10), massKg: 1, powerW: 3, thermal: 1, storageMb: 2000 },
      { id: 'm3-storage-advanced', tier: 'advanced', name: L('8 GB recorder'), description: L('8,000 MB.'), costM: c3(18), massKg: 2, powerW: 5, thermal: 2, storageMb: 8000 },
    ]),
    slot('protection', 'protection', L('Thermal & fault protection'), L('Martian nights are bitterly cold; heaters use energy every sol.'), [
      { id: 'm3-protection-basic', tier: 'basic', name: L('Standard thermal blanket'), description: L('40 heat units, 250 Wh of heating per sol.'), costM: c3(15), massKg: 10, powerW: 0, thermal: 0, thermalCapacity: 40, heaterWhPerSol: 250, radiationHardness: 0.3 },
      { id: 'm3-protection-balanced', tier: 'balanced', name: L('Heated electronics box'), description: L('60 heat units, 180 Wh of heating per sol.'), costM: c3(30), massKg: 14, powerW: 0, thermal: 0, thermalCapacity: 60, heaterWhPerSol: 180, radiationHardness: 0.6 },
      { id: 'm3-protection-advanced', tier: 'advanced', name: L('Insulated, radiation-tolerant avionics'), description: L('85 heat units, 140 Wh of heating per sol.'), costM: c3(50), massKg: 18, powerW: 0, thermal: 0, thermalCapacity: 85, heaterWhPerSol: 140, radiationHardness: 0.9 },
    ]),
    slot('camera', 'science', L('Documentation cameras'), L('The heart of a documentation mission.'), [
      { id: 'm3-camera-basic', tier: 'basic', name: L('Navigation & panorama cameras'), description: L('Wide views, limited detail.'), costM: c3(15), massKg: 3, powerW: 10, thermal: 4, dataMb: 40, capabilities: ['context-imaging'] },
      { id: 'm3-camera-balanced', tier: 'balanced', name: L('Stereo color documentation cameras'), description: L('3D color images with zoom.'), costM: c3(35), massKg: 5, powerW: 20, thermal: 7, dataMb: 120, capabilities: ['context-imaging', 'zoom-imaging'] },
      { id: 'm3-camera-advanced', tier: 'advanced', name: L('High-resolution 3D imaging mast'), description: L('Finest detail from a respectful distance.'), costM: c3(60), massKg: 8, powerW: 35, thermal: 12, dataMb: 300, capabilities: ['context-imaging', 'zoom-imaging'] },
    ]),
    slot('instruments', 'science', L('Additional instruments'), L('Optional tools for documentation and environment science.'), [
      { id: 'm3-inst-arm', name: L('Small robotic arm'), description: L('Positions close-up tools — never touching Opportunity itself.'), costM: c3(30), massKg: 15, powerW: 15, thermal: 2, capabilities: ['arm'] },
      { id: 'm3-inst-closeup', name: L('Close-up imager'), description: L('Microscope-like images of rocks and sand ripples.'), costM: c3(25), massKg: 2, powerW: 8, thermal: 3, dataMb: 60, capabilities: ['close-up'], requires: ['arm'] },
      { id: 'm3-inst-dust', name: L('Dust & weather sensor'), description: L('Measures how much dust settles on the panels.'), costM: c3(10), massKg: 2, powerW: 5, thermal: 1, dataMb: 5, capabilities: ['environment'] },
      { id: 'm3-inst-lidar', name: L('Laser 3D scanner'), description: L('Builds a 3D model of the site from a distance.'), costM: c3(40), massKg: 4, powerW: 20, thermal: 8, dataMb: 200, capabilities: ['3d-scan'] },
    ], false, true),
  ],
  quizPre: [SHARED_PRE_QUIZ[0], SHARED_PRE_QUIZ[1], HERITAGE_PRE],
  quizPost: [SHARED_POST_QUIZ[0], SHARED_POST_QUIZ[1], HERITAGE_POST],
  hypotheses: [
    { id: 'p-photo', name: L('High-resolution photography'), description: L('Detailed images of Opportunity and its surroundings.') },
    { id: 'p-environment', name: L('Environmental measurements'), description: L('How much dust covers the old rover and the ground around it.') },
    { id: 'p-survey', name: L('Broad heritage survey'), description: L('Map the area and its tracks from a respectful distance.') },
  ],
  landingSites: [],
  target: [0, 0],
  observations: [],
  statements: [],
  events: [],
  archive: [],
  learnCards: [],
  conjunctionSol: 0,
  briefing: {
    intro: L('"The Lost Rover" is a storytelling title: NASA knows where Opportunity last operated. Your mission documents its present condition and honors a rover planned for about 90 Martian days that worked for almost 15 years.'),
    facts: [{ text: L('Opportunity last communicated on June 10, 2018, during a planet-wide dust storm. NASA declared the mission complete on February 13, 2019.'), sourceId: 'nasa-opportunity-end' }],
    references: [{ label: L('Spirit + Opportunity program (real, published)'), value: L('About $820 million for both rovers together'), sourceId: 'jpl-mer-presskit' }],
  },
  opsPreview: {
    title: L('Your rover is cruising to Mars'),
    intro: L('Your design passed the readiness review and launched. The Mars operations stage for this mission is still in development, so the journey pauses here. This is what comes next, reusing the Mars systems from Mission 02:'),
    next: [
      L('An orbital clue puzzle to find a safe approach to Perseverance Valley.'),
      L('Drive across uneven terrain while managing traction, wheel health, temperature and communication windows.'),
      L('A Martian dust storm event that reduces solar power — the hazard that ended Opportunity\'s mission. It does not affect radioisotope power the same way.'),
      L('Document Opportunity from outside a keep-out zone, then unlock the story of its almost 15-year journey.'),
    ],
  },
};

/* ================================ MISSION 04 ================================ */

export const M4: MissionDefinition = {
  id: 'm4-cosmic-photographer',
  number: '04',
  title: L('The Cosmic Photographer'),
  subtitle: L('Capture a rare cosmic event'),
  type: 'telescope',
  destination: L('Earth orbit — compact observatory'),
  objective: L('Build and launch a compact telescope, then plan observations of a supernova before the opportunity fades.'),
  budgetCapM: 300,
  reserveMinM: 15,
  reserveRecommendedM: 30,
  budgetRationale: L('A new, compact orbiting observatory, loosely inspired by smaller missions such as Swift (about $250 million, historical) — not a Webb-class flagship (about $9.66 billion life-cycle estimate).'),
  playable: false,
  accent: '#9b8cff',
  model: 'telescope',
  dayWord: 'day',
  rules: ['mandatory', 'budget', 'launch-mass', 'power', 'battery', 'storage', 'downlink', 'thermal', 'dependencies'],
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'opsPreview'],
  priorityPrompt: L('What question should your observation answer first?'),
  priorityHelp: L('Different questions need different instruments, wavelengths and observing time.'),
  slots: [
    slot('launcher', 'delivery', L('Launch vehicle'), L('Small observatories can ride on small launchers — if they stay light.'), [
      { id: 'm4-launcher-basic', tier: 'basic', name: L('Small launcher'), description: L('Lifts 350 kg to orbit.'), costM: 28, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 350 },
      { id: 'm4-launcher-balanced', tier: 'balanced', name: L('Small-medium launcher'), description: L('Lifts 550 kg to orbit.'), costM: 40, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 550 },
      { id: 'm4-launcher-advanced', tier: 'advanced', name: L('Medium launcher'), description: L('Lifts 900 kg to orbit.'), costM: 62, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 900 },
    ]),
    slot('platform', 'vehicle', L('Spacecraft platform'), L('The bus that holds everything and keeps the telescope pointed steadily. Pointing runs all day.'), [
      { id: 'm4-bus-basic', tier: 'basic', name: L('Compact satellite bus'), description: L('Adequate pointing for bright targets.'), costM: 45, massKg: 120, powerW: 0, thermal: 6, continuousW: 20 },
      { id: 'm4-bus-balanced', tier: 'balanced', name: L('Stable-pointing bus'), description: L('Steadier pointing for longer exposures.'), costM: 70, massKg: 160, powerW: 0, thermal: 8, continuousW: 30 },
      { id: 'm4-bus-advanced', tier: 'advanced', name: L('Precision-pointing bus'), description: L('Very stable pointing for faint targets.'), costM: 95, massKg: 200, powerW: 0, thermal: 10, continuousW: 45 },
    ]),
    slot('optics', 'science', L('Telescope optics'), L('A bigger mirror collects more light — and adds mass and cost.'), [
      { id: 'm4-optics-basic', tier: 'basic', name: L('30 cm telescope'), description: L('Good for bright events.'), costM: 25, massKg: 40, powerW: 10, thermal: 4 },
      { id: 'm4-optics-balanced', tier: 'balanced', name: L('50 cm telescope'), description: L('About 2.8 times the light-collecting area of 30 cm.'), costM: 45, massKg: 75, powerW: 15, thermal: 6 },
      { id: 'm4-optics-advanced', tier: 'advanced', name: L('70 cm telescope'), description: L('About 5.4 times the light-collecting area of 30 cm.'), costM: 75, massKg: 130, powerW: 20, thermal: 8 },
    ]),
    slot('camera', 'science', L('Sensor & wavelength'), L('Different wavelengths reveal different information about the same event.'), [
      { id: 'm4-sensor-basic', tier: 'basic', name: L('Visible-light camera'), description: L('Brightness and color in visible light.'), costM: 12, massKg: 5, powerW: 15, thermal: 5, dataMb: 60, capabilities: ['visible'] },
      { id: 'm4-sensor-balanced', tier: 'balanced', name: L('Ultraviolet + visible camera'), description: L('UV reveals the hottest, youngest phases of an explosion.'), costM: 25, massKg: 7, powerW: 25, thermal: 8, dataMb: 120, capabilities: ['visible', 'uv'], inspiredBy: { name: 'Swift UV/Optical Telescope', sourceId: 'gsfc-swift-faq' } },
      { id: 'm4-sensor-advanced', tier: 'advanced', name: L('Infrared camera with cryocooler'), description: L('Sees through dust, but the cooler runs all day and makes heat.'), costM: 40, massKg: 15, powerW: 30, thermal: 20, dataMb: 200, capabilities: ['visible', 'infrared'], continuousW: 40 },
    ]),
    slot('power', 'power', L('Power system'), L('Pointing and cooling never stop, so the battery must carry the observatory through every orbital night.'), [
      { id: 'm4-power-basic', tier: 'basic', name: L('Body-mounted solar cells + battery'), description: L('2,000 Wh per day, 900 Wh battery.'), costM: 10, massKg: 15, powerW: 0, thermal: 0, generationWhPerSol: 2000, batteryWh: 900, powerSource: 'solar' },
      { id: 'm4-power-balanced', tier: 'balanced', name: L('Deployable solar wings + battery'), description: L('2,800 Wh per day, 1,400 Wh battery.'), costM: 18, massKg: 25, powerW: 0, thermal: 0, generationWhPerSol: 2800, batteryWh: 1400, powerSource: 'solar' },
      { id: 'm4-power-advanced', tier: 'advanced', name: L('Large solar wings + big battery'), description: L('3,600 Wh per day, 2,000 Wh battery.'), costM: 28, massKg: 35, powerW: 0, thermal: 0, generationWhPerSol: 3600, batteryWh: 2000, powerSource: 'solar' },
    ]),
    slot('comms', 'comms', L('Communications'), L('A transient event fades fast — data must come down quickly.'), [
      { id: 'm4-comms-basic', tier: 'basic', name: L('S-band radio'), description: L('About 400 MB per day.'), costM: 8, massKg: 3, powerW: 10, thermal: 3, downlinkMbPerSol: 400 },
      { id: 'm4-comms-balanced', tier: 'balanced', name: L('X-band radio'), description: L('About 1,500 MB per day.'), costM: 15, massKg: 5, powerW: 20, thermal: 5, downlinkMbPerSol: 1500 },
      { id: 'm4-comms-advanced', tier: 'advanced', name: L('Laser communication terminal'), description: L('About 5,000 MB per day.'), costM: 28, massKg: 6, powerW: 30, thermal: 7, downlinkMbPerSol: 5000 },
    ]),
    slot('storage', 'comms', L('Onboard data storage'), L('Holds images between ground-station passes.'), [
      { id: 'm4-storage-basic', tier: 'basic', name: L('4 GB recorder'), description: L('4,000 MB.'), costM: 3, massKg: 1, powerW: 3, thermal: 1, storageMb: 4000 },
      { id: 'm4-storage-balanced', tier: 'balanced', name: L('16 GB recorder'), description: L('16,000 MB.'), costM: 6, massKg: 1, powerW: 4, thermal: 1, storageMb: 16000 },
      { id: 'm4-storage-advanced', tier: 'advanced', name: L('64 GB recorder'), description: L('64,000 MB.'), costM: 10, massKg: 2, powerW: 5, thermal: 2, storageMb: 64000 },
    ]),
    slot('protection', 'protection', L('Thermal & radiation protection'), L('Keeps the detector cold and stable, and the electronics safe from radiation.'), [
      { id: 'm4-protection-basic', tier: 'basic', name: L('Passive thermal control'), description: L('40 heat units.'), costM: 6, massKg: 8, powerW: 0, thermal: 0, thermalCapacity: 40, heaterWhPerSol: 300, radiationHardness: 0.3 },
      { id: 'm4-protection-balanced', tier: 'balanced', name: L('Active thermal control + radiation-tolerant parts'), description: L('60 heat units.'), costM: 12, massKg: 10, powerW: 0, thermal: 0, thermalCapacity: 60, heaterWhPerSol: 220, radiationHardness: 0.6 },
      { id: 'm4-protection-advanced', tier: 'advanced', name: L('Radiation-hardened electronics + large radiators'), description: L('85 heat units.'), costM: 20, massKg: 12, powerW: 0, thermal: 0, thermalCapacity: 85, heaterWhPerSol: 200, radiationHardness: 0.9 },
    ]),
    slot('instruments', 'science', L('Additional instruments'), L('Optional add-ons.'), [
      { id: 'm4-inst-spectro', name: L('Low-resolution spectrograph'), description: L('Splits light into a spectrum to reveal elements and speeds.'), costM: 18, massKg: 12, powerW: 20, thermal: 6, dataMb: 150, capabilities: ['spectrum'] },
      { id: 'm4-inst-wide', name: L('Wide-field alert camera'), description: L('Watches a large patch of sky for sudden changes.'), costM: 10, massKg: 4, powerW: 8, thermal: 2, dataMb: 40, capabilities: ['wide-field'] },
      { id: 'm4-inst-slew', name: L('Fast-slew reaction wheels'), description: L('Turns toward a new target in minutes instead of an hour.'), costM: 14, massKg: 10, powerW: 15, thermal: 3, capabilities: ['fast-slew'] },
    ], false, true),
  ],
  quizPre: [SHARED_PRE_QUIZ[0], SHARED_PRE_QUIZ[1], OBSERVATION_PRE],
  quizPost: SHARED_POST_QUIZ,
  hypotheses: [
    { id: 'p-lightcurve', name: L('How does its brightness change over time?'), description: L('A light curve needs repeated observations.') },
    { id: 'p-spectrum', name: L('What is it made of, and how fast is it expanding?'), description: L('That needs a spectrum.') },
    { id: 'p-structure', name: L('Where exactly is it in its host galaxy?'), description: L('That needs sharp, high-resolution images.') },
  ],
  landingSites: [],
  target: [0, 0],
  observations: [],
  statements: [],
  events: [],
  archive: [],
  learnCards: [],
  conjunctionSol: 0,
  briefing: {
    intro: L('An alert reports a short-lived astronomical event. Different instruments and wavelengths reveal different information — and one observation alone cannot answer every question.'),
    facts: [{ text: L('The James Webb Space Telescope orbits near the Sun–Earth L2 point — a good location for some observatories, not a universal one.'), sourceId: 'nasa-webb-l2' }],
    references: [
      { label: L('Swift Observatory (real, published)'), value: L('About $250 million'), sourceId: 'gsfc-swift-faq' },
      { label: L('James Webb Space Telescope (real, published)'), value: L('$9.66 billion estimated life-cycle cost (2018 review)'), sourceId: 'nasa-webb-review-2018' },
    ],
  },
  opsPreview: {
    title: L('Your observatory has reached orbit'),
    intro: L('Your design passed the readiness review and launched. The observatory operations stage is still in development, so the mission pauses here. This is what comes next, and it will use the instruments you chose:'),
    next: [
      L('Commission the observatory: test pointing, power, instruments and downlink.'),
      L('Point, capture, transmit: choose exposure, wavelength and which data to keep with limited downlink.'),
      L('Compare your simulated observations with real NASA archival images of a supernova.'),
      L('Advanced mode: operate a virtual observatory near Sun–Earth L2 — a handover, not a new launch.'),
    ],
  },
};

