# Mission 01 — lunar rover and EVA upgrade

The pre-change checkpoint is commit `f32bdcc`, which preserves the verified, deployed shared-launch implementation. This lunar upgrade is implemented locally; the existing Vercel deployment has not been changed by this task.

## Vehicle

The existing `LrvModel` entry point now uses an Apollo-inspired, four-wheel lunar vehicle throughout the workshop, active driving, parked-rover and heritage views. It has an exposed aluminium chassis, wire-mesh wheels and chevron traction strips, hubs and spokes, curved fenders, articulated suspension struts, fabric seats, sample stowage, thermal blankets, a camera and a high-gain antenna. Wheel roll follows actual speed and radius, steering eases toward the requested angle, and suspension samples the existing terrain. The chassis no longer pivots when steering at a standstill.

The same rigged astronaut asset is used aboard and on foot, at a consistent EVA scale. The vehicle keeps its lunar design and neutral metal/fabric/foil materials. Mars terrain materials were not imported. No terrain palette, sky, lighting, mission definition, objective or resource rule was changed.

## Walking and controls

The existing exploration controller, R3F frame loop, OrbitControls camera and interaction flow are reused. Only lunar EVA takes the new walking branch; Mars driving retains its previous movement model.

| Input | Moon behavior |
| --- | --- |
| WASD / arrows | Drive aboard; move relative to the camera on foot, with normalized diagonal speed. |
| Mouse drag / wheel | Rotate the existing third-person camera / zoom. Camera clearance checks cover terrain and nearby walking obstacles. |
| Shift | Faster driving / brisk walking. |
| Space | Brake aboard / restrained lunar hop on foot. Holding Space does not repeat jumps. |
| E | Investigate a nearby site; board or step off when the rover prompt is the context action. |
| B | Board or step off the selected rover, including when E is used by a site. Boarding still requires proximity. |
| J / F / R | Journal / report / rest at the lander, following the existing rules. |

Movement accelerates and stops smoothly, blends idle/walk/turn/hop/interact poses, keeps the astronaut upright, and plants the supporting boot on the terrain. Swept collision steps prevent walking or hopping through boulders and parked hardware. Panels pause movement. Walking-only packages start in EVA; packages with a rover preserve boarding and dismounting.

Pending movement is committed before keyboard interactions and before returning home, so save/continue and investigations use the player's latest position. The existing `DRIVE` and `BUGGY` actions and version-one save format are retained. Airborne pose and camera orientation remain transient; continuing a save restores the crew safely on the ground.

## Files

| Files | Purpose |
| --- | --- |
| `src/scenes/lunarRover.tsx`, `craft.tsx` | Detailed lunar rover and reuse through the existing model entry point. |
| `src/core/lunarMovement.ts` | Camera-relative direction, acceleration, swept collision, slope/drop limits and lunar hop. |
| `src/scenes/explore.tsx`, `roverfx.tsx` | Integrate lunar walking, vehicle steering, terrain-aware suspension inputs and camera clearance into the existing scene. |
| `src/scenes/astronaut.tsx` | Reuse and blend the rig's poses, add turn/hop, ground boots and dispose owned cloned materials. |
| `src/game/live.ts`, `store.ts` | Transient movement telemetry and a movement flush before saving/exiting. |
| `src/ui/screens/ExploreHud.tsx`, `src/styles/app.css`, `src/game/ar.json` | Lunar controls, correct Moon labels/dialogue, and English/Arabic support. |
| `src/scenes/terrainfx.tsx` | Recompute instanced rock/pebble bounds after placement, preventing visible rocks from being culled while their colliders remain active. Geometry and colors are unchanged. |
| `src/core/lunarMovement.test.ts`, `tests/e2e/lunar.spec.ts` | Movement/collision tests and real-browser lunar verification. |

## Verification

- **70 unit tests passed**, including camera-relative input, diagonal speed, frame-rate consistency, hop/landing, pausing, swept rock collision, slope/drop limits and world boundaries.
- **Six existing browser tests passed**: complete gameplay flows for all four missions, persistence, Arabic layout and accessibility.
- **Three final lunar browser tests passed**, covering the detailed rover, mouse rotation, WASD walking, hop and landing, paused movement, save/continue, reboarding, walking-only packages, Apollo interaction and mission completion, plus approaching and stopping at a real rendered boulder. Stopped-rover steering was also checked: wheels steer while the chassis remains stationary.
- **Production build passed** (`tsc --noEmit` and Vite), along with `git diff --check`.

Real Edge captures were reviewed at 1440×900 on Windows with hardware rendering. Screenshots beside this report show the rover, on-foot crew, hop, Arabic interface, Apollo investigation and visible boulder collision. These checks cover desktop keyboard/mouse play; the existing touch controls are retained.
