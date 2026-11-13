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
| **02 — The Martian Mystery** (robotic, Jezero Crater, Cheyava Falls / Sapphire Canyon) | Fully playable end to end, in English and Arabic |
| 01 — Echoes of Apollo (crewed, Moon) | Briefing preview. The operations stage is in development and will reuse the same systems. |
| 03 — The Lost Rover: Opportunity (robotic, Mars) | Briefing preview. The operations stage is in development and will reuse the same systems. |
| 04 — The Cosmic Photographer (telescope) | Briefing preview. The operations stage is in development and will reuse the same systems. |

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

1. **Home** — show the four missions and the 3-question panel. Toggle **العربية** to show the full right-to-left layout, then toggle back.
2. **Start Mission 02** — answer the baseline quiz.
3. **Briefing** — pick "Ancient microbial activity". Open *How we chose this budget*.
4. **Workshop** — add the robotic arm, the abrasion drill and the X-ray spectrometer, then run the review. It is blocked: "Rover exceeds the landing system limit by 19 kg".
5. **Fix the design** — choose the sky-crane landing, the rocker-bogie chassis, large solar arrays and the high-gain antenna. Run the review: *Mission authorization granted*, then **LAUNCH**.
6. **Orbit** — click a satellite, try one puzzle match, then perform the transfer burn and land at **Delta Front**.
7. **Surface** — add *Target rock*, then **Uplink**. Handle the power anomaly, then choose **safe mode** for the solar event.
8. **Evidence** — run context imaging, abrasion and the X-ray map. At the alert, choose *Gather independent measurements*. Then run the Raman scan and cache a sample.
9. **Report** — downlink the key data. Pick careful statements, then **Send**.
10. **Debrief** — open the **What-If machine** and switch to the low-gain antenna. Re-run: fewer data products reach Earth and the science score drops. This is a real recomputation.
11. **Final check** — show the before/after results and the Legacy Archive.

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
