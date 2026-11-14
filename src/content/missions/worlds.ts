import type { MissionDefinition } from '../../core/types';
import { L } from '../l';

/*
 * Playable operations for Missions 01, 03 and 04 (added on top of their Earth stage).
 * Facts are kept to NASA-reported history; game values (hours, doses, scores) are simplified and fictional.
 */

type WorldPart = Partial<MissionDefinition>;

const DUST_EVENT = {
  id: 'ev-dust',
  title: L('Dust storm approaching'),
  from: L('Mission Control — Mars Weather'),
  message: L('A regional dust storm is moving in. Dust in the sky will block sunlight for a few sols.'),
  cause: L("Martian dust storms reduce the sunlight reaching solar panels. A 2018 planet-wide storm ended Opportunity's mission. Radioisotope power is not affected the same way. This is different from a solar radiation storm."),
  concept: L('Power systems must match the environment. Solar is cheaper and lighter; radioisotope power keeps working through dust.'),
  best: 'wait',
  why: L("Solar panels make little power in a dust storm. Waiting protects the battery — a dust storm ended Opportunity's mission in 2018."),
  options: [
    { id: 'wait', label: L('Park and wait it out'), effects: L('Lose 2 sols. The storm passes before you continue.') },
    { id: 'continue', label: L('Keep exploring through the storm'), effects: L('No delay, but solar panels make only about a third of their power for 3 sols.') },
  ],
};

/* =============================== MISSION 01 — MOON =============================== */

export const M1_WORLD: WorldPart = {
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'orbit', 'cruise', 'surface', 'debrief', 'quizPost', 'results'],
  conjunctionSol: 4,
  reportStyle: 'summary',
  world: { theme: 'moon', vehicle: 'lrv', start: [-54, -164], keepOut: { siteId: 'm1-heritage', radius: 18 }, evaHours: 7 },
  crew: [
    { id: 'rana', name: 'Rana', role: L('Commander') },
    { id: 'leo', name: 'Leo', role: L('Lunar Module Pilot') },
    { id: 'sam', name: 'Sam', role: L('Command Module Pilot (stays in orbit)') },
  ],
  cruise: [
    {
      id: 'checkin', time: L('07:00'), title: L('Wake up & health check'),
      prompt: L('Mission Control wants the morning check-in. Each astronaut measures heart rate and blood oxygen.'),
      learn: L('Astronauts check their health every day so problems are caught early.'),
      options: [
        { id: 'measure', label: L('Do the full check-in'), result: L('Readings look normal. One measurement is only a snapshot — doctors watch trends over time.'), effects: { stress: -5 } },
        { id: 'skip', label: L('Skip it to save time'), result: L('Without data, the medical team cannot spot problems early.'), effects: { stress: 10 } },
      ],
    },
    {
      id: 'meals', time: L('08:00'), title: L('Breakfast & water'),
      prompt: L('Food and water are limited. How much will the crew have?'),
      learn: L('Staying hydrated and well fed keeps astronauts alert.'),
      options: [
        { id: 'full', label: L('Full meals and plenty of water'), result: L('Hydrated, well-fed astronauts think clearly.'), effects: { hydration: 15, fatigue: -5 } },
        { id: 'ration', label: L('Ration food and water to save supplies'), result: L('Saves supplies, but dehydration makes people tired.'), effects: { hydration: -20, fatigue: 10 } },
      ],
    },
    {
      id: 'exercise', time: L('11:00'), title: L('Exercise'),
      prompt: L('Muscles and bones weaken in weightlessness. Exercise, or skip it for an extra experiment?'),
      learn: L('Astronauts on the space station exercise about two hours a day to protect muscles and bones.'),
      options: [
        { id: 'exercise', label: L('Exercise on the bike and resistance machine'), result: L('Muscles stay strong for the moonwalk ahead.'), effects: { fitness: 10, fatigue: 5 } },
        { id: 'skip', label: L('Skip exercise and run an extra experiment'), result: L('Extra science, but weaker muscles make the moonwalk harder.'), effects: { fitness: -15, science: 5 } },
      ],
    },
    {
      id: 'flare', time: L('15:00'), title: L('Solar flare warning!'),
      prompt: L('Mission Control: a solar flare is sending energetic particles toward the spacecraft.'),
      learn: L('Space radiation is one of the biggest risks of spaceflight. Shielding and timing protect the crew.'),
      options: [
        { id: 'shelter', label: L('Move into the shielded storm shelter'), result: L('The crew waits safely. The experiment can wait too.'), effects: { doseMSv: 1, stress: 5 } },
        { id: 'continue', label: L('Keep working at the window experiment'), result: L('Much more radiation exposure — a safety violation.'), effects: { doseMSv: 25, science: 5 }, unsafe: true },
      ],
    },
    {
      id: 'sleep', time: L('22:00'), title: L('Sleep'),
      prompt: L('Tomorrow you reach the Moon. Sleep now, or keep working?'),
      learn: L('NASA treats sleep loss as a real mission risk: tired people make more mistakes.'),
      options: [
        { id: 'sleep', label: L('Sleep a full 8 hours'), result: L('Rested astronauts can work longer on the Moon.'), effects: { fatigue: -25, sleepDebtH: -2, stress: -5 } },
        { id: 'late', label: L('Work late on reports'), result: L('Sleep debt builds up — the moonwalk will be shorter.'), effects: { fatigue: 20, sleepDebtH: 3, science: 3 } },
      ],
    },
  ],
  sites: [
    { id: 'm1-lander', kind: 'lander', name: L('Your Lander'), hint: L('Rest here between moonwalks'), pos: [-60, -170], radius: 14, observations: ['obs-retro'] },
    { id: 'm1-heritage', kind: 'heritage', name: L('Apollo 15 Site'), hint: L('Historic hardware — protected zone'), pos: [-185, 45], radius: 30, observations: ['obs-heritage-photo', 'obs-heritage-tracks'] },
    { id: 'm1-rille', kind: 'rille', name: L('Hadley Rille Edge'), hint: L('A winding lava channel'), pos: [95, -290], radius: 18, observations: ['obs-rille-photo', 'obs-rille-samples'] },
    { id: 'm1-crater', kind: 'crater', name: L('Fresh Crater'), hint: L('Young crater, fresh soil'), pos: [45, 25], radius: 16, observations: ['obs-crater-core', 'obs-seismo'] },
    { id: 'm1-view', kind: 'viewpoint', name: L('Earth View Ridge'), hint: L('See Earth above the horizon'), pos: [-250, -70], radius: 16, observations: ['obs-earthrise'] },
  ],
  objectives: [
    { label: L('Reach the Apollo 15 site'), hint: L('Follow the yellow beacon. Stop at the outer ring.'), done: { arrive: 'm1-heritage' } },
    { label: L('Photograph it without entering the protected zone'), hint: L('Stay outside the red circle and press E.'), done: { anyObs: ['obs-heritage-photo', 'obs-heritage-tracks'] } },
    { label: L('Collect Moon science, then report'), hint: L('Samples at the rille or crater — then press F.'), done: { anyObs: ['obs-rille-samples', 'obs-crater-core', 'obs-seismo'] } },
  ],
  observations: [
    { id: 'obs-heritage-photo', name: L('Photograph the Apollo 15 site'), description: L('From outside the protective boundary.'), requires: ['context-imaging'], hours: 0.5, energyWh: 0, dataMb: 0, qualityFrom: 'camera', finding: L("The Apollo 15 lunar module's descent stage still stands where astronauts left it in 1971, with their rover parked nearby."), support: {} },
    { id: 'obs-heritage-tracks', name: L('Zoom on the 1971 rover tracks'), description: L('Map the old tracks from a distance.'), requires: ['zoom-imaging'], hours: 0.5, energyWh: 0, dataMb: 0, qualityFrom: 'camera', finding: L('The rover tracks and footprints from 1971 are still visible — the Moon has no wind or rain to erase them.'), support: {} },
    { id: 'obs-rille-photo', name: L('Photograph Hadley Rille'), description: L('Image the channel walls.'), requires: ['context-imaging'], hours: 0.5, energyWh: 0, dataMb: 0, qualityFrom: 'camera', finding: L('Hadley Rille is a winding channel more than a kilometer wide, most likely carved by flowing lava long ago.'), support: {} },
    { id: 'obs-rille-samples', name: L('Collect rock samples'), description: L('Use hammers and scoops at the rille edge.'), requires: ['sampling'], hours: 1, energyWh: 0, dataMb: 0, finding: L('You bagged dark basalt — volcanic rock like the samples Apollo 15 brought home from the rille edge.'), support: {} },
    { id: 'obs-crater-core', name: L('Drill a soil core'), description: L('Collect layered lunar soil.'), requires: ['drill'], hours: 1, energyWh: 0, dataMb: 0, finding: L('The core shows layers of lunar soil built up by billions of years of small impacts.'), support: {} },
    { id: 'obs-seismo', name: L('Set up the seismometer'), description: L('Listen for moonquakes.'), requires: ['seismic'], hours: 1, energyWh: 0, dataMb: 0, finding: L('Your seismometer is listening for moonquakes, like the instruments Apollo crews set up.'), support: {} },
    { id: 'obs-retro', name: L('Place the laser reflector'), description: L('A mirror target for lasers from Earth.'), requires: ['ranging'], hours: 0.5, energyWh: 0, dataMb: 0, finding: L('Apollo 15 left a laser reflector that scientists still use to measure the Moon\'s distance. Yours adds another target.'), support: {} },
    { id: 'obs-earthrise', name: L('Photograph Earth'), description: L('Earth above the lunar horizon.'), requires: ['context-imaging'], hours: 0.3, energyWh: 0, dataMb: 0, qualityFrom: 'camera', finding: L('Earth hangs in the black sky — almost four times wider than the Moon looks from Earth.'), support: {} },
  ],
  statements: [
    { id: 'm1-st-heritage', kind: 'supported-claim', requiresAny: ['obs-heritage-photo'], text: L('We documented the Apollo 15 site without disturbing it.'), explanation: L('Needs photos of the site that reached Earth.') },
    { id: 'm1-st-tracks', kind: 'supported-claim', requiresAll: ['obs-heritage-tracks'], text: L('The 1971 rover tracks are still visible.'), explanation: L('Needs zoomed images.') },
    { id: 'm1-st-geology', kind: 'supported-claim', requiresAny: ['obs-rille-samples', 'obs-crater-core'], text: L('We collected samples that record the Moon\'s volcanic and impact history.'), explanation: L('Needs samples or a core.') },
    { id: 'm1-st-rille', kind: 'supported-claim', requiresAll: ['obs-rille-photo'], text: L('Hadley Rille was likely carved by flowing lava.'), explanation: L('Needs rille images.') },
    { id: 'm1-st-seismo', kind: 'supported-claim', requiresAll: ['obs-seismo'], text: L('A new seismometer is listening for moonquakes.'), explanation: L('Needs the seismometer set up.') },
    { id: 'm1-st-retro', kind: 'supported-claim', requiresAll: ['obs-retro'], text: L('A new laser reflector lets Earth measure the Moon\'s distance.'), explanation: L('Needs the reflector placed.') },
    { id: 'm1-st-caution', kind: 'caution', text: L('Our findings are preliminary until the samples are studied in laboratories on Earth.'), explanation: L('Careful reporting.') },
  ],
  events: [
    {
      id: 'ev-fatigue',
      title: L('Astronaut fatigue'),
      from: L('Mission Control — Flight Surgeon'),
      message: L('Leo is breathing hard and his heart rate is rising. He is getting tired on this moonwalk.'),
      cause: L('Moonwalks are hard physical work in a stiff, pressurized suit. Earlier sleep, food and exercise choices affect how long the crew can safely work.'),
      concept: L('Crew safety comes first: plans change when an astronaut needs rest.'),
      best: 'end',
      why: L("Tired people make more mistakes. Ending the moonwalk early keeps the whole crew safe."),
      options: [
        { id: 'end', label: L('End the moonwalk and return to the lander'), effects: L('Safest choice. The day ends and the crew recovers.') },
        { id: 'reorganize', label: L('Reorganize: Rana takes the hard tasks'), effects: L('Shorter moonwalk, less strain on Leo.') },
        { id: 'continue', label: L('Continue as planned'), effects: L('More fatigue. Unsafe if the crew is already very tired.') },
      ],
    },
    {
      id: 'ev-solar-crew',
      title: L('Solar storm warning'),
      from: L('Mission Control — Space Weather'),
      message: L('Solar activity has increased. Energetic particles will reach the Moon soon. Review radiation precautions now.'),
      cause: L('The Moon has no thick atmosphere or magnetic field to block solar particles, so astronauts outside are exposed.'),
      concept: L('Follow the hazard plan: protect the crew first, science can wait.'),
      best: 'shelter',
      why: L("The lander shields the crew from radiation much better than a spacesuit can."),
      options: [
        { id: 'shelter', label: L('Return to the lander shelter now'), effects: L('Crew protected. Half a day lost.') },
        { id: 'postpone', label: L('Pause outside work and wait in the rover'), effects: L('Some exposure; uses suit time.') },
        { id: 'ignore', label: L('Ignore it and keep working'), effects: L('High radiation dose — a safety violation.'), unsafe: true },
      ],
    },
  ],
  eventTriggers: { 'ev-fatigue': { evaUsed: 2.5 }, 'ev-solar-crew': { observations: 3 } },
  opsPreview: undefined,
};

/* =============================== MISSION 03 — OPPORTUNITY =============================== */

export const M3_WORLD: WorldPart = {
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'orbit', 'surface', 'debrief', 'quizPost', 'results'],
  conjunctionSol: 12,
  reportStyle: 'summary',
  world: { theme: 'mars', vehicle: 'rover', start: [-210, 60], keepOut: { siteId: 'm3-opportunity', radius: 14 } },
  sites: [
    { id: 'm3-opportunity', kind: 'heritage', name: L('Opportunity'), hint: L('The rover rests here — protected zone'), pos: [70, -250], radius: 26, observations: ['obs-opp-photo', 'obs-opp-zoom', 'obs-opp-3d'] },
    { id: 'm3-valley', kind: 'viewpoint', name: L('Perseverance Valley'), hint: L("Opportunity's last route"), pos: [-10, -205], radius: 18, observations: ['obs-tracks-pano'] },
    { id: 'm3-rim', kind: 'viewpoint', name: L('Endeavour Crater Rim'), hint: L('A view across the crater'), pos: [-150, -110], radius: 18, observations: ['obs-rim-pano'] },
    { id: 'm3-ripples', kind: 'ripples', name: L('Sand Ripples'), hint: L('Careful — soft sand'), pos: [60, 30], radius: 20, observations: ['obs-ripple'] },
  ],
  objectives: [
    { label: L('Find Opportunity'), hint: L('Follow the yellow beacon toward Perseverance Valley.'), done: { arrive: 'm3-opportunity' } },
    { label: L('Document it without touching it'), hint: L('Stay outside the red circle and press E.'), done: { anyObs: ['obs-opp-photo', 'obs-opp-zoom', 'obs-opp-3d'] } },
    { label: L('Explore its story, then report'), hint: L('Visit the valley or crater rim — then press F.'), done: { anyObs: ['obs-tracks-pano', 'obs-rim-pano', 'obs-ripple'] } },
  ],
  observations: [
    { id: 'obs-opp-photo', name: L('Photograph Opportunity'), description: L('From outside the protective boundary.'), requires: ['context-imaging'], hours: 0.5, energyWh: 30, dataMb: 0, qualityFrom: 'camera', finding: L('Opportunity sits where it last worked in 2018, its solar panels coated in red dust.'), support: {} },
    { id: 'obs-opp-zoom', name: L('Zoom on its solar panels'), description: L('Check how much dust covers them.'), requires: ['zoom-imaging'], hours: 0.5, energyWh: 30, dataMb: 0, qualityFrom: 'camera', finding: L('Thick dust covers the panels — consistent with how the 2018 dust storm cut off the sunlight it needed.'), support: {} },
    { id: 'obs-opp-3d', name: L('Laser 3D scan of the rover'), description: L('Build a 3D model from a distance.'), requires: ['3d-scan'], hours: 1, energyWh: 60, dataMb: 0, finding: L('Your 3D model records the rover and its tracks in detail — a digital record of a historic site.'), support: {} },
    { id: 'obs-tracks-pano', name: L('Panorama of the valley'), description: L('Trace the route down the valley.'), requires: ['context-imaging'], hours: 0.5, energyWh: 30, dataMb: 0, qualityFrom: 'camera', finding: L('You trace the route Opportunity drove down Perseverance Valley in 2018, its final journey.'), support: {} },
    { id: 'obs-rim-pano', name: L('Panorama of Endeavour Crater'), description: L('Image the crater rim.'), requires: ['context-imaging'], hours: 0.5, energyWh: 30, dataMb: 0, qualityFrom: 'camera', finding: L('Endeavour Crater is about 22 km wide. Opportunity spent its last seven years exploring this rim.'), support: {} },
    { id: 'obs-ripple', name: L('Study the sand ripples'), description: L('Photograph the wind-blown sand.'), requires: ['context-imaging'], hours: 0.5, energyWh: 20, dataMb: 0, qualityFrom: 'camera', finding: L('Soft sand like this trapped Opportunity for about five weeks in 2005 — careful driving matters.'), support: {} },
  ],
  statements: [
    { id: 'm3-st-doc', kind: 'supported-claim', requiresAny: ['obs-opp-photo', 'obs-opp-zoom'], text: L('We documented Opportunity in its final resting place.'), explanation: L('Needs photos that reached Earth.') },
    { id: 'm3-st-dust', kind: 'supported-claim', requiresAll: ['obs-opp-zoom'], text: L('Dust covers its solar panels, consistent with how the 2018 storm ended its mission.'), explanation: L('Needs zoomed images.') },
    { id: 'm3-st-3d', kind: 'supported-claim', requiresAll: ['obs-opp-3d'], text: L('A 3D model now preserves the site digitally.'), explanation: L('Needs the 3D scan.') },
    { id: 'm3-st-route', kind: 'supported-claim', requiresAny: ['obs-tracks-pano', 'obs-rim-pano'], text: L('We recorded the landscape of its final years.'), explanation: L('Needs panoramas.') },
    { id: 'm3-st-caution', kind: 'caution', text: L('We left Opportunity untouched, exactly where it finished its mission.'), explanation: L('Heritage protection.') },
  ],
  events: [
    DUST_EVENT,
    {
      id: 'ev-power',
      title: L('Power anomaly'),
      from: L('Mission Control — Power Systems'),
      message: L('Battery telemetry shows a cell imbalance. Usable battery capacity has dropped. How should we respond?'),
      cause: L('Battery cells age unevenly. One weak cell limits how deeply the whole battery can be discharged.'),
      concept: L('Engineers protect mission-critical functions first: power for heaters, computers and communication comes before optional science.'),
      best: 'shed',
      why: L("Switching off what you don't need costs the least and keeps the protected reserve for bigger emergencies."),
      options: [
        { id: 'shed', label: L('Shed non-essential loads'), effects: L('Battery capacity −10%. Optional sensors switch off.') },
        { id: 'reserve', label: L('Spend $40M of the protected reserve on an engineering fix'), effects: L('Engineers upload new battery-management software. Capacity −3%, costs 1 sol.') },
        { id: 'accept', label: L('Accept the reduced capacity'), effects: L('Battery capacity −20%. Each sol supports less work.') },
      ],
    },
  ],
  eventTriggers: { 'ev-dust': { sol: 3 }, 'ev-power': { distance: 150 } },
  opsPreview: undefined,
};

/* =============================== MISSION 04 — TELESCOPE =============================== */

export const M4_WORLD: WorldPart = {
  stages: ['quizPre', 'briefing', 'workshop', 'review', 'launch', 'observe', 'debrief', 'quizPost', 'results'],
  conjunctionSol: 0,
  reportStyle: 'summary',
  telescope: { nights: 3, hoursPerNight: 5, brightness: [0.55, 1, 0.75] },
  objectives: [
    { label: L('Point at the supernova'), hint: L('Press Point to aim at the Pinwheel Galaxy.'), done: { anyObs: ['obs-n1', 'obs-n2', 'obs-n3'] } },
    { label: L('Watch it over 3 nights'), hint: L('Take an image each night to see the brightness change.'), done: { allObs: ['obs-n1', 'obs-n2', 'obs-n3'] } },
    { label: L('Send your results'), hint: L('Press Send results when you are done.'), done: {} },
  ],
  observations: [
    { id: 'obs-n1', name: L('Night 1 image'), description: L(''), requires: ['visible'], hours: 0, energyWh: 0, dataMb: 0, finding: L('A new bright point shines in a spiral arm of the galaxy.'), support: {} },
    { id: 'obs-n2', name: L('Night 2 image'), description: L(''), requires: ['visible'], hours: 0, energyWh: 0, dataMb: 0, finding: L('The point is brighter tonight than last night.'), support: {} },
    { id: 'obs-n3', name: L('Night 3 image'), description: L(''), requires: ['visible'], hours: 0, energyWh: 0, dataMb: 0, finding: L('It has started to fade — a supernova rises and then slowly dims.'), support: {} },
    { id: 'obs-uv', name: L('Ultraviolet image'), description: L(''), requires: ['uv'], hours: 0, energyWh: 0, dataMb: 0, finding: L('Ultraviolet light reveals the very hot gas of the young explosion.'), support: {} },
    { id: 'obs-ir', name: L('Infrared image'), description: L(''), requires: ['infrared'], hours: 0, energyWh: 0, dataMb: 0, finding: L('Infrared light helps us see warm dust around the exploding star.'), support: {} },
    { id: 'obs-spectrum', name: L('Spectrum'), description: L(''), requires: ['spectrum'], hours: 0, energyWh: 0, dataMb: 0, finding: L('The spectrum shows hydrogen — a sign of a Type II supernova, the collapse of a massive star. (The real SN 2023ixf was also Type II.)'), support: {} },
  ],
  statements: [
    { id: 'm4-st-change', kind: 'supported-claim', requiresAny: ['obs-n2', 'obs-n3'], text: L('Its brightness changed from night to night.'), explanation: L('Needs images on more than one night.') },
    { id: 'm4-st-curve', kind: 'supported-claim', requiresAll: ['obs-n1', 'obs-n2', 'obs-n3'], text: L('We built a three-night light curve.'), explanation: L('Needs an image every night.') },
    { id: 'm4-st-uv', kind: 'supported-claim', requiresAll: ['obs-uv'], text: L('Ultraviolet light shows the hot young explosion.'), explanation: L('Needs a UV image.') },
    { id: 'm4-st-ir', kind: 'supported-claim', requiresAll: ['obs-ir'], text: L('Infrared light reveals dust around the star.'), explanation: L('Needs an infrared image.') },
    { id: 'm4-st-type', kind: 'supported-claim', requiresAll: ['obs-spectrum'], text: L('Its spectrum shows hydrogen, pointing to a Type II supernova.'), explanation: L('Needs a spectrum.') },
    { id: 'm4-st-caution', kind: 'caution', text: L('More observations over weeks would tell us more about this explosion.'), explanation: L('One observation is a starting point, not a conclusion.') },
    { id: 'm4-st-over', kind: 'overclaim', text: L('One image tells us everything about this supernova.'), explanation: L('Overclaim.') },
    { id: 'm4-st-dismiss', kind: 'dismissive', text: L('Nothing changed — not worth more telescope time.'), explanation: L('Dismisses real evidence.') },
  ],
  events: [
    {
      id: 'ev-solar-scope',
      title: L('Solar storm warning'),
      from: L('Mission Control — Space Weather'),
      message: L('A burst of energetic particles is coming. Sensitive detectors can be damaged.'),
      cause: L('Energetic solar particles can create false signals or damage electronics in orbit.'),
      concept: L('Protect the instrument: safing it for a while costs observing time but avoids damage.'),
      best: 'safe',
      why: L("Energetic particles can damage a detector. Losing two hours is better than losing the camera."),
      options: [
        { id: 'safe', label: L('Safe the detector for 2 hours'), effects: L('Lose 2 hours of tonight\'s observing time.') },
        { id: 'continue', label: L('Keep observing'), effects: L('Risk detector damage — a safety violation.'), unsafe: true },
      ],
    },
  ],
  eventTriggers: { 'ev-solar-scope': { sol: 2 } },
  opsPreview: undefined,
};
