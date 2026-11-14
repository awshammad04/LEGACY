# Shared spacecraft interior — 14 November 2026

The four missions now enter a shared spacecraft orientation immediately after completing or skipping the cinematic launch. The scene reuses Mission 01's actual cabin, camera, windows, materials, lighting and question feedback. The existing Vercel production deployment remains unchanged.

Before editing, the clean `bc4e1e4` commit was tagged `checkpoint/pre-shared-interior-bc4e1e4` as the requested safe Git checkpoint.

## Reused and adapted

`src/scenes/cabin.tsx` already contained the Orion-inspired cabin shell, canvas-textured lockers, handrails, glass cockpit, windows, Earth/Moon models, floating crew, activity poses and a single OrbitControls camera. `CruiseScreen.tsx` already supplied the choice buttons, correct/incorrect explanations, animations and continuation flow. These remain the reference implementation.

The original question body was extracted into `src/ui/ChoiceCard.tsx` and is still used by the original Apollo cruise. The shared orientation uses that same component, `BestChoiceNote` and the existing LearnCard modal. Native Three.js equipment markers and accessible HUD buttons open the same short information cards. Forward-console, Earth-window and destination-window buttons operate the existing cabin camera; dragging still works between HUD panels. Markers use disposable canvas textures inside the existing R3F scene, with no extra React roots, Canvas, camera controller or animation loop.

Mission 01 keeps its crew, flight suits, floating objects, sleep stations and original five crew-health decisions later in the journey. The new optional three-question orientation does not alter those health decisions or resources. Its purpose is equipment familiarization immediately after launch, while preserving the original playable cruise and old saves.

Missions 02–04 explicitly label the scene **Virtual engineering view — uncrewed mission**. They render no crew members, crew vitals, names, sleep stations, seats, galley or floating personal objects. Their training console shows robotic systems and values derived from the selected design. The shared room is clearly described as an illustrative training environment, rather than the real interior of a rover or telescope.

| Mission | Exterior training view | Three short practice topics |
| --- | --- | --- |
| 01 — Echoes of Apollo | Earth / Moon | Apollo rover equipment, life-support limits, radiation safety |
| 02 — The Martian Mystery | Earth / Mars | Scientific instruments and potential biosignatures, complete-system tradeoffs, data/downlink |
| 03 — The Lost Rover | Earth / Mars | Solar power and dust, Opportunity's long mission, preserving the scientific record |
| 04 — The Cosmic Photographer | Earth / starfield | Repeated imaging, detector protection, complementary images and spectra |

Exterior scales are labeled illustrative. Mission 04 does not imply that its telescope travels to the observed galaxy. Baseline and final assessments remain separate three-question quizzes; practice answers neither replace them nor contribute to their scores.

## Progression and persistence

The common mission definitions insert `interior` after `launch`. The existing launch host therefore hands off to the new stage automatically, without changing the cinematic controller or authorization checks. Finishing or deliberately skipping returns Missions 01–03 to Earth orbit and Mission 04 to its observing stage. The telescope's observing resources initialize at that handoff, preserving its existing behavior.

The reducer stores orientation answers, question index, examined equipment and selected view in the existing version-1 action log. Answers are saved before showing feedback, so reload/continue restores the feedback too. Continuing requires an answer; normal completion requires finishing the three short topics. Skip is explicit and available throughout. Duplicate or stale completion attempts are ignored once the stage has changed.

Legacy direct launch-to-orbit/observe actions remain valid for old saves and What-If replays. Existing crew-health requirements, mission objectives, observations, equipment, resources and assessed quiz data are preserved. New orientation actions do not mutate those systems.

## Storytelling and current audio limitation

Equipment examination and accepted answers feed the existing shared storytelling service. Explanations derive directly from the same bilingual topic text shown in the feedback, with registered NASA or game-model source references. Explicit replay uses the established narration controls. Moving to another question or stage stops the previous explanation. Reopening a card can replay its cached audio without contacting Gemini.

The existing Gemini configuration and Charon voice generated **13 new recordings**: all six language clips for Mission 02, all six for Mission 03, and the first English Mission 04 explanation. The provider's current limits prevented the other **11 language clips**, including the new Apollo explanations. One bounded retry obtained the Mission 04 English clip; further unavailable clips retain verified English/Arabic text and working gameplay. Existing Mission 01/Mission 04 narration outside this new orientation is unaffected.

All **64 existing recordings** and their metadata are unchanged. The catalogue now contains 44 stories, 77 recordings and 11 text fallbacks. The offline checker validates every present transcript/hash and reports the optional interior fallbacks explicitly; missing original recordings still fail validation. `npm run check:stories` passes with this explicit fallback report.

To generate only the remaining clips once the existing Gemini quota is available:

```text
node scripts/generate-stories.mjs --only m1-interior-instruments,m1-interior-power,m1-interior-data,m4-interior-instruments,m4-interior-power,m4-interior-data --max-requests 24
```

The generator preserves cached clips. Runtime gameplay makes no Gemini requests. The private-value audit found no existing key in frontend source, public assets or production bundles, and no Gemini API endpoint/configuration in the client bundle. No key or provider was added.

## Modified files

| Files | Change |
| --- | --- |
| `src/content/interior.json`, `interior.ts` | Mission-specific bilingual topics, feedback, exterior configuration and information-card adapter. |
| `src/content/missions/index.ts`, `src/core/types.ts`, `src/core/reducer.ts` | Shared stage, saved orientation actions, guarded completion and legacy replay compatibility. |
| `src/scenes/cabin.tsx` | Reuses original cabin/camera; virtual-mode equipment, destination views, native markers and localized engineering displays. |
| `src/ui/ChoiceCard.tsx`, `src/ui/screens/CruiseScreen.tsx` | Extracted existing question/feedback UI; original crew-choice logic unchanged. |
| `src/ui/screens/InteriorScreen.tsx`, `src/game/interior.ts` | Shared orientation HUD and equipment interaction. |
| `src/App.tsx`, `src/ui/MissionScreens.tsx`, `src/ui/TopBar.tsx` | Route and label the shared stage. |
| `src/ui/common.tsx`, `src/game/ar.json`, `src/styles/app.css` | Short existing-style info cards, translations, RTL and camera-friendly HUD layout. |
| `src/storytelling/*`, `src/ui/screens/StoryCard.tsx` | Accepted orientation triggers, shared playback and question/stage cleanup. |
| `scripts/generate-stories.mjs`, `scripts/check-stories.mjs`, `src/content/story-recordings.json`, new MP3s | Reuse generation/caching; report optional text fallbacks. |
| `src/core/interior.test.ts`, `tests/e2e/interior.spec.ts`, `tests/e2e/mission2.spec.ts` | New invariants/browser coverage and existing full flows through the new optional stage. |

## Verification

- **104 unit tests passed**, including eight new per-mission tests for authorization, answer validation, no resource/assessment changes, complete/skip idempotence, saved feedback, legacy action logs and What-If replays.
- Mission 02 was browser-tested first, followed by Missions 03, 04 and the Apollo regression. All four were visually inspected in English and Arabic, including actual camera dragging, Earth/destination views and equipment interaction.
- **22 distinct browser scenarios passed** across the full run and targeted retests: eight interior scenarios, eight cinematic scenarios and six existing full-flow/Arabic/accessibility scenarios. The final five targeted checks reverified all four native equipment interactions and the affected full cinematic handoff with zero console errors.
- Browser checks exercise correct and incorrect feedback, native 3D equipment clicks, English/Arabic recordings where generated, verified-text fallback, saved feedback after reload, unchanged resources and exactly-once completion/skip. Robotic scenes show explicit uncrewed labels.
- Production TypeScript/Vite build passed. The final bundle is `index-GUpTbdRp.js`; Three.js/R3F dependency chunks remain unchanged. `git diff --check` passed.
- The initial full run exposed a React root-cleanup warning from Drei HTML markers during a cinematic handoff. Those markers were replaced with native meshes instead of suppressing the warning. All four equipment interactions and the affected full handoff were retested with console-error checks.

Representative actual browser evidence:

| Mission | English | Arabic |
| --- | --- | --- |
| Apollo | [Cabin and practice](mission-1-english.png) | [Arabic feedback/fallback](mission-1-arabic.png) |
| Martian Mystery | [Virtual engineering cabin](mission-2-english.png) | [Arabic narrated explanation](mission-2-arabic.png) |
| Opportunity | [Solar power practice](mission-3-english.png) | [Arabic narrated explanation](mission-3-arabic.png) |
| Cosmic Photographer | [Uncrewed observatory training](mission-4-english.png) | [Arabic verified-text explanation](mission-4-arabic.png) |

[Mars window](mars-window.png) · [Earth window](earth-window.png)

Verification covers this Windows/Edge setup. New-clip availability is limited as described above; pronunciation review of every recording and testing on other browsers/devices remain outside these checks. The current working Vercel deployment has not been changed.
