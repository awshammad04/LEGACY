# LEGACY — Every Mission Leaves a Story

**NASA Space Apps Challenge 2026 · Space Mission Design Game**
*Design the future. Protect the crew. Discover the past.*

LEGACY is a 3D browser game in which students (ages 13–18) become mission commanders. In each mission they:

1. Choose a mission and answer a 3-question baseline check.
2. Build a spacecraft on Earth within a fixed budget.
3. Pass a readiness review that explains every failure.
4. Launch, explore orbit, operate on another world, and respond to Mission Control alerts.
5. Analyze real-science-inspired evidence.
6. Review a debrief whose What-If machine *recomputes* the mission with a different design.

> Independent educational project, not an official NASA product. Every number in the game is labeled as a **NASA source**, **calculated**, or **game value**.

## What is playable today

| Mission | Status |
|---|---|
| **02 — The Martian Mystery** (robotic, Jezero Crater, Cheyava Falls / Sapphire Canyon) | Fully playable: free-roaming open-world Mars, in English and Arabic |
| **01 — Echoes of Apollo** (crewed, Moon) | Playable: life aboard with live crew health, then a moonwalk with suit oxygen, a protected Apollo 15 site, fatigue and solar-storm decisions |
| **03 — The Lost Rover: Opportunity** (robotic, Mars) | Playable: find and document Opportunity without entering its protected zone; dust storm |
| **04 — The Cosmic Photographer** (telescope) | Playable: observe a supernova over 3 nights — filters, exposure, light curve, spectrum |

The Mission 2 loop:

1. **Mission Control HQ** — four mission cards and a preview of the 3-question check.
2. **Baseline quiz** — exactly 3 questions, shuffled options, "I'm not sure" accepted.
3. **Briefing** — choose a science question before any instruments, with NASA fact cards.
4. **Build workshop** — Basic/Balanced/Advanced parts. Live budget with a protected reserve, plus mass, landing, power, battery, data and thermal limits. The rover model changes with every choice.
5. **Pre-Launch Readiness Review** — explains exactly why a design fails (e.g. "Rover exceeds the landing system limit by 19 kg"). Launch never bypasses a failed rule.
6. **Launch cinematic** — the launcher's size follows your choice. It can be skipped, and reduced-motion mode shortens it.
7. **Orbit explorer**:
   - Satellites with Point-to-Learn cards. Starlink is credited to SpaceX.
   - Mission Parts puzzle with hints.
   - **Look Around** illustrative sky.
8. **Landing site** — choose from a real NASA image of Jezero. Your landing system's precision decides which sites are reachable.
9. **Mars surface**:
   - Plan waypoints, read the predicted energy, time and risk, then uplink.
   - The light-time delay is shown, then the rover drives itself.
   - Two events: a power anomaly and a solar particle event. The game keeps solar radiation separate from dust storms.
10. **Evidence**:
    - Only the instruments you built can run.
    - An evidence board shows support for each hypothesis, never "proof".
    - Mid-analysis alert: "Possible biosignature? Further investigation required."
11. **Report** — downlink capacity comes from your comms choice. Claims need data that actually reached Earth.
12. **Debrief**:
    - Outcome scores, achievements, and a decision timeline with *Replay from here*.
    - **What-If machine**: change the design, then re-run the same rules.
13. **Final check** — 3 equivalent questions, then before/after built only from measured answers.
14. **Legacy Archive** — Interactive Memories with real NASA images and credits.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. Production build: `npm run build` writes the output to `dist/`, which is a static site you can host anywhere.

## Tests

```bash
npm test
```

25 unit tests cover the deterministic core:
- the readiness rules and their exact messages;
- the protected reserve;
- quiz shuffling and scoring;
- the mobility model;
- golden mission scripts;
- What-If recomputation;
- source and attribution integrity.

```bash
npx playwright test
```

The Playwright end-to-end tests cover:
- a full Mission 2 run;
- reload and continue;
- the right-to-left Arabic layout;
- axe accessibility checks.

They use the installed Microsoft Edge (`channel: 'msedge'`).

## Architecture (short)

- **`src/core/`** — pure TypeScript, with no React or Three.js. It is a deterministic, event-sourced reducer: `state = reduce(initial, actions)`.
  - **Saves** are action logs.
  - **Rewind** truncates the log.
  - **What-If** replaces the design actions and replays every later decision under the same rules.
- **`src/content/`** — typed, data-driven mission definitions: components, quizzes, events, observations, archive, sources and asset credits. New missions are mostly content.
- **`src/game/`** — Zustand store with autosave, i18n (English plus an Arabic map), synthesized audio, and narration with subtitles.
- **`src/scenes/`** — React Three Fiber scenes: HQ, workshop, launch, orbit, Mars approach and Mars surface. The analytic terrain is shared with the simulation.
- **`src/ui/`** — accessible DOM overlays (keyboard, touch, RTL, reduced motion).

The full plan, requirements matrix and roadmap are in [`docs/ARCHITECTURE_AND_ROADMAP.md`](docs/ARCHITECTURE_AND_ROADMAP.md).

## Demo script (≈4 minutes)

1. **Home** — four mission cards and the 3-question check. Toggle **العربية** to show the full right-to-left layout, then switch back.
2. **Start Mission 02** — answer 3 quick questions, then pick a science priority.
3. **Workshop** — add the robotic arm, the abrasion drill and the X-ray spectrometer, then run the review. It is blocked: *Rover exceeds the landing system limit by 19 kg*. Fix it with the sky-crane landing system, larger solar arrays and the high-gain antenna, then **LAUNCH**.
4. **Orbit** — select a satellite, then head to Mars and land at **Delta Front**.
5. **Explore Mars** — drive freely and follow the beacons to the Leopard-Spot Rock.
   - **W A S D / arrow keys**: drive. **Shift**: faster. **Drag**: look around. **Scroll**: zoom.
   - Near a site, press **E** and pick an action. Try context imaging, then abrasion, then the X-ray map.
   - At the *Possible biosignature?* card, choose to gather more evidence.
   - Handle Mission Control's power anomaly, solar particle event and dust storm cards.
   - Press **R** to rest and recharge, and **J** for the journal.
6. **Report (F)** — choose the cautious *potential biosignature* conclusion. Your antenna decides how much data reaches Earth.
7. **Debrief** — *What your choices changed* explains the consequences. Open the **What-If machine**, switch to the low-gain antenna and re-run: fewer data products arrive and the science score falls. This is a real recomputation.
8. **Final check** — before/after scores built only from your real answers.

## Credits

The **Sources & credits** screen in the game lists every fact source and image. NASA images are used under NASA media guidelines, as follows:

| Images | Credit |
|---|---|
| Earth textures (Blue Marble) | NASA Earth Observatory |
| Mars global map (Viking mosaic) | NASA/JPL/USGS |
| Jezero, Cheyava Falls, Sapphire Canyon and PIXL images, Perseverance selfie | NASA/JPL-Caltech/MSSS/ASU/JHU-APL, as listed per image |

Everything else is original or synthesized in code:
- The rover, launchers and terrain are procedural.
- Sound effects are generated with Web Audio.
- Narration uses the browser's synthetic voice, labeled as a fictional narrator.

Fonts are Space Grotesk, Inter and IBM Plex Sans Arabic (SIL OFL). No NASA insignia is used.

The Arabic translation was machine-drafted and needs review by a native speaker.
