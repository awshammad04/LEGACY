import type { ComponentOption, MissionDefinition, Slot } from '../../core/types';
import { L } from '../l';
import { SHARED_PRE_QUIZ, SHARED_POST_QUIZ } from '../quiz';
import { M2_ARCHIVE } from '../archive';
import { M2_LEARN_CARDS } from '../learn';

/*
 * MISSION 02 — THE MARTIAN MYSTERY
 * All component prices, masses, power values and capacities below are FICTIONAL,
 * game-balanced educational values (provenance: 'fictional'). They are not NASA figures.
 */

const opt = (o: ComponentOption): ComponentOption => o;

const launcher: Slot = {
  id: 'launcher',
  group: 'delivery',
  name: L('Launch vehicle'),
  help: L('Lifts the whole stack (cruise stage, entry system and rover) onto a path to Mars. Bigger launchers carry more mass but cost more.'),
  mandatory: true,
  options: [
    opt({ id: 'launcher-basic', slot: 'launcher', tier: 'basic', name: L('Medium-lift launcher'), description: L('Affordable, but can send only 3,000 kg toward Mars.'), costM: 520, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 3000 }),
    opt({ id: 'launcher-balanced', slot: 'launcher', tier: 'balanced', name: L('Heavy-lift launcher'), description: L('Sends 3,600 kg toward Mars: enough for a sky-crane landing system and a capable rover.'), costM: 650, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 3600 }),
    opt({ id: 'launcher-advanced', slot: 'launcher', tier: 'advanced', name: L('Super-heavy launcher'), description: L('Sends 4,800 kg toward Mars. Huge margin, huge price.'), costM: 820, massKg: 0, powerW: 0, thermal: 0, launchCapacityKg: 4800 }),
  ],
};

const edl: Slot = {
  id: 'edl',
  group: 'delivery',
  name: L('Cruise & landing system'),
  help: L('Carries the rover to Mars and lands it. A more precise system lands inside a smaller target ellipse, so you can land closer to the rock.'),
  mandatory: true,
  options: [
    opt({ id: 'edl-basic', slot: 'edl', tier: 'basic', name: L('Airbag landing'), description: L('Light and cheap. Lands rovers up to 450 kg inside a 25 km ellipse.'), costM: 200, massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 1900, landingCapacityKg: 450, ellipseKm: 25 }),
    opt({ id: 'edl-balanced', slot: 'edl', tier: 'balanced', name: L('Sky-crane descent'), description: L('Lowers rovers up to 1,050 kg on cables inside a 12 km ellipse.'), costM: 300, massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 2600, landingCapacityKg: 1050, ellipseKm: 12 }),
    opt({ id: 'edl-advanced', slot: 'edl', tier: 'advanced', name: L('Sky-crane + terrain-relative navigation'), description: L('Compares camera views with maps during descent to land inside a 5 km ellipse.'), costM: 380, massKg: 0, powerW: 0, thermal: 0, edlSystemMassKg: 2650, landingCapacityKg: 1050, ellipseKm: 5 }),
  ],
};

const chassis: Slot = {
  id: 'chassis',
  group: 'vehicle',
  name: L('Rover chassis & wheels'),
  help: L('Sets how fast the rover drives, how steep a slope it can climb, and how well the wheels survive rough ground.'),
  mandatory: true,
  options: [
    opt({ id: 'chassis-basic', slot: 'chassis', tier: 'basic', name: L('Compact chassis'), description: L('Light (280 kg). Slow, climbs up to 18° slopes, thinner wheels.'), costM: 200, massKg: 280, powerW: 0, thermal: 10, maxSpeedMPerH: 60, slopeLimitDeg: 18, wheelDurability: 0.6, drivePowerW: 140 }),
    opt({ id: 'chassis-balanced', slot: 'chassis', tier: 'balanced', name: L('Rocker-bogie chassis'), description: L('Six wheels on a rocker-bogie suspension. Climbs 24° slopes.'), costM: 280, massKg: 420, powerW: 0, thermal: 12, maxSpeedMPerH: 90, slopeLimitDeg: 24, wheelDurability: 0.8, drivePowerW: 170 }),
    opt({ id: 'chassis-advanced', slot: 'chassis', tier: 'advanced', name: L('Reinforced rocker-bogie'), description: L('Tougher wheels and stronger motors. Climbs 30° slopes. Heaviest option.'), costM: 360, massKg: 520, powerW: 0, thermal: 15, maxSpeedMPerH: 120, slopeLimitDeg: 30, wheelDurability: 1.0, drivePowerW: 200 }),
  ],
};

const nav: Slot = {
  id: 'nav',
  group: 'vehicle',
  name: L('Navigation & autonomy'),
  help: L('Mars is minutes away by radio, so the rover must drive itself between commands. Better autonomy drives faster and avoids hazards.'),
  mandatory: true,
  options: [
    opt({ id: 'nav-basic', slot: 'nav', tier: 'basic', name: L('Ground-planned driving'), description: L('Follows the exact path planned on Earth. Slow and cautious.'), costM: 100, massKg: 8, powerW: 15, thermal: 5, autonomy: 0.3 }),
    opt({ id: 'nav-balanced', slot: 'nav', tier: 'balanced', name: L('Visual-odometry autonav'), description: L('Tracks its own motion with cameras and avoids obvious hazards.'), costM: 170, massKg: 12, powerW: 25, thermal: 8, autonomy: 0.65 }),
    opt({ id: 'nav-advanced', slot: 'nav', tier: 'advanced', name: L('Advanced autonomous navigation'), description: L('Maps terrain while driving and picks safe paths on its own.'), costM: 250, massKg: 16, powerW: 40, thermal: 12, autonomy: 0.9 }),
  ],
};

const power: Slot = {
  id: 'power',
  group: 'power',
  name: L('Power system'),
  help: L('Everything runs on electricity: heaters, computers, wheels and instruments. Solar output depends on sunlight; a radioisotope system gives steady power day and night.'),
  mandatory: true,
  options: [
    opt({ id: 'power-basic', slot: 'power', tier: 'basic', name: L('Solar arrays + small battery'), description: L('1,500 Wh per sol, 700 Wh battery. Cheap, but leaves little spare energy.'), costM: 110, massKg: 60, powerW: 0, thermal: 0, generationWhPerSol: 1500, batteryWh: 700, powerSource: 'solar' }),
    opt({ id: 'power-balanced', slot: 'power', tier: 'balanced', name: L('Large solar arrays + big battery'), description: L('2,000 Wh per sol, 1,600 Wh battery. Output falls if dust covers the panels.'), costM: 170, massKg: 95, powerW: 0, thermal: 0, generationWhPerSol: 2000, batteryWh: 1600, powerSource: 'solar' }),
    opt({ id: 'power-advanced', slot: 'power', tier: 'advanced', name: L('Radioisotope power system + battery'), description: L('2,600 Wh per sol, day and night. Its waste heat warms the rover, but adds heat load.'), costM: 290, massKg: 80, powerW: 0, thermal: 20, generationWhPerSol: 2600, batteryWh: 1600, powerSource: 'radioisotope', heaterSavingsWh: 200 }),
  ],
};

const comms: Slot = {
  id: 'comms',
  group: 'comms',
  name: L('Communications'),
  help: L('Sends data home directly or through orbiters. Faster downlink means more science reaches scientists on Earth.'),
  mandatory: true,
  options: [
    opt({ id: 'comms-basic', slot: 'comms', tier: 'basic', name: L('Low-gain antenna + relay radio'), description: L('About 80 MB per sol reaches Earth.'), costM: 70, massKg: 10, powerW: 15, thermal: 5, downlinkMbPerSol: 80 }),
    opt({ id: 'comms-balanced', slot: 'comms', tier: 'balanced', name: L('High-gain antenna + relay radio'), description: L('About 250 MB per sol reaches Earth.'), costM: 130, massKg: 20, powerW: 30, thermal: 10, downlinkMbPerSol: 250 }),
    opt({ id: 'comms-advanced', slot: 'comms', tier: 'advanced', name: L('Enhanced high-gain + priority relay'), description: L('About 600 MB per sol reaches Earth.'), costM: 190, massKg: 28, powerW: 45, thermal: 15, downlinkMbPerSol: 600 }),
  ],
};

const storage: Slot = {
  id: 'storage',
  group: 'comms',
  name: L('Onboard data storage'),
  help: L('Holds images and measurements until they can be sent home.'),
  mandatory: true,
  options: [
    opt({ id: 'storage-basic', slot: 'storage', tier: 'basic', name: L('1 GB recorder'), description: L('1,000 MB of storage.'), costM: 15, massKg: 1, powerW: 3, thermal: 1, storageMb: 1000 }),
    opt({ id: 'storage-balanced', slot: 'storage', tier: 'balanced', name: L('4 GB recorder'), description: L('4,000 MB of storage.'), costM: 30, massKg: 2, powerW: 5, thermal: 2, storageMb: 4000 }),
    opt({ id: 'storage-advanced', slot: 'storage', tier: 'advanced', name: L('16 GB recorder'), description: L('16,000 MB of storage.'), costM: 50, massKg: 3, powerW: 8, thermal: 3, storageMb: 16000 }),
  ],
};

const protection: Slot = {
  id: 'protection',
  group: 'protection',
  name: L('Thermal & fault protection'),
  help: L('Keeps electronics warm through −80 °C nights, removes heat from busy instruments and protects against radiation upsets.'),
  mandatory: true,
  options: [
    opt({ id: 'protection-basic', slot: 'protection', tier: 'basic', name: L('Standard thermal blanket'), description: L('Handles 70 heat units. Needs 500 Wh of heating per sol. Limited radiation tolerance.'), costM: 50, massKg: 25, powerW: 0, thermal: 0, thermalCapacity: 70, heaterWhPerSol: 500, radiationHardness: 0.3 }),
    opt({ id: 'protection-balanced', slot: 'protection', tier: 'balanced', name: L('Heated enclosure + fault protection'), description: L('Handles 105 heat units. 380 Wh of heating per sol. Better radiation tolerance.'), costM: 100, massKg: 35, powerW: 0, thermal: 0, thermalCapacity: 105, heaterWhPerSol: 380, radiationHardness: 0.6 }),
    opt({ id: 'protection-advanced', slot: 'protection', tier: 'advanced', name: L('Redundant, radiation-hardened avionics'), description: L('Handles 150 heat units. 300 Wh of heating per sol. Best radiation tolerance.'), costM: 160, massKg: 45, powerW: 0, thermal: 0, thermalCapacity: 150, heaterWhPerSol: 300, radiationHardness: 0.9 }),
  ],
};

// Camera values follow the illustrative table in the LEGACY concept document.
const camera: Slot = {
  id: 'camera',
  group: 'science',
  name: L('Science camera'),
  help: L('Every rover needs eyes. Better cameras see finer detail but use more power and produce more data.'),
  mandatory: true,
  options: [
    opt({ id: 'camera-basic', slot: 'camera', tier: 'basic', name: L('Basic panoramic camera'), description: L('Broad visual context, limited detail.'), costM: 20, massKg: 3, powerW: 12, thermal: 5, dataMb: 40, capabilities: ['context-imaging'] }),
    opt({ id: 'camera-balanced', slot: 'camera', tier: 'balanced', name: L('Balanced scientific imager'), description: L('Zoom lenses for close detail. Moderate data demand.'), costM: 55, massKg: 7, powerW: 28, thermal: 10, dataMb: 120, capabilities: ['context-imaging', 'zoom-imaging'], inspiredBy: { name: 'Mastcam-Z', sourceId: 'nasa-perseverance-instruments' } }),
    opt({ id: 'camera-advanced', slot: 'camera', tier: 'advanced', name: L('Advanced imaging package'), description: L('Highest detail. Heavy data and storage burden.'), costM: 105, massKg: 13, powerW: 58, thermal: 18, dataMb: 300, capabilities: ['context-imaging', 'zoom-imaging'], inspiredBy: { name: 'Mastcam-Z + WATSON', sourceId: 'nasa-perseverance-instruments' } }),
  ],
};

const instruments: Slot = {
  id: 'instruments',
  group: 'science',
  name: L('Additional instruments'),
  help: L('Optional tools. Each answers different questions, so choose the ones that test your hypotheses. Contact instruments need a robotic arm.'),
  mandatory: false,
  multi: true,
  options: [
    opt({ id: 'inst-arm', slot: 'instruments', name: L('Robotic arm'), description: L('Places contact instruments and tools against rock.'), costM: 80, massKg: 45, powerW: 30, thermal: 5, capabilities: ['arm'] }),
    opt({ id: 'inst-abrasion', slot: 'instruments', name: L('Abrasion & coring drill'), description: L('Grinds off dust to expose fresh rock and seals rock cores in sample tubes.'), costM: 90, massKg: 30, powerW: 80, thermal: 15, dataMb: 20, capabilities: ['abrasion', 'sample-cache'], requires: ['arm'], inspiredBy: { name: 'Perseverance coring drill & sample caching system', sourceId: 'nasa-perseverance' } }),
    opt({ id: 'inst-xrf', slot: 'instruments', name: L('X-ray chemistry spectrometer'), description: L('Maps which chemical elements are in the rock, down to grain size.'), costM: 110, massKg: 7, powerW: 25, thermal: 10, dataMb: 150, capabilities: ['elemental-chemistry'], requires: ['arm'], inspiredBy: { name: 'PIXL', sourceId: 'nasa-perseverance-instruments' } }),
    opt({ id: 'inst-raman', slot: 'instruments', name: L('UV Raman organics & mineral spectrometer'), description: L('Detects organic compounds and identifies minerals with an ultraviolet laser.'), costM: 130, massKg: 5, powerW: 50, thermal: 20, dataMb: 200, capabilities: ['organics', 'mineralogy'], requires: ['arm'], inspiredBy: { name: 'SHERLOC', sourceId: 'nasa-perseverance-instruments' } }),
    opt({ id: 'inst-radar', slot: 'instruments', name: L('Ground-penetrating radar'), description: L('Sees rock layers beneath the surface.'), costM: 50, massKg: 3, powerW: 10, thermal: 5, dataMb: 100, capabilities: ['subsurface'], inspiredBy: { name: 'RIMFAX', sourceId: 'nasa-perseverance-instruments' } }),
    opt({ id: 'inst-weather', slot: 'instruments', name: L('Weather station'), description: L('Measures temperature, wind, pressure and dust.'), costM: 30, massKg: 5, powerW: 10, thermal: 2, dataMb: 5, capabilities: ['environment'], inspiredBy: { name: 'MEDA', sourceId: 'nasa-perseverance-instruments' } }),
  ],
};

export const M2: MissionDefinition = {
  id: 'm2-martian-mystery',
  number: '02',
  title: L('The Martian Mystery'),
  subtitle: L('Choose the right tools to investigate an unusual rock in Jezero Crater.'),
  type: 'robotic',
  destination: L('Mars — Jezero Crater'),
  objective: L('Design a rover, reach a rock with "leopard spots", and report what the evidence can and cannot show.'),
  budgetCapM: 2700,
  reserveMinM: 150,
  reserveRecommendedM: 200,
  budgetRationale: L(
    'NASA/JPL published about $2.7 billion for Mars 2020 / Perseverance (about $2.4 billion to build and launch, plus about $300 million for landing and prime operations). LEGACY uses the same order of magnitude for an imaginary new rover. Every component price in the workshop is a fictional, simplified game value — not a NASA cost.',
  ),
  playable: true,
  accent: '#e07a4a',
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'orbit', 'landingSite', 'surface', 'evidence', 'report', 'debrief', 'quizPost', 'results'],
  slots: [launcher, edl, chassis, nav, power, comms, storage, protection, camera, instruments],
  quizPre: SHARED_PRE_QUIZ,
  quizPost: SHARED_POST_QUIZ,
  hypotheses: [
    { id: 'h-bio', name: L('Ancient microbial activity'), description: L('The spots formed through chemical reactions involving organic matter, possibly driven by microbes. If so, they would be a potential biosignature.') },
    { id: 'h-abiotic', name: L('Non-biological chemistry'), description: L('The same minerals formed through chemical reactions that need no life at all.') },
    { id: 'h-alteration', name: L('Later groundwater alteration'), description: L('Water seeping through the rock long after it formed created the spots, unrelated to organic matter.') },
  ],
  landingSites: [
    { id: 'site-delta', name: L('Delta Front'), description: L('Right beside the river valley that holds the rock. Needs a 5 km landing ellipse.'), maxEllipseKm: 5, start: [-60, -170], mapPos: [0.56, 0.36] },
    { id: 'site-floor', name: L('Crater Floor Plains'), description: L('Flat, safe ground a medium drive away. Needs a 12 km ellipse or better.'), maxEllipseKm: 12, start: [-210, 60], mapPos: [0.42, 0.58] },
    { id: 'site-plains', name: L('Outer Safe Plains'), description: L('The safest, widest landing zone — and the longest drive. Any landing system can reach it.'), maxEllipseKm: 25, start: [-290, 260], mapPos: [0.3, 0.78] },
  ],
  target: [70, -250],
  conjunctionSol: 24,
  observations: [
    {
      id: 'obs-context', name: L('Panoramic context imaging'), description: L('Photograph the rock and its surroundings.'), requires: ['context-imaging'], hours: 1, energyWh: 40, dataMb: 0, qualityFrom: 'camera',
      finding: L('A reddish mudstone covered in small pale spots with dark rims ("leopard spots") and tiny dark specks ("poppy seeds"). White calcium-sulfate veins cross the rock — a sign that water once flowed through it.'),
      findingLow: L('A reddish rock with pale spots and white veins. The basic camera cannot resolve the spot texture.'),
      support: { 'h-bio': 0, 'h-abiotic': 0, 'h-alteration': 0 }, learnCardId: 'lc-mastcam',
    },
    {
      id: 'obs-zoom', name: L('Close-up zoom imaging'), description: L('Zoom in on the spot rims and cores.'), requires: ['zoom-imaging'], hours: 1.5, energyWh: 40, dataMb: 0, qualityFrom: 'camera',
      finding: L('Each spot has a light core and a dark rim — the pattern of a chemical reaction front moving through sediment.'),
      support: { 'h-bio': 0.5, 'h-abiotic': 0.5, 'h-alteration': 0 },
    },
    {
      id: 'obs-abrasion', name: L('Abrade the rock surface'), description: L('Grind away the dusty outer layer before contact measurements.'), requires: ['abrasion'], hours: 2, energyWh: 60, dataMb: 0,
      finding: L('A fresh, clean patch of rock is exposed. Contact instruments will now measure the rock itself rather than surface dust.'),
      support: { 'h-bio': 0, 'h-abiotic': 0, 'h-alteration': 0 },
    },
    {
      id: 'obs-xrf', name: L('X-ray chemistry map'), description: L('Map the elements in the spots and the rock around them.'), requires: ['elemental-chemistry', 'arm'], hours: 3, energyWh: 60, dataMb: 0, enhancedBy: 'obs-abrasion',
      finding: L('The dark rims are rich in iron and phosphorus (consistent with vivianite, an iron phosphate) and in iron and sulfur (consistent with greigite, an iron sulfide). On Earth these minerals often form where sediment reacts with organic matter.'),
      findingLow: L('Iron enrichment is detected in the rims, but surface dust blurs the chemistry. Abrading first would sharpen the result.'),
      support: { 'h-bio': 1, 'h-abiotic': 0.5, 'h-alteration': -1 }, learnCardId: 'lc-pixl',
    },
    {
      id: 'obs-raman', name: L('UV Raman organics scan'), description: L('Search for organic compounds and identify minerals.'), requires: ['organics', 'arm'], hours: 3, energyWh: 60, dataMb: 0, enhancedBy: 'obs-abrasion',
      finding: L('A signal consistent with organic compounds is detected in the rock. Organic molecules can come from life — but they can also form without it.'),
      findingLow: L('A weak, uncertain organic signal. Dust and surface weathering make it hard to interpret. Abrading first would help.'),
      support: { 'h-bio': 1, 'h-abiotic': 0, 'h-alteration': -0.5 }, learnCardId: 'lc-sherloc',
    },
    {
      id: 'obs-radar', name: L('Subsurface radar sounding'), description: L('Look at the rock layers beneath the rover.'), requires: ['subsurface'], hours: 1, energyWh: 30, dataMb: 0,
      finding: L('Layered sediments lie beneath the surface, consistent with deposits laid down by an ancient river. Good habitability context, but it cannot test the spots.'),
      support: { 'h-bio': 0, 'h-abiotic': 0, 'h-alteration': 0 }, learnCardId: 'lc-rimfax',
    },
    {
      id: 'obs-weather', name: L('Environmental readings'), description: L('Record temperature, wind and dust.'), requires: ['environment'], hours: 0.5, energyWh: 10, dataMb: 0,
      finding: L('Useful context about today\'s weather — but it cannot test any hypothesis about how the rock formed billions of years ago.'),
      support: { 'h-bio': 0, 'h-abiotic': 0, 'h-alteration': 0 },
    },
    {
      id: 'obs-cache', name: L('Core and cache a sample'), description: L('Drill a core and seal it in a tube for possible future return to Earth.'), requires: ['sample-cache', 'arm'], hours: 3, energyWh: 120, dataMb: 10,
      finding: L('A rock core is sealed in a sample tube. Laboratories on Earth could one day test it with instruments far too large to fly to Mars.'),
      support: { 'h-bio': 0, 'h-abiotic': 0, 'h-alteration': 0 }, learnCardId: 'lc-caching',
    },
  ],
  statements: [
    { id: 'st-proven', kind: 'overclaim', text: L('Life on Mars has been proven.'), explanation: L('No single rover measurement can prove life. Even NASA\'s real Sapphire Canyon result is described as a potential biosignature.') },
    { id: 'st-potential', kind: 'supported-claim', requiresAny: ['obs-xrf', 'obs-raman'], text: L('The rock shows a potential biosignature that deserves further study.'), explanation: L('Supported only if chemistry or organics data actually reached Earth.') },
    { id: 'st-abiotic', kind: 'caution', text: L('Non-biological chemistry could also produce these features and cannot yet be ruled out.'), explanation: L('Listing alternative explanations is what careful scientists do.') },
    { id: 'st-minerals', kind: 'supported-claim', requiresAll: ['obs-xrf'], text: L('Iron-phosphate and iron-sulfide minerals are concentrated in the dark spot rims.'), explanation: L('Needs X-ray chemistry data on Earth.') },
    { id: 'st-organics', kind: 'supported-claim', requiresAll: ['obs-raman'], text: L('Signals consistent with organic compounds are present in the rock.'), explanation: L('Needs organics-scan data on Earth.') },
    { id: 'st-water', kind: 'supported-claim', requiresAny: ['obs-context', 'obs-radar'], text: L('Water once moved through these sediments.'), explanation: L('Supported by the mineral veins in context images or by layered sediments seen by radar.') },
    { id: 'st-sample', kind: 'supported-claim', requiresAll: ['obs-cache'], text: L('A sample is cached so laboratories on Earth could test it in the future.'), explanation: L('Only true if you actually cored and cached a sample.') },
    { id: 'st-unimportant', kind: 'dismissive', text: L('The rock is unimportant because it does not prove life.'), explanation: L('Evidence can be valuable without being proof. Dismissing it is as unscientific as overclaiming.') },
    { id: 'st-next', kind: 'caution', text: L('Confirming or ruling out a biological origin needs more evidence, such as laboratory analysis of returned samples.'), explanation: L('This matches how NASA scientists describe the real result.') },
  ],
  events: [
    {
      id: 'ev-power',
      title: L('Power anomaly'),
      from: L('Mission Control — Power Systems'),
      message: L('Battery telemetry shows a cell imbalance. Usable battery capacity has dropped. How should we respond?'),
      cause: L('Battery cells age unevenly. One weak cell limits how deeply the whole battery can be discharged.'),
      concept: L('Engineers protect mission-critical functions first: power for heaters, computers and communication comes before optional science.'),
      options: [
        { id: 'shed', label: L('Shed non-essential loads'), effects: L('Battery capacity −10%. Weather station and radar are switched off for the rest of the mission.') },
        { id: 'reserve', label: L('Spend $40M of the protected reserve on an engineering fix'), effects: L('Engineers upload new battery-management software. Capacity −3%, costs 1 sol.') },
        { id: 'accept', label: L('Accept the reduced capacity'), effects: L('Battery capacity −20%. All instruments stay on, but each sol supports less work.') },
      ],
    },
    {
      id: 'ev-solar',
      title: L('Solar particle event warning'),
      from: L('Mission Control — Space Weather'),
      message: L('Solar activity has increased. A burst of energetic particles is heading for Mars. Review radiation precautions before sensitive instrument work.'),
      cause: L('Eruptions on the Sun can release energetic particles that cause errors or damage in electronics. This is a radiation hazard — it is not the same as a Martian dust storm.'),
      concept: L('Safety comes from planning, monitoring and adapting to alerts — not from racing to finish before the hazard arrives.'),
      options: [
        { id: 'safe', label: L('Enter safe mode until it passes'), effects: L('Costs 1 sol. Electronics stay protected.') },
        { id: 'replan', label: L('Postpone sensitive work, do low-power tasks only'), effects: L('Costs half a sol. Small exposure for the electronics.') },
        { id: 'ignore', label: L('Ignore the warning and keep the full schedule'), effects: L('No delay, but electronics are exposed. Treated as a safety violation.'), unsafe: true },
      ],
    },
  ],
  archive: M2_ARCHIVE,
  learnCards: M2_LEARN_CARDS,
  briefing: {
    intro: L('Commander, an unusual rock has been reported in an ancient river valley in Jezero Crater. Its surface is covered in strange spots. Before you choose a single instrument, decide which question matters most. Then build a rover that can answer it — within budget.'),
    facts: [
      { text: L('NASA\'s Perseverance rover landed in Jezero Crater on February 18, 2021. The crater once held a lake fed by a river delta.'), sourceId: 'nasa-perseverance' },
      { text: L('In July 2024 Perseverance found a rock nicknamed "Cheyava Falls" with "leopard spots". In September 2025 NASA described its sample, "Sapphire Canyon", as containing a potential biosignature — not proof of life.'), sourceId: 'nasa-biosignature-2025' },
    ],
    references: [
      { label: L('Mars 2020 / Perseverance (real, published)'), value: L('About $2.7 billion: about $2.4 billion to build and launch, plus about $300 million for landing and prime operations'), sourceId: 'jpl-m2020-quickfacts' },
      { label: L('Spirit + Opportunity twin-rover program (real, published)'), value: L('About $820 million for both rovers together — not Opportunity alone'), sourceId: 'jpl-mer-presskit' },
    ],
  },
};
