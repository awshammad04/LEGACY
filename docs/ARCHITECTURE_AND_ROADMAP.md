# LEGACY — Architecture, Requirements Matrix & Implementation Roadmap

## Context

`C:\Users\Aws Hammad\Desktop\NASA` contains only `LEGACY_REQUIREMENTS.md`, so this is a greenfield project. The spec describes a 3D educational browser game with four missions. Every mission runs the same loop: choose a mission → 3-question pre-quiz → Earth briefing → budgeted build workshop → readiness review → launch → orbit → operations → events → evidence → debrief → post-quiz → rewind.

**Hard constraints from you:** it must be demo-ready by **Nov 14, 2026**, with about **12 hours** of active development. It must support **English + Arabic (RTL)**.

**What this means for scope:**
- The architecture covers all four missions and is fully data-driven.
- Only **one mission ships end-to-end tomorrow**.
- The other three appear on the home screen as honest "in development" briefings, with a stretch goal described in §6.
- Every feature in the demo is real: no fake progress, no invented learning gains, no unlabeled fiction.

---

## 1. Requirements analysis — key design implications

| Area | What the spec really demands | Design consequence |
|---|---|---|
| Flow | Mission choice comes first. The quiz runs before any teaching. The Earth stage is mandatory. Launch cannot happen while any mandatory rule fails. | A generic **stage machine** driven by mission data. Guards come from a **readiness rule engine**. |
| Budget/workshop | Basic/Balanced/Advanced tiers. One part changes cost, mass, power, data and thermal together. The reserve is protected. Failures must be explained. | A **Design Evaluator** that derives all metrics from the selected parts. Each rule returns measured value, limit, difference, a message and a provenance tag. |
| Consequences | Earth choices must limit later operations. A replay must *recompute* results, not show a prewritten ending. | The **simulation is a pure, deterministic reducer over an action log** (event sourcing). Rewind = change one action and re-run the same rules. |
| Quizzes | Exactly 3 questions pre and 3 equivalent questions post. Option order is shuffled. "I'm not sure" is never penalized. Skipping is allowed with a notice. Only measured before/after results are shown. | A **Quiz Engine** with per-mission question pools, seeded shuffle, and a stored baseline. Comparison is computed only from answers actually given. |
| Mission types | Crewed missions show crew health. Robotic and telescope missions show equipment condition and never show astronaut stats. | Each mission declares `type`. The dashboard mounts a **StatusModule** (CrewHealth or EquipmentCondition) based on it. |
| Events | Events come from context, not random punishment. Each shows cause, options, direct effects, downstream effect and the concept behind it. Solar storms and dust storms are separate hazards. | An **Event Director** with data-defined triggers, options and effects, plus variants per mission type. |
| Integrity | Every number must be identifiable as verified NASA, calculated, or fictional. NASA cost figures must never mix with game budgets. Starlink is credited to SpaceX. Sky scenes are labeled. | A **provenance tag on every content item** with badge UI, a **sources registry**, and an auto-generated credits screen. |
| Communications | Mars has minutes of delay, so the rover cannot be steered in real time. | Mars driving uses **waypoint command sequences, uplink delay and onboard autonomy**. This is authentic, touch-friendly, and needs no physics engine. The Moon (crewed LRV) uses direct driving later. |
| Accessibility | Keyboard + touch, subtitles for all speech, reduced motion, readable type, RTL. | **DOM UI over the 3D canvas** (not in-canvas GUI). All 3D points of interest (POIs) are reachable from the keyboard, colours always have text and icons alongside, and CSS uses logical properties for RTL. |

---

## 2. Technology stack (recommended)

| Concern | Choice | Why |
|---|---|---|
| Language/build | **TypeScript (strict) + Vite** | Fast hot reload, static output, typed content files catch content errors at compile time. |
| 3D | **Three.js via React Three Fiber + drei** (+ `@react-three/postprocessing`) | This game is equal parts dashboard UI and 3D. R3F shares state with the React UI. drei provides controls, `Html`, `Stars`, `useTexture` and more. Babylon's GUI is weaker for accessible, RTL dashboards. Unity WebGL means heavy builds, weak DOM/accessibility support and slow iteration, which is wrong for a 12-hour browser-first game. |
| State | **Pure-TS core reducer + Zustand** store wrapper | The core runs in Node tests with no DOM. The UI and 3D read through selectors. Per-frame data (camera, animation) lives in R3F refs, not the store. |
| Physics | **None.** Analytic terrain height function + kinematic rover | Deterministic, testable and fast. The same terrain function feeds both the mesh and the energy/slope simulation. |
| i18n | Small typed `t()` module for UI strings + `LocalizedText {en, ar}` inline in content | Sets `dir`/`lang` on `<html>`. Uses `Intl` number formatting. No heavy dependency. |
| Fonts | `@fontsource` **Space Grotesk / Inter** + **IBM Plex Sans Arabic** (OFL) | Bundled locally so the game works offline at a venue. |
| Audio | **Web Audio API** for synthesized SFX/ambience. **Web Speech API** for narration, labeled "synthetic narrator voice". | Zero licensing risk and no asset downloads. Subtitles always come from the same script lines. |
| Persistence | `localStorage` versioned save slots (one per mission + profile + archive), wrapped in try/catch | Saves are small action logs. Includes a version field for future migrations. |
| Tests | **Vitest** (core + components), **Playwright** (E2E), **@axe-core/playwright** | Covers the core rules, the full mission path, and accessibility. |
| Deploy | Static `dist/` → Vercel (connector available) or Netlify — **only with your OK at deploy time** | |

---

## 3. Architecture

### 3.1 Layers (dependency direction ↓ only)

```
content/  (typed mission data, quiz pools, events, archive, sources, locales)
   ↓
core/     (pure TS — no React/Three imports)
   flow/ stage machine · sim/ resources, ledger, power, data, mobility, comms
   rules/ readiness · events/ director · science/ evidence · quiz/ · decisions/ log+resim
   save/ · achievements/ · provenance/ · terrain/ height functions · rng.ts
   ↓
game/     (Zustand store, dispatch, autosave, audio, narration, i18n, settings, input)
   ↓
scenes/ (R3F 3D)              ui/ (React DOM overlays)
  hq workshop launch orbit      screens: Home, Quiz, Briefing, Workshop, Review,
  surface (Moon/Mars) evidence  Ops HUD, Evidence, Debrief, Archive, Settings, Credits
  shared: Planet, Atmosphere,   hud: ResourceDashboard, MessageFeed, StatusModule,
  Starfield, Terrain, RoverRig, ProvenanceBadge, LearnCard, Subtitles
  LauncherRig, Satellite, POI,
  CameraRig, Cinematic
```

### 3.2 Core principle: deterministic event-sourced simulation

- `GameState = reduce(initialState(mission, seed), actions[])`. Every player decision is a typed action, for example `SELECT_COMPONENT`, `CONFIRM_LAUNCH`, `CHOOSE_LANDING_SITE`, `EXECUTE_ROUTE{waypoints,speedMode}`, `EVENT_CHOICE`, `RUN_OBSERVATION`, `SUBMIT_REPORT`.
- **3D is a view, not the truth.** The rover animation replays the result of `EXECUTE_ROUTE`; it does not decide it.
- **Save** = mission id + seed + action log + stage checkpoint indices.
- **Rewind/What-If** = take the log, replace decision *k*, and re-reduce. Later actions are re-applied where still valid. Invalid ones fall back to the safest default and are flagged. The result is a side-by-side comparison of outcomes under the same rules.
- **Testing** = feed scripted action logs ("optimal", "underpowered", "reckless") and assert outcomes.

### 3.3 Reusable systems for all four missions

| System | Interface (summary) | M1 Apollo | M2 Martian Mystery | M3 Lost Rover | M4 Cosmic Photographer |
|---|---|---|---|---|---|
| MissionDefinition | type, budget, reserveMin, stages[], slots[], rules[], events[], pois[], quiz, archive, achievements | crewed | robotic | robotic (+fictional crewed variant later) | telescope |
| Stage machine | ordered stages from data. Guards come from rules. Autosaves on every transition. | Earth→Orbit→Moon | Earth→Orbit→Mars | Earth→Orbit→Mars | Earth→Orbit/Observatory |
| Workshop + Design Evaluator | slots × tiers + optional instruments → cost, mass, power, energy, data, thermal, capabilities | launcher, CSM, lander, LRV, life support | launcher, EDL, chassis, nav, power, instruments, comms | solar+battery, wheels, cameras | platform, optics/sensor, pointing, power, comms |
| Readiness rules (shared library) | `{id, pass, measured, limit, delta, messageKey, provenance}` | + crew life support | mass, landing, power, data, reserve | + dust margin | + pointing/storage |
| Ops simulation | terrain mobility (slope × speed → energy, time, risk), comm delay/relay windows | direct drive (1.3 s delay) | waypoints + ~4–24 min delay | waypoints + solar | pointing/exposure timeline |
| Event Director | trigger(stage, condition) → options → effects + concept | solar storm (crew shelter), EVA emergency | power anomaly, solar storm (electronics/comms), comm blackout | **dust storm (solar only)** | solar storm (instrument safing) |
| StatusModule | `CrewHealth` (sleep, fatigue, hydration, exercise, stress, simulated exposure, history) or `EquipmentCondition` (battery, wheels, temperature, instruments, link) | CrewHealth | Equipment | Equipment | Equipment |
| Science/Evidence | `Observation → EvidenceItem{quality, supports[], uncertainty}` → report grading | heritage documentation with keep-out zones | hypotheses × instruments matrix | heritage photo survey | SNR ∝ √exposure, wavelength → feature |
| Quiz Engine | pre/post pools, Q3 variant per mission, seeded shuffle, not-sure, skip | heritage Q3 variant | biosignature Q3 | heritage Q3 variant | single-observation Q3 variant |
| Decision log + What-If | log entries carry cause → effect text for the debrief timeline | ✓ | ✓ | ✓ | ✓ |
| Point-to-Learn + Archive | `LearnCard{name, what, does, why, connection, source}`, `Memory{story, image, model?, explanation, applyQuestion}` | ✓ | ✓ | ✓ | ✓ |
| Provenance & attribution | `verified \| calculated \| fictional` + sourceId → badge + credits | ✓ | ✓ | ✓ | ✓ |

---

## 4. First playable mission: **Mission 02 — The Martian Mystery**

**Why this one:**
1. It exercises the **entire core loop and every shared system except crew health**.
2. Its key lesson (evidence before certainty) maps directly to baseline Q3. It is anchored in NASA's Sept 2025 Sapphire Canyon "potential biosignature" announcement, which makes it the strongest educational demo.
3. Its Mars terrain, rover rig, waypoint driving and equipment model are **reused almost wholesale by Mission 3**.
4. It avoids the largest content subsystem (crew health and the astronaut-day routine) under a 12-hour budget. That subsystem is scheduled with Mission 1 in Phase 2.

**Mission 2 playable design (demo build):**
- **Pre-quiz:** Q1/Q2/Q3 from the spec, shuffled, with "I'm not sure". Shows "Baseline saved…" afterwards.
- **Earth briefing:**
  - Three explanations for the "leopard spots": biological activity (potential biosignature), abiotic chemistry, and later alteration.
  - The player picks a science priority before choosing instruments.
  - A NASA fact card is shown.
  - Shows a "Simulation Budget — NASA-inspired educational estimate: $2.7B" label with a "How we chose this budget" explainer citing the Mars 2020 figure as a scale reference.
- **Workshop:** a procedural 3D rover on a clean-room turntable. Visuals change with the choices: mast height, arm, RTG vs solar panels, antenna size.
  - Mandatory slots (Basic/Balanced/Advanced): launcher, cruise/EDL (precision affects landing-ellipse options later), chassis/mobility, navigation/autonomy, power (radioisotope vs solar + battery), comms (direct-to-Earth plus relay), storage, protection.
  - Optional instruments, each inspired by but not identical to the real instrument: context camera, zoom imager, abrasion tool, X-ray chemistry spectrometer (PIXL-inspired), UV Raman organics/mineral spectrometer (SHERLOC-inspired), ground-penetrating radar (RIMFAX-inspired).
  - Live budget bar with a protected reserve, plus mass/power/data/thermal meters and ground warnings.
- **Readiness review:**
  - Explains each failure, for example "Payload exceeds launcher capacity by 24 kg", and offers Return to Workshop.
  - Never lets launch bypass a mandatory rule.
  - On pass: "Mission authorization granted" → **LAUNCH MISSION**.
- **Launch:** a cinematic of a procedural launcher (size by tier) with ignition, ascent, staging and fairing separation. It can be skipped, and reduced motion shortens it to a fade.
- **Orbit:**
  - Earth with a NASA texture and illustrative satellites (Starlink shell labeled "operated by SpaceX"; NASA Terra, Aqua, Landsat 9 and ISS), with Point-to-Learn cards.
  - A short Mission Parts puzzle matching clues to Apollo 15, Perseverance, Opportunity and space telescopes. Wrong matches give hints.
  - Mars orbit: **choose a landing ellipse** on a NASA orbital image of Jezero. The EDL tier decides which ellipses are allowed, so a closer site means a shorter drive.
- **Mars surface:**
  - Stylized Jezero-inspired terrain (analytic heightfield: delta fan, crater floor, rocks), labeled "Illustrative terrain — not to scale".
  - Butterscotch sky, dust and shadows.
  - The player places waypoints, sees predicted energy, time and risk, and uplinks. A delay is shown, then the rover drives using autonomy. Speed mode trades time against risk.
  - Two events. **Power anomaly:** shed loads, use the reserve, or drop an optional observation. **Solar particle event:** safe the electronics and pause comms; explicitly not a dust storm.
- **Evidence:**
  - At the Cheyava-Falls-inspired rock, run the observations your equipped instruments allow. Each costs power, time and data.
  - An evidence board updates support for each hypothesis. Missing instruments give **incomplete information**, never a fake "life detected".
  - Alert: "Possible biosignature? Further investigation required." Choices: announce / gather more / cautious report.
  - Downlink selection under a data cap, then a science report graded on whether claims match the evidence. The best ending: potential biosignature, alternatives listed, sample cached for possible return.
- **Debrief:**
  - Outcome across science, feasibility and safety.
  - **Decision Timeline**, plus **What-If** (rewind to the workshop or landing site → re-simulate → comparison table) and **Replay from checkpoint**.
  - Achievements: Careful Investigator, Scientific Pioneer, Mission Redesign Required.
  - Post-quiz with 3 equivalent questions, then before/after built only from real answers (or a "no comparison available" notice if the pre-quiz was skipped). Per-question explanations.
  - Archive entries unlocked: Perseverance, Cheyava Falls/Sapphire Canyon, Jezero delta, instrument heritage. All use NASA images with credits.
- **Missions 1, 3, 4 (demo):**
  - The card opens a briefing preview: destination, objective, type, budget with the label, NASA scale references, and an "Operations stage in development" notice.
  - The quiz is not started for them, so no fake baseline is recorded.

---

## 5. Assets, NASA resources & attribution

**12-hour strategy:**
- **Procedural low-poly models in code** for everything the player designs (rover, launcher, lander, satellites). There is no download risk, they match the visual style, and tiers change them visually.
- **A handful of NASA images and textures** for authenticity.
- **No DEM processing or large GLB pipeline** before the deadline.

| Asset | Source (verify license + exact file at fetch) | Use | Phase |
|---|---|---|---|
| Earth day texture (Blue Marble) | NASA Visible Earth | HQ backdrop, orbit | Demo |
| Mars global colour map | NASA/USGS (Viking/MOLA mosaic) | Mars orbit globe | Demo |
| Jezero orbital image (delta, CTX/HiRISE) | NASA/JPL-Caltech/(MSSS or UArizona) | Landing-site selection | Demo |
| Cheyava Falls & Sapphire Canyon images | NASA/JPL-Caltech/MSSS (NASA Sept 10 2025 release) | Evidence + archive | Demo |
| Perseverance rover photo | NASA/JPL-Caltech | Archive | Demo |
| Starfield | Procedural, labeled "Illustrative sky — not a real-time star map" | All space scenes | Demo |
| Spirit & Opportunity GLB (~9.8 MB) | NASA 3D Resources (nasa3d.arc.nasa.gov/detail/spirit) | M3 heritage object | Phase 2 |
| LRV / Apollo LM model | NASA 3D Resources if available, else a reconstruction marked "reconstructed" | M1 | Phase 2 |
| Jezero / Hadley DEM heightmaps | HiRISE DTM / Mars Trek / Moon Trek / LROC NAC DTM | Real terrain | Phase 2 |
| Moon textures | NASA SVS CGI Moon Kit (LROC + LOLA) | M1 | Phase 2 |
| Supernova case study | SN 2023ixf in M101: Hubble optical image, Swift UV detection, NuSTAR X-ray (+ SN 1987A archive) | M4 | Phase 2 |
| SFX/ambience | Synthesized via Web Audio | All | Demo |
| Narration | Web Speech API, labeled synthetic fictional narrator | All | Demo |
| Fonts | Space Grotesk, Inter, IBM Plex Sans Arabic (OFL) | UI | Demo |

**Attribution rules:**
- `content/shared/sources.ts` records id, title, credit line, URL, license and access date.
- `public/assets/ASSETS.json` maps each file to a source id.
- Credit lines appear in context on every image and card, and the Credits screen is generated from the registry.
- A unit test fails if any asset or "verified" fact lacks a source.
- No NASA insignia (meatball or worm) and no endorsement wording. Footer: "Independent educational project for NASA Space Apps Challenge 2026 — not an official NASA product."

**Downloads:** at the asset step I'll show you the exact file list, sources and sizes (~10–20 MB total) and fetch them only after your OK.

---

## 6. Milestones (12-hour sprint) — acceptance criteria & tests

Checkpoint commits happen after each milestone (`git init` in M0). Each **⛔ cut line** says what to drop if a checkpoint is late.

| # | Hours | Milestone | Done when (acceptance) | Tests |
|---|---|---|---|---|
| M0 | 0–0.75 | **Foundation**: Vite + React + TS + R3F scaffold, folder layout, stage router, UI kit (glass panels, tokens), EN/AR fonts, `t()` + RTL switch, Vitest + Playwright config, `.claude/launch.json`, `docs/` (architecture, matrix, roadmap, assets from this plan) | Dev server shows a 3D canvas + DOM overlay. The language toggle flips `dir` and the layout mirrors. `npm test` passes. | smoke unit test, Playwright loads page |
| M1 | 0.75–2.25 | **Core simulation**: types, Mission 2 content, reducer + action log, ledger + protected reserve, Design Evaluator, readiness rules, quiz engine, save/load, provenance, resimulate | Pure-TS core drives a whole Mission 2 run headlessly from an action script | **Unit:** each rule's pass/fail + delta message; reserve can't be spent silently; quiz shuffle seeded + "not sure" scores 0, no penalty; save round-trip; **golden scripts** (optimal/underpowered) give the expected outcomes; resim with a bigger battery changes the outcome |
| M2 | 2.25–3.25 | **Home + pre-quiz + briefing**: HQ scene (Earth hologram), 4 mission cards (type, destination, budget label, Start/Continue), "Before You Launch: 3 Questions" preview, Continue panel, Settings (language, subtitles, narration, reduced motion, quality), Mission 2 quiz → baseline, briefing + hypothesis priority + budget explainer | Picking Mission 2 → quiz → "Baseline saved" → briefing. Skip shows the no-comparison notice. Reload → "Continue Mission". | RTL component test of the quiz; E2E: select → quiz → reload → continue |
| M3 | 3.25–5 | **Workshop + readiness review**: 3D modular rover turntable, slot/tier cards with badges, live meters, warnings, review screen | A failing design shows specific reasons → Return to Workshop → fix → pass → LAUNCH enabled | Component: review renders deltas; E2E: overweight design is blocked, then a fixed design passes |
| ⛔ | @5h | If late: drop the turntable part animations (swap parts instantly) | | |
| M4 | 5–6.25 | **Launch + orbit**: cinematic (skip, reduced-motion variant), Earth + satellites + LearnCards, parts puzzle, Mars-orbit landing-ellipse choice gated by EDL tier | Launch → orbit → puzzle → ellipse choice → descent fade to Mars. Autosave at each transition. | Unit: puzzle matching + hints, ellipse gating; E2E passes through with the `?test` hook skipping the cinematic |
| ⛔ | @6.25h | If late: cut the parts puzzle (keep the explorer + ellipse choice) | | |
| M5 | 6.25–8.25 | **Mars surface ops**: terrain, sky, rover rig built from the design, waypoint planner with predicted energy/time/risk, uplink delay + autonomous drive, equipment-condition panel, message feed, 2 events | The rover reaches the rock. Energy and time depend on the Earth design. Events show cause, options, effects and concept. | Unit: slope/speed → energy/time/risk; event effects; keyboard can place and confirm waypoints |
| ⛔ | @8.25h | If late: one event only; waypoints limited to 3 preset route options | | |
| M6 | 8.25–9.25 | **Evidence + report**: instrument-gated observations, evidence board, biosignature decision, downlink selection, report grading | Missing instruments yield incomplete evidence. The cautious, evidence-based report scores best. Announcing immediately is explained, never rewarded. | Unit: evidence matrix + grading for 3 instrument sets |
| M7 | 9.25–10.25 | **Debrief + rewind + post-quiz + archive**: timeline, What-If comparison, replay from checkpoint, achievements, post-quiz, before/after, Archive screen | Rewinding to the workshop with a changed part recomputes a different, explained outcome. Before/after shows only measured scores. | Unit: achievements never reward unsafe choices; E2E: full Mission 2 run to the archive |
| ⛔ | @10.25h | If late: What-If = "Replay from Workshop" only (no side-by-side table) | | |
| M8 | 10.25–11.25 | **Arabic + accessibility + audio**: Arabic translation of UI + Mission 2 content (subagent drafts, I integrate), RTL visual QA, narration + subtitles, SFX, keyboard pass, axe, Credits screen, M1/M3/M4 briefing previews | Whole Mission 2 is playable in Arabic with mirrored UI. Zero serious axe violations on main screens. | axe E2E per screen; E2E Mission 2 run in `ar` |
| M9 | 11.25–12 | **Release**: production build, performance check, bug sweep, README + demo script, deploy (with your OK), fallback screen recording guidance | A public URL (or `dist/`) works on desktop Chrome/Edge + tablet width at a reasonable frame rate | full `npm test` + E2E green |

**Stretch, only if M7 finishes early:** playable Earth stage for M1/M3/M4 (quiz → briefing → workshop → review → launch, then an honest "operations in development" end), Look Around sky with planet positions, archive 3D viewer.

**Parallelism during the sprint:** subagents draft content that doesn't block the engine: the Arabic translation, Mission 2 fact cards with source URLs, and an accuracy check of every "verified" fact. I integrate and review their output.

---

## 7. Requirements matrix (status at the Nov 14 demo)

✅ demo · ◐ partial/stretch · ⏭ Phase 2

| ID | Requirement (spec section) | System | Status | Verified by |
|---|---|---|---|---|
| R1 | HQ home with 4 cards (destination, objective, type, budget, Start/Continue) | ui/Home | ✅ | E2E |
| R2 | Visible 3-question preview panel; quiz never blocks mission choice | ui/Home, Quiz | ✅ | E2E |
| R3 | Continue panel: saves, stage, discoveries, archive link | save, ui | ✅ | E2E reload |
| R4 | Learn/Accessibility: narration, subtitles, language, controls, fact-vs-fiction explainer | settings | ✅ | manual + axe |
| R5 | Mission choice first → quiz → briefing → workshop order | flow | ✅ (M2) | unit + E2E |
| R6 | Each mission independently selectable with its own save | save | ✅ structure / ◐ content | unit |
| R7 | Exactly 3 pre-quiz Qs, shuffled options, "I'm not sure" with no penalty | quiz | ✅ | unit |
| R8 | Baseline saved, no pass/fail label, message shown | quiz | ✅ | unit |
| R9 | Skip in accessible mode + "no comparison" notice | quiz | ✅ | component |
| R10 | Mission-specific equivalent Q3 variants | quiz content | ✅ M2 / ⏭ others | unit |
| R11 | 3 different equivalent post-quiz Qs; before/after only from real answers | quiz, debrief | ✅ | unit |
| R12 | Fixed budget + "Simulation Budget" label + "How we chose" explainer with NASA refs | workshop, content | ✅ | manual |
| R13 | Basic/Balanced/Advanced tiers; one part affects cost/mass/power/data/thermal | evaluator | ✅ | unit |
| R14 | Protected reserve | ledger | ✅ | unit |
| R15 | Mandatory components | rules | ✅ | unit |
| R16 | Mass vs launch/landing capability | rules | ✅ | unit |
| R17 | Power + battery endurance | rules | ✅ | unit |
| R18 | Data storage + downlink | rules | ✅ | unit |
| R19 | Crewed life-support rules | rules | ⏭ (M1) | — |
| R20 | Readiness review explains *why*; never bypasses safety | ui/Review | ✅ | E2E |
| R21 | Launch cinematic → orbit (M4 advanced: handover, not launch) | scenes/launch | ✅ / ⏭ handover | E2E |
| R22 | Orbit explorer: rotate Earth, tap satellites, Starlink credited to SpaceX, motion labeled illustrative | scenes/orbit | ✅ | manual |
| R23 | Mission Parts & Orbit Puzzle with hints | orbit | ✅ (cut line) | unit |
| R24 | Point-to-Learn cards (6 fields), hover + tap + keyboard, everywhere | ui/LearnCard | ✅ | component + axe |
| R25 | Look Around sky, viewpoint-aware, labeled | scenes/shared | ◐ stretch | — |
| R26 | Orbital survey/landing choice (M2) | orbit | ✅ | unit |
| R27 | Surface navigation with slope/speed → time/energy/risk | sim/mobility | ✅ Mars / ⏭ Moon | unit |
| R28 | Comm delay modeled (Moon vs Mars) | sim/comms | ✅ Mars | unit |
| R29 | Instruments gate evidence; no fabricated "life detected" | science | ✅ | unit |
| R30 | Biosignature decision; evidence before certainty | science | ✅ | unit |
| R31 | Heritage documentation, keep-out zones (NASA 2011 recs, simplified) | science/heritage | ⏭ (M1/M3) | — |
| R32 | Solar storm event, variants by mission type | events | ✅ robotic | unit |
| R33 | EVA emergency/rescue | events | ⏭ | — |
| R34 | Power failure | events | ✅ | unit |
| R35 | Comm delay/blackout event | events | ◐ | unit |
| R36 | Dust storm (solar rovers only; distinct from radiation) | events | ⏭ (M3) | — |
| R37 | Crew Health tab (vitals, sleep, food, exercise, stress, exposure, history, report) | StatusModule | ⏭ (M1) | — |
| R38 | Astronaut-day micro-interactions | interior scene | ⏭ | — |
| R39 | Robotic missions show equipment condition, not crew stats | StatusModule | ✅ | component |
| R40 | Provenance badges: verified / calculated / fictional | provenance | ✅ | unit (registry check) |
| R41 | NASA cost refs never mixed with game budgets | content, UI | ✅ | manual review |
| R42 | Accuracy safeguards (Cheyava Falls "potential", Opportunity 2018/2019, L2, Starlink) | content | ✅ M2-relevant | fact-check pass |
| R43 | Point-of-use credits + credits screen | attribution | ✅ | unit |
| R44 | No NASA endorsement or insignia | UI | ✅ | manual |
| R45 | Autosave at transitions + key decisions; continue from checkpoint | save | ✅ | E2E |
| R46 | Legacy Archive persistence across missions | save/archive | ✅ | E2E |
| R47 | Interactive Memory (voiced story + subtitles, NASA image, model, explanation, apply-question) | archive | ✅ (model ⏭) | manual |
| R48 | Decision Timeline + Rewind that truly recomputes | decisions/resim | ✅ | golden unit |
| R49 | Debrief: science, feasibility, safety, lessons | debrief | ✅ | E2E |
| R50 | Achievements; unsafe choices never rewarded | achievements | ✅ M2 set | unit |
| R51 | Subtitles for all speech, mute narration, reduced motion | a11y | ✅ | manual |
| R52 | Keyboard + touch controls | input/ui | ✅ | E2E keyboard |
| R53 | English + Arabic RTL | i18n | ✅ (machine-drafted Arabic, needs native review) | E2E `ar` |
| R54 | Missions 1, 3, 4 playable | content + scenes | ⏭ (briefing previews only) | — |
| R55 | Teacher/pilot export of quiz results (no personal data) | save | ⏭ | — |

---

## 8. Post-deadline roadmap (Phase 2, after Nov 14)

1. **Mission 3 — Lost Rover** (reuses the Mars stack): solar power + dust-storm event, wheel wear, NASA MER GLB as the heritage object, photo-documentation scoring with keep-out zones, orbital clue puzzle.
2. **Crew systems**: CrewHealth StatusModule, schedule/check-ins, astronaut-day interactions, spacecraft interior, EVA emergency event.
3. **Mission 1 — Echoes of Apollo**: Hadley–Apennine terrain from LROC/LOLA, direct LRV driving, 75 m artifact boundary (simplified from NASA's 2011 recommendations), fatigue decision, crew solar-storm shelter.
4. **Mission 4 — Cosmic Photographer**: compact observatory workshop, commissioning, pointing/exposure/wavelength/downlink model, SN 2023ixf multi-wavelength case, advanced L2 handover mode.
5. **Polish**: real DEM terrain, NASA GLBs (compressed with gltf-transform/KTX2), CelesTrak snapshot propagation with timestamp, astronomy-engine sky, recorded narration, native Arabic review, PWA offline, teacher export, classroom pilot.

---

## 9. Verification (end-to-end)

- `npm run typecheck && npm test`: core unit tests, golden action-script runs, and the content/attribution registry test.
- `npm run e2e`: Playwright full Mission 2 run in **en** and **ar**, a reload/continue check, the blocked-launch path, and axe on each screen.
- **Visual check in the built-in browser** (`.claude/launch.json` → Vite dev server). Screenshots of every stage at desktop and tablet widths in both languages, and with reduced motion on.
- Manual demo script: a deliberately overweight design gets blocked → fix → launch → solar event → reach the rock → cautious report → debrief → rewind with a bigger battery shows a different result → post-quiz before/after.
- Production build size and frame-rate spot check before deploy.

## Decisions baked into this plan (tell me if you want any changed)

- Mission 2 ships first. Missions 1, 3 and 4 show honest briefing previews tomorrow.
- Crew health is deferred to Phase 2 with Mission 1.
- Procedural 3D models and terrain for the deadline. Real NASA DEMs and GLBs come later.
- I translate the Arabic and it is flagged for native-speaker review.
- Checkpoint git commits after each milestone. Asset downloads and deployment each get a confirmation from you at the time.
