# Shared cinematic launch — 2026-11-14

All four missions now run the existing Mission 03 cinematic inside the application's single R3F Canvas. No dependencies, renderer, production animation loop, or camera controller were added.

The pre-change Git checkpoint is `checkpoint/mission3-cinematic-before-shared-2026-11-14`, pointing to `0e28617`. After verification, the implementation was deployed to the existing Vercel project at the user's request: [production site](https://legacy-mission-game.vercel.app), deployment `dpl_2Sw6eKxBbSNzLo9WiqoNEYBerfqC`. Vercel reported **READY** and assigned the existing production domain. The Vercel configuration was not changed, and no Git push was performed.

## Reused implementation

`Facility.tsx`, `Atmosphere.tsx`, `Exhaust.tsx`, `camera.ts`, `audio.ts`, `geometry.tsx`, and `controller.ts` are unchanged. They supply the detailed pad and service arms, atmospheric sky and lighting, shader exhaust and smoke particles, camera director and ascent path, synthesized audio, batched facility geometry, and pause/resume/skip timeline. The countdown, ignition, liftoff and ascent still follow the original 25-second sequence.

Mission 03 keeps its original rocket geometry, markings, material values, HUD copy, captions, timing, camera shots, and effects at every launcher tier. Other missions reuse the same detailed first stage, engines, facility and effects, with mission-number markings and adapted upper sections. Mission 01 has a crew capsule and escape tower; Mission 04 has a narrower observatory fairing. Their fairing width also follows the selected launcher tier. These are fictional visual variants; the actual workshop configuration and modeled capacities remain owned by the existing game state.

## Modified files

| Files | Change |
| --- | --- |
| `src/launch/legacyHost.ts` | Generalized the Mission 03 adapter to all missions. Authorization and callbacks are bound to the mission and save seed; disposed controllers cannot advance a different run. |
| `src/launch/missions.ts` | Added mission presentation, payload identity, dialogue, and fairing configuration. |
| `src/launch/LaunchHud.tsx` | Accepts mission presentation; preserves Mission 03 defaults and existing controls. |
| `src/launch/LaunchScene.tsx`, `Vehicle.tsx` | Pass presentation and launcher tier into the existing vehicle; retain the original world, effects and camera management. |
| `src/App.tsx`, `src/ui/MissionScreens.tsx` | Route every authorized launch to the shared scene and HUD. |
| `src/ui/Subtitles.tsx` | Suppress the host's duplicate caption box during every cinematic. |
| `src/scenes/scenes.tsx`, `src/ui/screens/FlightScreens.tsx` | Removed the replaced launch scene, smoke implementation and independent wall-clock/RAF launch HUD. |
| `src/game/ar.json` | Added Arabic mission identities and dialogue. |
| `src/launch/legacyHost.test.tsx` | Added four-mission authorization, pause, finish, skip, stale callback, save/continue, state preservation and translation tests, including React Strict Mode. |
| `tests/e2e/launch.spec.ts` | Added full-duration browser launches and Arabic/control/save/skip runs for all four missions, plus captured visual evidence and frame timings. |
| `tests/e2e/mission2.spec.ts` | Existing gameplay tests explicitly skip the cinematic; full playback is tested separately. |
| `playwright.config.ts` | Use an explicit IPv4 local address consistently for the server and browser. |

No mission definitions, readiness rules, reducer, resources, objectives, persistence schema, or later gameplay stages were changed.

## Verification

- Unit tests: **64 passed** (52 existing plus 12 integration tests).
- Launch browser tests: **8 passed**, using real Edge windows at 1280×720 with hardware rendering. Each mission ran all five launch phases and reached its defined next stage exactly once. Each also passed saved-launch continuation, Arabic/RTL, camera selection, low graphics, reduced motion, audio activation and paused skip.
- Full-state comparisons against the existing reducer verify design, resources, quiz results, priorities, crew, evidence and objectives remain intact. Mission 04's handoff retains its existing observing-state initialization.
- Actual Edge captures were visually reviewed for every mission, including comparisons with the previous Mission 03 evidence. Representative images are beside this report: `m1-*` through `m4-*`.
- Existing gameplay suite: **6 passed**, including all four complete mission flows, persistence, Arabic layout and accessibility. These retain the existing software-rendering test configuration.
- Final production build: **passed** (`tsc --noEmit` and Vite). `git diff --check` also passed.
- Vercel production build: **passed**. Five post-deployment checks passed: the public site returned HTTP 200 with a main JavaScript bundle identical to the verified local build, and each of the four live missions entered its cinematic and handed off exactly once to its correct next stage. The launch checks also exercised pause and skip without page errors.

The screenshot-recording launch runs had median frame times of **11.1 ms** (about **90 fps**) for all four missions. Their p95 values were 11.3, 22.3, 33.3 and 11.9 ms respectively; these runs include screenshot capture and test interactions.

A separate comparison served an archived copy of checkpoint `0e28617` on port 5174 and the current code on port 5173, using the same package, settings, viewport, Edge version and Intel Iris Xe GPU. It sampled animation-frame intervals after the first 1.5 seconds, without screenshots. Headed timings varied: checkpoint median 11.2 ms / p95 33.5 ms, current median 33.3 ms / p95 33.6 ms. A headless repeat reversed the order and measured **both versions at 33.3 ms median**, with p95 **33.7 ms before / 33.6 ms after**. This repeat did not reproduce a performance regression attributable to the change. Both completed successfully. The raw results are preserved in `performance-comparison.json`; frame scheduling varied across runs, so these measurements are not a fixed frame-rate guarantee.

## Practical limits

The original audio remains opt-in in Options. A saved launch restarts the cinematic when continued, preserving the original save behavior and all mission progress; the cinematic playback timestamp is not persisted. Mission 03 deliberately keeps its original single vehicle appearance across tiers. Rendering checks cover this Windows/Edge machine, not every device or browser. The desktop inspection helper could not verify Edge's URL, so visual review used actual Playwright browser captures.
