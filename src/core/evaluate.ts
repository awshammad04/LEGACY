import type { ComponentOption, Design, DesignMetrics, MissionDefinition, RuleResult, Tier } from './types';
import { round } from './rng';

/** Simplified, declared model assumptions (fictional game-balance values, shown in "How numbers work"). */
export const MODEL = {
  housekeepingWh: 600, // computers, avionics, standby per sol
  commsHoursPerSol: 2,
  typicalDriveHours: 2,
  typicalScienceHours: 1,
  nightFraction: 0.5,
  batteryMargin: 1.25,
  storageSols: 2,
  minDownlinkMb: 60,
  massMarginWarn: 0.05,
  powerMarginWarn: 0.1,
  opsOverheadW: 40,
  batteryFloor: 0.2,
  driveHoursPerSol: 4,
  scienceHoursPerSol: 6,
} as const;

export function allOptions(mission: MissionDefinition): ComponentOption[] {
  return mission.slots.flatMap((s) => s.options);
}

export function optionById(mission: MissionDefinition, id: string | undefined): ComponentOption | undefined {
  if (!id) return undefined;
  return allOptions(mission).find((o) => o.id === id);
}

/** All currently installed components (single slots + add-ons). */
export function installed(mission: MissionDefinition, design: Design): ComponentOption[] {
  const out: ComponentOption[] = [];
  for (const slot of mission.slots) {
    if (slot.multi) continue;
    const o = optionById(mission, design.selections[slot.id]);
    if (o) out.push(o);
  }
  for (const id of design.addons) {
    const o = optionById(mission, id);
    if (o) out.push(o);
  }
  return out;
}

export function capabilitiesOf(mission: MissionDefinition, design: Design): string[] {
  return [...new Set(installed(mission, design).flatMap((o) => o.capabilities ?? []))];
}

export function tierOf(mission: MissionDefinition, design: Design, slotId: string): Tier | undefined {
  return optionById(mission, design.selections[slotId])?.tier;
}

/** Baseline design loaded at the start of the workshop: cheapest option in each mandatory slot. */
export function baselineDesign(mission: MissionDefinition): Design {
  const selections: Record<string, string> = {};
  for (const slot of mission.slots) {
    if (slot.mandatory && !slot.multi) selections[slot.id] = slot.options[0].id;
  }
  return { selections, addons: [] };
}

export function computeMetrics(mission: MissionDefinition, design: Design): DesignMetrics {
  const parts = installed(mission, design);
  const sel = (slot: string) => optionById(mission, design.selections[slot]);
  const launcher = sel('launcher');
  const edl = sel('edl');
  const chassis = sel('chassis');
  const nav = sel('nav');
  const power = sel('power');
  const comms = sel('comms');
  const storage = sel('storage');
  const protection = sel('protection');
  const camera = sel('camera');

  const costM = parts.reduce((a, o) => a + o.costM, 0);
  // Surface payload: everything except orbiting segments (e.g. a crew capsule that stays in lunar orbit).
  const roverMassKg = parts.filter((o) => o.segment !== 'orbiter').reduce((a, o) => a + o.massKg, 0);
  const totalPartsMass = parts.reduce((a, o) => a + o.massKg, 0);
  const edlMass = edl?.edlSystemMassKg ?? 0;
  const heater = Math.max(0, (protection?.heaterWhPerSol ?? 600) - (power?.heaterSavingsWh ?? 0));
  const commsWh = (comms?.powerW ?? 0) * MODEL.commsHoursPerSol;
  const drivePowerW = (chassis?.drivePowerW ?? 0) + (nav?.powerW ?? 0);
  const continuousWh = parts.reduce((a, o) => a + (o.continuousW ?? 0), 0) * 24;
  const sciencePeak = Math.max(0, ...parts.filter((o) => o.slot === 'instruments' || o.slot === 'camera').map((o) => o.powerW));
  const typicalSolDemandWh =
    MODEL.housekeepingWh + heater + commsWh + continuousWh + MODEL.typicalDriveHours * drivePowerW + MODEL.typicalScienceHours * sciencePeak;
  const nightDemandWh = (MODEL.housekeepingWh + heater + continuousWh) * MODEL.nightFraction;

  // Essential data: one full set of every observation the payload can make.
  const caps = capabilitiesOf(mission, design);
  let essentialDataMb = 0;
  if (camera?.dataMb) essentialDataMb += camera.dataMb * (caps.includes('zoom-imaging') ? 2 : 1);
  for (const id of design.addons) essentialDataMb += optionById(mission, id)?.dataMb ?? 0;

  return {
    costM,
    budgetCapM: mission.budgetCapM,
    reserveMinM: mission.reserveMinM,
    reserveRecommendedM: mission.reserveRecommendedM,
    reserveRemainingM: mission.budgetCapM - costM,
    roverMassKg,
    launchStackMassKg: edlMass + totalPartsMass,
    crewDays: parts.reduce((a, o) => a + (o.crewDays ?? 0), 0),
    launchCapacityKg: launcher?.launchCapacityKg ?? 0,
    landingCapacityKg: edl?.landingCapacityKg ?? 0,
    generationWhPerSol: power?.generationWhPerSol ?? 0,
    typicalSolDemandWh,
    nightDemandWh,
    batteryWh: power?.batteryWh ?? 0,
    storageMb: storage?.storageMb ?? 0,
    essentialDataMb,
    downlinkMbPerSol: comms?.downlinkMbPerSol ?? 0,
    heatLoad: parts.reduce((a, o) => a + o.thermal, 0),
    thermalCapacity: protection?.thermalCapacity ?? 0,
    capabilities: caps,
    ellipseKm: edl?.ellipseKm ?? 99,
    maxSpeedMPerH: chassis?.maxSpeedMPerH ?? 0,
    slopeLimitDeg: chassis?.slopeLimitDeg ?? 0,
    wheelDurability: chassis?.wheelDurability ?? 0,
    autonomy: nav?.autonomy ?? 0,
    drivePowerW,
    radiationHardness: protection?.radiationHardness ?? 0,
    powerSource: power?.powerSource ?? 'none',
    housekeepingWh: MODEL.housekeepingWh + heater + commsWh + continuousWh,
  };
}

const M = (n: number) => round(n, 0);

/** Pre-Launch Readiness Review. Blocking rules must all pass; warnings never block. */
export function evaluateRules(mission: MissionDefinition, design: Design, priority?: string): RuleResult[] {
  const m = computeMetrics(mission, design);
  const res: RuleResult[] = [];

  // 1. Mandatory components
  const missing = mission.slots.filter((s) => s.mandatory && !s.multi && !design.selections[s.id]);
  res.push({
    id: 'mandatory',
    severity: 'blocking',
    pass: missing.length === 0,
    provenance: 'calculated',
    message:
      missing.length === 0
        ? { en: 'All mandatory systems are installed.' }
        : { en: 'Missing mandatory system: {slot}.', vars: { slot: missing[0].name } },
  });

  // 2. Budget with protected reserve
  const limit = m.budgetCapM - m.reserveMinM;
  const over = m.costM - limit;
  res.push({
    id: 'budget',
    severity: 'blocking',
    pass: over <= 0,
    measured: m.costM,
    limit,
    delta: over,
    unit: '$M',
    provenance: 'fictional',
    message:
      over <= 0
        ? { en: 'Cost ${cost}M fits the ${cap}M cap with ${reserve}M protected reserve intact.', vars: { cost: M(m.costM), cap: m.budgetCapM, reserve: M(m.reserveRemainingM) } }
        : { en: 'Design costs ${cost}M. With the ${min}M protected reserve, the limit is ${limit}M — over by ${over}M.', vars: { cost: M(m.costM), min: m.reserveMinM, limit, over: M(over) } },
  });

  // 3. Launch mass
  const launchOver = m.launchStackMassKg - m.launchCapacityKg;
  res.push({
    id: 'launch-mass',
    severity: 'blocking',
    pass: launchOver <= 0,
    measured: m.launchStackMassKg,
    limit: m.launchCapacityKg,
    delta: launchOver,
    unit: 'kg',
    provenance: 'calculated',
    message:
      launchOver <= 0
        ? { en: 'Launch stack {mass} kg fits launcher capacity {cap} kg.', vars: { mass: M(m.launchStackMassKg), cap: m.launchCapacityKg } }
        : { en: 'Payload exceeds launcher capacity by {over} kg ({mass} kg vs {cap} kg).', vars: { over: M(launchOver), mass: M(m.launchStackMassKg), cap: m.launchCapacityKg } },
  });

  // 4. Landing mass
  const landOver = m.roverMassKg - m.landingCapacityKg;
  res.push({
    id: 'landing-mass',
    severity: 'blocking',
    pass: landOver <= 0,
    measured: m.roverMassKg,
    limit: m.landingCapacityKg,
    delta: landOver,
    unit: 'kg',
    provenance: 'calculated',
    message:
      landOver <= 0
        ? { en: 'Rover {mass} kg is within the landing system limit of {cap} kg.', vars: { mass: M(m.roverMassKg), cap: m.landingCapacityKg } }
        : { en: 'Rover exceeds the landing system limit by {over} kg ({mass} kg vs {cap} kg).', vars: { over: M(landOver), mass: M(m.roverMassKg), cap: m.landingCapacityKg } },
  });

  // 5. Power balance for a typical operations sol
  const powerShort = m.typicalSolDemandWh - m.generationWhPerSol;
  res.push({
    id: 'power',
    severity: 'blocking',
    pass: powerShort <= 0,
    measured: m.typicalSolDemandWh,
    limit: m.generationWhPerSol,
    delta: powerShort,
    unit: 'Wh',
    provenance: 'calculated',
    message:
      powerShort <= 0
        ? { en: 'A typical operations sol needs {need} Wh; the power system supplies {gen} Wh.', vars: { need: M(m.typicalSolDemandWh), gen: m.generationWhPerSol } }
        : { en: 'A typical operations sol needs {need} Wh but the power system supplies only {gen} Wh — short by {short} Wh.', vars: { need: M(m.typicalSolDemandWh), gen: m.generationWhPerSol, short: M(powerShort) } },
  });

  // 6. Battery endurance (night survival with margin)
  const batNeed = m.nightDemandWh * 1.25;
  res.push({
    id: 'battery',
    severity: 'blocking',
    pass: m.batteryWh >= batNeed,
    measured: m.batteryWh,
    limit: batNeed,
    delta: batNeed - m.batteryWh,
    unit: 'Wh',
    provenance: 'calculated',
    message:
      m.batteryWh >= batNeed
        ? { en: 'Battery {bat} Wh covers the night with margin (needs {need} Wh).', vars: { bat: m.batteryWh, need: M(batNeed) } }
        : { en: 'Battery {bat} Wh cannot keep the rover warm through the night with margin (needs {need} Wh).', vars: { bat: m.batteryWh, need: M(batNeed) } },
  });

  // 7. Data storage
  const storageNeed = m.essentialDataMb * 2;
  res.push({
    id: 'storage',
    severity: 'blocking',
    pass: m.storageMb >= storageNeed,
    measured: m.storageMb,
    limit: storageNeed,
    delta: storageNeed - m.storageMb,
    unit: 'MB',
    provenance: 'calculated',
    message:
      m.storageMb >= storageNeed
        ? { en: 'Storage {s} MB holds two full sets of science data ({need} MB).', vars: { s: m.storageMb, need: M(storageNeed) } }
        : { en: 'Storage {s} MB cannot hold two full sets of science data ({need} MB needed).', vars: { s: m.storageMb, need: M(storageNeed) } },
  });

  // 8. Downlink minimum for telemetry
  res.push({
    id: 'downlink',
    severity: 'blocking',
    pass: m.downlinkMbPerSol >= 60,
    measured: m.downlinkMbPerSol,
    limit: 60,
    unit: 'MB',
    provenance: 'calculated',
    message: { en: 'Downlink {d} MB per sol (telemetry needs at least 60 MB).', vars: { d: m.downlinkMbPerSol } },
  });

  // 9. Thermal
  const heatOver = m.heatLoad - m.thermalCapacity;
  res.push({
    id: 'thermal',
    severity: 'blocking',
    pass: heatOver <= 0,
    measured: m.heatLoad,
    limit: m.thermalCapacity,
    delta: heatOver,
    unit: 'heat units',
    provenance: 'fictional',
    message:
      heatOver <= 0
        ? { en: 'Heat load {h} is within thermal capacity {c}.', vars: { h: m.heatLoad, c: m.thermalCapacity } }
        : { en: 'Heat load {h} exceeds thermal capacity {c} by {over}. Upgrade thermal protection or remove hot equipment.', vars: { h: m.heatLoad, c: m.thermalCapacity, over: heatOver } },
  });

  // 10. Dependencies (contact instruments need the arm)
  const caps = m.capabilities;
  const unmet = installed(mission, design).filter((o) => (o.requires ?? []).some((r) => !caps.includes(r)));
  res.push({
    id: 'dependencies',
    severity: 'blocking',
    pass: unmet.length === 0,
    provenance: 'calculated',
    message:
      unmet.length === 0
        ? { en: 'Every instrument has the support hardware it needs.' }
        : { en: '{name} needs a robotic arm to touch the rock.', vars: { name: unmet[0].name } },
  });

  // 11. Crew life support (crewed missions only)
  if (mission.requiredCrewDays) {
    const need = Math.ceil(mission.requiredCrewDays * 1.2);
    res.push({
      id: 'life-support',
      severity: 'blocking',
      pass: m.crewDays >= need,
      measured: m.crewDays,
      limit: need,
      delta: need - m.crewDays,
      unit: 'days',
      provenance: 'calculated',
      message:
        m.crewDays >= need
          ? { en: 'Life support covers {have} crew-days; the plan needs {need} including a 20% safety margin.', vars: { have: m.crewDays, need } }
          : { en: 'Life support covers only {have} crew-days; the plan needs {need} including a 20% safety margin. Crew safety limits are not optional.', vars: { have: m.crewDays, need } },
    });
  }

  // ---- Ground warnings (never block) ----
  if (over <= 0 && m.reserveRemainingM < m.reserveRecommendedM) {
    res.push({
      id: 'reserve-low',
      severity: 'warning',
      pass: false,
      provenance: 'fictional',
      message: { en: 'Only ${r}M left in reserve (recommended ${rec}M). Unexpected problems may be harder to handle.', vars: { r: M(m.reserveRemainingM), rec: m.reserveRecommendedM } },
    });
  }
  if (launchOver <= 0 && m.launchCapacityKg > 0 && -launchOver / m.launchCapacityKg < MODEL.massMarginWarn) {
    res.push({ id: 'mass-margin', severity: 'warning', pass: false, provenance: 'calculated', message: { en: 'Launch mass margin is under 5%. Engineers usually keep more margin for surprises.' } });
  }
  if (powerShort <= 0 && m.generationWhPerSol > 0 && -powerShort / m.generationWhPerSol < MODEL.powerMarginWarn) {
    res.push({ id: 'power-margin', severity: 'warning', pass: false, provenance: 'calculated', message: mission.model === 'telescope' || mission.model === 'lunar' ? { en: 'Power margin is under 10%. There is little spare energy for extra operations or surprises.' } : { en: 'Power margin is under 10%. Each sol will allow only a little driving or science.' } });
  }
  if (priority) {
    const needs: Record<string, string[]> = {
      'h-bio': ['organics', 'elemental-chemistry'],
      'h-abiotic': ['elemental-chemistry'],
      'h-alteration': ['elemental-chemistry', 'zoom-imaging'],
    };
    const need = needs[priority] ?? [];
    if (need.length && !need.some((c) => caps.includes(c))) {
      res.push({ id: 'science-fit', severity: 'warning', pass: false, provenance: 'calculated', message: { en: 'None of your instruments can measure chemistry or organics — your chosen science question may stay unanswered.' } });
    }
  }
  if (m.powerSource === 'solar' && mission.destination.en.startsWith('Mars')) {
    res.push({ id: 'solar-dust', severity: 'info', pass: true, provenance: 'verified', message: { en: 'Solar power: dust on the panels or a dust storm can reduce output (this is what ended Opportunity\'s mission in 2018).' } });
  }
  if (m.ellipseKm > 0 && mission.landingSites.length > 0) {
    const sites = mission.landingSites.filter((s) => m.ellipseKm <= s.maxEllipseKm).length;
    res.push({ id: 'ellipse', severity: 'info', pass: true, provenance: 'fictional', message: { en: 'Landing ellipse {e} km: {n} of {t} candidate landing sites reachable.', vars: { e: m.ellipseKm, n: sites, t: mission.landingSites.length } } });
  }
  const applies = (r: RuleResult) => r.severity !== 'blocking' || !mission.rules || mission.rules.includes(r.id) || r.id === 'life-support';
  const out = res.filter(applies);
  if (mission.dayWord === 'day') {
    for (const r of out) r.message = { ...r.message, en: r.message.en.replace(/\bsol\b/g, 'day') };
  }
  return out;
}

export const blockingFailures = (rules: RuleResult[]) => rules.filter((r) => r.severity === 'blocking' && !r.pass);
export const isLaunchReady = (rules: RuleResult[]) => blockingFailures(rules).length === 0;
