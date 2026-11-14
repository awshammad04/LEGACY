# Teammate launch cinematic: Mission 03 integration (branch `launch-integration`)

This page records the original integration. The cinematic is now shared across all four missions; see [Shared cinematic launch](../shared-launch/README.md) for the current implementation and verification.

## What was integrated

The teammate's `src/launch/` package is copied **unchanged** into `src/launch/`. It contains:
- the Pioneer 03 rocket;
- the launch facility with animated service arms;
- ignition, exhaust and smoke particles;
- the sky, lighting and atmosphere;
- the cinematic camera director with Director, Pad, Vehicle and Engines views;
- the countdown HUD with Mission Control captions;
- optional synthesized engine audio;
- pause, resume and skip;
- graphics-quality and reduced-motion options.

Their `patches/mission-03.patch` targets an older copy of our app (it expects `PostFX` and `TestHooks`), so its two routing changes were applied by hand:

| File | Change |
|---|---|
| `src/App.tsx` | Mission 03's `launch` stage renders `<CinematicLaunch>` inside our existing Canvas. Our bloom/vignette pass is suspended while it runs. |
| `src/ui/MissionScreens.tsx` | Mission 03's `launch` stage shows `<LaunchHud>`. Recovery goes through the adapter's `proceedFromLaunch`. |
| `src/ui/Subtitles.tsx` | Our Mission Control box is hidden during this cinematic, which has its own captions. |
| `src/game/ar.json` | Arabic for every launch HUD string. |

## How it plugs in

- The cinematic starts only when the game reports Mission 03, stage `launch` and `launched = true`. That state is set only after our readiness review passes and the player presses **LAUNCH MISSION**.
- When the cinematic finishes or is skipped, the game dispatches our existing `ADVANCE` action exactly once, to the next stage in Mission 03's definition (`orbit`).
- It uses one renderer, our R3F frame loop and our camera, which it restores afterwards. No new dependencies.
- The save format is unchanged.
- Missions 01, 02 and 04 still use the previous launch scene.

## Verification (2026-11-14)

All runs used Edge on an Intel Iris Xe GPU at 1280×720.

- **Unit tests:** 52/52 pass, including the package's 3 controller tests.
- **End-to-end:** 6/6 pass, including the full Mission 03 run and the other three missions.
- **Mission 03 browser runs** (watch, controls, Arabic):
  - The readiness review passes and LAUNCH starts the cinematic.
  - The cinematic shows the pad, terminal count, ignition, liftoff and ascent, matching the teammate's `evidence/` screenshots.
  - Pause freezes the clock (T−06 stays T−06) and Resume continues.
  - The Options panel and the Engines camera work.
  - Skip and natural completion both end at `orbit` with **one** `ADVANCE` action.
- **Arabic:** the HUD is translated and right-to-left.
- **Errors:** no console errors in any run.
- **Performance during the cinematic:** median 90 fps, 95th-percentile frame 11.3 ms, over 20 s.

## Remaining issues

- The rocket size no longer follows the player's launcher choice. The old scene scaled the rocket with the chosen launcher, but the package has a single `pioneer` vehicle preset.
- The HUD text is written for Mission 03: "MISSION 03", "The Lost Rover", "Pioneer 03", and "the rover is secured".

## Reuse for Missions 01, 02 and 04

Reuse is feasible but not done yet:
- **Reusable as they are:** the controller, camera director, facility, atmosphere and exhaust do not depend on any mission.
- **Needed changes:**
  1. Pass the mission's title and captions to the HUD as props.
  2. Generalise the `legacyHost` mission id.
  3. Add vehicle presets:
     - Mission 01: a crewed heavy-lift rocket with a capsule and launch-escape tower;
     - Mission 02: a medium rocket with a payload fairing;
     - Mission 04: a small launcher;
     - ideally each preset is sized by the launcher tier the player chose.

## Roll back

Run `git checkout master`, or delete `src/launch/` and revert the three files above. Existing saves need no migration.
