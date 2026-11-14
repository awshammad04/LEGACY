# Graphics kit integration (branch `graphics-kit-integration`)

Visual layer from `LEGACY_GRAPHICS_INTEGRATION_KIT.zip` added to the Mars surface of Missions 02 and 03.
Game logic is untouched: missions, controller, collisions, resources, saves, quizzes and all other scenes behave as before.
`master` and the production deployment are unchanged.

## How the kit maps onto this game

| | This game | Adaptation |
|---|---|---|
| Engine | React 19 + React Three Fiber 9, Three.js r180 (same version as the kit) | Kit factories receive the game's `THREE`; no second copy, no new dependency |
| Loop / input / camera | R3F `useFrame`, `DrivableRover` controller, OrbitControls follow camera | Kept as the only authority; kit code runs inside the existing loop |
| Units / axes | 1 unit = 1.5 m, Y-up, rover forward = (cos h, 0, −sin h) | One pose adapter in `roverfx.tsx`: kit x = game z, kit z = −game x, kit heading delta = −game heading delta |
| Terrain / colliders | Analytic `heightAt`, deterministic rock field + slope limits | Geometry and colliders kept; only materials change (materials-only path) |
| Rover | Design-driven procedural model (parts follow workshop choices) | Kept; its wheel rig gained a steering pivot and the kit's wheel kinematics |

## What changed visually (Mars surface only)

- Terrain: kit sand diffuse/normal/roughness maps (CC0), repeat 44 to match the reference's texel size relative to the rover; the terrain's own colour attribute is softened in a scoped copy so slope/patch structure survives under the photo texture.
- Rocks: kit rock maps on the existing collider-matched rock meshes (no new obstacles).
- Lighting: kit warm sun (3.0) + cool hemisphere fill (1.5) + exponential fog replace the old directional/hemisphere/fog in this scene only; shadow camera widened for this scale; fog density adapted from 0.0032/m to 0.0016/m because this map is 1350 m wide. Renderer not reconfigured (the existing pipeline already applies ACES once). Sky dome kept. Image-based light reduced to 0.35 so lights don't stack.
- Rover: kit soft contact shadow; four corner wheels steer with rear counter-steer, middle axle straight, each wheel rolls by its own travel (actual displacement and turning radius, reverse included). Steering and rolling are separate pivot groups. Discontinuities (load, rewind, teleport) reset the visual wheel state.
- Moon (Mission 01), menus, workshop, launch, orbit: unchanged.

## Switch and rollback

- Runtime switch: add `?visuals=classic` to the URL to see or fall back to the previous look (nothing in saves depends on it).
- Full rollback: `git switch master` (this branch is separate; master was not modified).

## Changed files (vs master)

New: `src/legacy-visuals/` (kit `portable/*.js` copied unchanged, `.d.ts` type declarations, `MarsKit.tsx`, `flag.ts`, `ATTRIBUTION.md`), `public/legacy-visuals/assets/*.jpg` (6 maps, SHA-256 verified against the kit), `docs/graphics-integration/`.
Modified: `src/scenes/explore.tsx`, `src/scenes/roverfx.tsx`, `src/scenes/surface.tsx`, `src/scenes/terrainfx.tsx`, `src/App.tsx` (test-mode hook only), `src/content/assets.ts` and `src/ui/CreditsScreen.tsx` (credits), `src/game/ar.json` (Arabic for new credit lines).
No schema, save-format or dependency changes.

## Results

- Unit tests: 49/49 before and after.
- End-to-end (Playwright, Edge): 6/6 before and after, including the full Mission 02 run with reload/continue, Mission 03 on Mars and Mission 01 on the Moon.
- Behaviour checks through real key presses (headless Edge on Intel Iris Xe GPU, 1280×800): 16/16 — forward, left/right steering signs (front, middle, rear), outer wheels travelling further, brake/standstill, reverse, pause freeze, teleport reset, stopping at a real rock collider and reversing out, camera above terrain while orbiting, save/load restores position, distance and bumps with clean wheels, leaving and re-entering twice with the same light count and fog restored on exit, no page errors.
- Performance (headless Edge, Intel Iris Xe, quality High, 1280×800, 10 s while driving, two runs each): classic 47.6–48.9 fps, kit 46.5–47.0 fps (≈2% cost). Headless frame pacing caps near 45–50 fps, so absolute numbers understate a normal window.

## Not covered

- The kit's own rover model and terrain factory are not used (the game keeps its design-driven rover and its own terrain, as the guide recommends for an existing rig).
- The Moon buggy (Mission 01) keeps its simple wheel spin.
- Low-quality mode was not separately profiled; it disables kit shadows as designed.
- The game's slope blocking and turning-in-place behaviour are unchanged, so a point turn shows the parked-steer preview rather than true tangent steering.

Screenshots: `m2-before.png` / `m2-after.png`, `m2-start-before.png` / `m2-start-after.png`, `m3-before.png` / `m3-after.png` (same scripted inputs and viewpoint, 1280×800).
