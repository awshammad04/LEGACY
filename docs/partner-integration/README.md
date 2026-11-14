# Partner graphics integration (branch `partner-graphics-v2`)

The teammate's **LEGACY Graphics Integration Kit** now drives the Mars surface look for Missions 02 and 03. Our game stays the foundation: missions, rules, saves, controller, camera authority, quizzes, What-If, menu and EN/AR are unchanged.

## What was reused from the kit (actual code and assets)

The kit's `portable/` modules and textures are byte-identical copies in `src/legacy-visuals/`. They are adapted to React Three Fiber in `src/legacy-visuals/MarsKit.tsx`.

| Kit piece | How it is used |
|---|---|
| `createMarsMaterials`: CC0 sand and rock diffuse, normal and roughness maps | Applied to our terrain mesh and to our collidable rock field. The ground repeat matches the kit's ~15 m tile. |
| Kit terrain palette (firm vs rough ground) | Vertex colours on our terrain geometry, which keeps our `heightAt`, so collisions match what you see. |
| Kit boulder shapes, stratified caps and gravel | Drawn at **our** collider positions and radii. The gravel follows the rover in tiles and is not solid. |
| `createMarsLighting`: warm sun, hemisphere fill, exponential haze, 2048 shadows | Created and disposed with the scene, without touching renderer settings. Only exposure is set to 1.08 and then restored. The fog thickens in dust storms. |
| Kit sky shader | Sky dome. |
| `createRoverVisual`: LGC-01 rover with 4-wheel steering, per-wheel rolling, suspension links and contact shadow | Driven by **our** controller through a one-line pose adapter (heading conversion). It resets after a teleport, a rest or a save restore. |
| The same rover in the build workshop | It is dressed with the player's choices: solar wings vs radioisotope unit, larger panels, antenna size, mast height, robotic arm and weather boom. |

Optimisations that keep the look unchanged:
- Static rover parts are merged per material, cutting about 300 draw calls to about 40.
- Gravel uses a coarser sphere with the same displacement.

## What was preserved

- Our controller, collisions, slope limits, battery and mission values, sites and interactions, save schema, camera system, and the single render loop.
- The Moon (Mission 01), the telescope (Mission 04), the astronaut, the menu and all other scenes are untouched.
- The previous Mars look is still in the code as `ClassicEnvironment`.

**PART_01 Mars Rover module:** none of its code was integrated. It ships a full second controller, battery, input, HUD and camera. Installing it would duplicate ours, and only one rover visual is allowed, so the kit rover was chosen. Its tyre tracks and dust effects are a possible follow-up.

## Compare and roll back

- Integrated look: `http://localhost:5173/`
- Previous look: `http://localhost:5173/?visuals=classic` (the reversible switch is in `src/legacy-visuals/flag.ts`)
- Full rollback: `git checkout master` (production state), or `git checkout pre-partner-integration` for the state found before this work.

## Changed files

- New:
  - `src/legacy-visuals/MarsKit.tsx`
  - `src/legacy-visuals/portable/rover.d.ts`
  - `docs/partner-integration/*`
- Modified:
  - `src/scenes/explore.tsx`: kit environment on Mars, kit rover driven by our controller, closer camera framing, classic fallback.
  - `src/scenes/surface.tsx`: Terrain accepts the kit material and palette.
  - `src/scenes/scenes.tsx`: kit rover in the Mars workshops.
  - `src/content/assets.ts`: CC0 texture credits.
- No dependency or save-schema changes.

## Results (2026-11-14)

- Unit tests: 49/49. End-to-end: 6/6:
  - the full Mission 02 run with reload, continue and archive;
  - Arabic RTL;
  - axe checks;
  - Missions 01, 03 and 04.
- Scene lifecycle: entering and leaving the surface three times leaves one rover and one light rig. Fog and exposure are restored.
- Performance on the integrated game:
  - Setup: 1280×800, Edge, Intel Iris Xe (D3D11), quality High, 10 s while driving.
  - Integrated: median 45 fps, average 39, 95th-percentile frame 55 ms.
  - Classic: median 45 fps, average 46, 95th-percentile frame 44 ms.
  - The extra spikes come from the kit's soft shadows. The Low quality setting turns shadows off.

Screenshots in this folder: `*-before.jpg` is `?visuals=classic` and `*-after.jpg` is the integrated look. The integrated camera sits closer and lower, following the kit's framing, so the views match in position but not in distance.
