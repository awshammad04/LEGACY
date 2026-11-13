# LEGACY — Every Mission Leaves a Story

**NASA Space Apps Challenge 2026 — Space Mission Design Game**  
**Concept Document | English Edition**

> **Design the future. Protect the crew. Discover the past.**

## The Vision

**LEGACY** is an interactive, story-driven educational space mission game in which students become mission commanders. They do not simply memorize facts about space; they **design missions, make engineering decisions, experience consequences, investigate real space discoveries, and learn from earlier explorers**.

The game blends three connected educational themes:

1. **Space mission design:** spacecraft configuration, instruments, mass, power, budget, communication, navigation, and operational constraints.
2. **Astronaut health and survival:** continuous in-game crew health tracking, food, water, sleep, fatigue, physical activity, health alerts, radiation exposure, and the consequences of crew-related decisions where a mission involves humans.
3. **The legacy of space exploration:** interactive stories about Apollo equipment, Mars rovers, scientific discoveries, and the technology that made them possible.

**One unifying idea:** every mission is a chain of decisions. A successful player must balance scientific ambition with engineering limitations and safety. Real historical material makes each journey meaningful, while fictional scenarios let players experiment without suggesting that a game is an operational NASA simulator.

**Core gameplay loop:**

**Choose a Mission → Take the 3-Question Baseline Quiz → Design on Earth → Launch → Operate & Survive → Discover → Debrief → Take the Final Quiz → Rewind → Improve**

**Astronaut-life experience:** In crewed scenarios, a small part of the journey lets the player follow a realistic-inspired daily schedule, manage well-being, and respond to Mission Control. A persistent health-monitoring dashboard tracks the crew throughout the mission without turning the game into a standalone medical simulator.

**The opening rule:** Every playable mission begins on **Earth**. The player chooses a mission **first**, then receives an initial knowledge check and an engineering budget before any launch or space operations. The four missions can be selected independently from the main menu; each one has its own saved progress.

---

## Main Menu and First-Time Player Experience

The opening screen is not a generic “Press Start” page. It is the player's **Mission Control Headquarters**, with four visible mission cards and a clearly visible learning-assessment panel.

### What the first screen must contain

1. **LEGACY logo and promise:** “Design the future. Protect the crew. Discover the past.”
2. **Choose Your Mission — the primary action:** Four cards for **Echoes of Apollo**, **The Martian Mystery**, **The Lost Rover: Opportunity**, and **The Cosmic Photographer**. Each card shows the destination, objective, mission type (crewed / robotic / telescope), an estimated game budget, and **Start Mission** or **Continue Mission**.
3. **Before You Launch — 3-Question Knowledge Check:** A prominent panel that explains the short diagnostic quiz and lets the player preview it. The quiz appears **before Earth-based assembly starts**, after the player selects a mission, so their initial understanding is measured before teaching begins.
4. **Continue Your Journey:** Saved missions, current stage, unlocked discoveries, and a quick link to the **Legacy Archive**.
5. **Learn / Accessibility:** Audio narration, subtitles, language preferences, controls, and explanation of verified NASA facts versus fictional game mechanics.

### Exact screen-to-screen flow

```text
OPEN GAME
   |
   v
MISSION CONTROL HOME (all 4 mission cards + visible 3-question quiz panel)
   |
   +--> PLAYER CHOOSES MISSION 1 / 2 / 3 / 4  <-- FIRST REQUIRED ACTION
             |
             v
       PRE-MISSION QUIZ (exactly 3 questions; baseline saved)
             |
             v
       EARTH: MISSION BRIEFING + NASA FACT CARD
             |
             v
       EARTH: BUILD WORKSHOP + FIXED BUDGET
       Select rocket/vehicle, scientific tools, power, communications,
       protection and crew provisions when applicable
             |
             v
       PRE-LAUNCH REVIEW (engineering constraints + ground warnings)
             |
       READY? ---- NO ----> REDESIGN ON EARTH
             |
            YES
             v
       LAUNCH CINEMATIC + INITIAL ORBIT / TRANSFER STAGE
             |
             v
       MISSION-SPECIFIC OPERATIONS (orbit / Moon / Mars / observatory)
             |
             v
       DEBRIEF + 3-QUESTION POST-QUIZ + REPLAY / CONTINUE
```

The player may explore the four cards and the quiz description before choosing. The **mission choice** is what commits the player to a campaign; a diagnostic question should never prevent them from selecting a mission. For an accessible mode, the knowledge check may be skipped, but the game must state that no before/after learning comparison will be available.

### Example welcome dialogue

> **MISSION CONTROL:** “Commander, four missions are awaiting your decision. Each has a real scientific story—but the spacecraft, crew plan, and mission budget are yours to design. Select your mission. Before we begin, let's see what you already know.”

---

## Initial Knowledge Check — Exactly Three Questions

The home screen should show a compact **“Before You Launch: 3 Questions”** preview, not an intimidating exam. Once the player has selected a mission, the short quiz opens before they interact with any tutorial, component description, or science archive entry. Students should be able to answer **“I'm not sure”** without being penalized.

These three questions assess **engineering constraints, responsible hazard management, and scientific reasoning**—concepts that recur across the campaign.

### Question 1 — Engineering Trade-offs

**“Your new science camera produces better images, but it uses more power, adds mass, and costs more. What should you do before installing it?”**

- A. Choose it immediately because better images guarantee a better mission.
- B. Check whether the complete design still satisfies mass, power, data, and budget limits.
- C. Ignore the extra resource demands because the spacecraft is already built.
- D. I'm not sure.

**Concept to learn:** A mission is a system; improving one component may create new limits elsewhere.

### Question 2 — Mission Safety and Unexpected Events

**“Mission Control warns that a serious space-weather event may affect your spacecraft. What is the best first response?”**

- A. Ignore it to keep the science schedule unchanged.
- B. Review the hazard plan, protect exposed crew or vulnerable equipment as applicable, and adjust operations.
- C. Increase activity so the mission finishes before the warning arrives.
- D. I'm not sure.

**Concept to learn:** Mission safety depends on planning, monitoring, and adapting to alerts. The specifics differ for crewed and robotic missions.

### Question 3 — Evidence Versus Certainty

**“A Mars rover identifies a rock with a possible biosignature. What can scientists responsibly conclude?”**

- A. Life on Mars has been proven.
- B. The observation is interesting, but further tests and evidence are needed.
- C. The rock is unimportant because it does not prove life immediately.
- D. I'm not sure.

**Concept to learn:** Scientific observations may support a hypothesis without proving it; this is especially important in the Cheyava Falls story.

**Developer answer key (not shown during the pre-quiz):** Q1 **B**, Q2 **B**, Q3 **B**. Shuffle option order in the actual game so the correct answer is not always in the same position.

### What happens after the player answers?

- Record the **baseline score out of 3** and the response to each question.
- Do not reveal a pass/fail label or block the mission. Show: **“Baseline saved. Your decisions will help you discover the answers.”**
- Link each concept to a later learning moment: **Q1 → Earth Build Workshop**; **Q2 → ground warning or emergency event**; **Q3 → scientific evidence / instrument-selection sequence**.
- In Mission 1 or Mission 3, optionally swap the third question for an equivalent question about protecting historical spacecraft; in Mission 4, an equivalent question can address what one telescope observation can and cannot establish. Keep the **three-question count** and assess the same reasoning skill.
- On mission completion, present **three different but equivalent post-quiz questions**, not the exact same wording. Compare only actual answers; never invent a learning improvement.

**Example final questions (teacher/developer version):**

1. “An additional instrument exceeds your spacecraft's available power. Which decision demonstrates good engineering?” **Correct concept:** Redesign or reprioritize equipment until the mission fits its constraints.
2. “Mission Control issues a hazard warning during an exposed crew activity or sensitive observation. What is the correct approach?” **Correct concept:** Follow the applicable hazard plan and adjust the operation rather than ignore the warning.
3. “A telescope image or rover measurement reveals an unexpected feature. Is one observation enough to claim a major discovery?” **Correct concept:** Not necessarily; assess uncertainty and obtain supporting observations.

A results panel can show **Before: 1/3; After: 3/3** *only when those are the player's measured scores*. Display per-question explanations and give the player a replay suggestion tied to concepts missed.

---

## NASA-Based Budget References and Playable Mission Budgets

**NASA does not give every mission one standard budget.** Real mission costs vary by scope, launch system, spacecraft, instruments, development period, operations, and the year of the dollars. A historic program total, a twin-rover program, a single rover's life-cycle cost, and a telescope's cost are **not directly interchangeable**.

For LEGACY, use **real NASA cost figures as scale references** and clearly label **game mission budgets and component prices as fictional, simplified design assumptions**. The player should feel the engineering pressure of realistic orders of magnitude without believing that the game is quoting an actual NASA procurement plan.

### Historical NASA / NASA-JPL references

| Real NASA program / mission | Published reference figure | What that figure means | Official reference |
| --- | --- | --- | --- |
| **Apollo program** | **About $25.4 billion** in historical dollars | A **whole human lunar exploration program**, **not** the cost or budget of Apollo 15 alone, and not expressed in 2026 dollars | [NASA — A Brief History of NASA](https://www.nasa.gov/history/SP-4225/documentation/brief-history/history.htm) |
| **Mars 2020 / Perseverance** | **About $2.7 billion** | About **$2.4 billion** to build and launch plus **$300 million** estimated for landing and prime operations, per a NASA/JPL mission press kit | [NASA/JPL — Mars 2020 Quick Facts](https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/quick_facts/) |
| **Mars Exploration Rovers — Spirit and Opportunity** | **About $820 million** | Cost of the **twin-rover MER program together**, including development, launches, and original mission operations; **not Opportunity alone** | [NASA/JPL — Mars Exploration Rover Landing Press Kit, p. 6](https://www.jpl.nasa.gov/news/press_kits/merlandings.pdf) |
| **Swift Observatory** | **About $250 million** | Historical cost of a compact space-observatory mission, including international participation; useful for a small space-telescope example, **not** comparable to Webb | [NASA Goddard — Swift Observatory FAQ](https://imagine.gsfc.nasa.gov/observatories/learning/swift/faq/) |
| **James Webb Space Telescope** | **$9.66 billion** estimated life-cycle cost (2018 review) | Reference for an extremely sophisticated observatory; **not** a realistic budget to copy for a small game telescope | [NASA — Webb Telescope Review (2018)](https://www.nasa.gov/news-release/nasa-completes-webb-telescope-review-commits-to-launch-in-early-2021/) |

**Important:** The figures above are historical published cost estimates in different dollar years and accounting scopes, not current NASA project authorizations. LEGACY will not claim that its imaginary missions were actually approved or funded by NASA.

### Proposed in-game budgets

| Game mission | Fixed starting budget | Reason for the game scale |
| --- | ---: | --- |
| **01 — Echoes of Apollo** | **$5,000 million ($5.0B)** | Illustrative **new crewed lunar expedition**, not the historical Apollo 15 budget. Large crew, flight, and landing costs. |
| **02 — The Martian Mystery** | **$2,700 million ($2.7B)** | An illustrative new flagship-style robotic Mars investigation, broadly anchored to Perseverance's published order of magnitude. |
| **03 — The Lost Rover: Opportunity** | **$1,000 million ($1.0B)** | A **new fictional robotic documentation mission**; does not reuse or claim to be the $820M twin-rover MER program. |
| **04 — The Cosmic Photographer** | **$300 million ($0.3B)** | A **new, compact orbiting observatory** with limited science capabilities; loosely inspired by smaller historical telescope missions, not a Webb/L2 flagship. |

These numbers are **game-design proposals**, not official NASA budgets or validated cost estimates. Show the label **“Simulation Budget — NASA-inspired educational estimate”** beside the total, with a link to a **“How we chose this budget”** explainer citing NASA.

### Example Earth-workshop allocation (all values are fictional game costs)

These sample builds each fit their starting budget, but alternative components, upgrades, and extra safety margin require genuine trade-offs. The prices are illustrative; do not call them real procurement quotations.

| Cost category | Apollo-inspired lunar mission ($M) | Martian Mystery ($M) | Lost Rover ($M) | Cosmic Photographer ($M) |
| --- | ---: | ---: | ---: | ---: |
| Launch / transfer / mission delivery | 1,650 | 750 | 320 | 100 |
| Main spacecraft, lander, rover or observatory platform | 1,400 | 550 | 250 | 85 |
| Crew life support / robotic navigation / pointing systems | 650 | 450 | 100 | 60 |
| Mobility / scientific instrument upgrade | 350 | 400 | 120 | 25 |
| Power and additional mission systems | 200 | 200 | 80 | 0 |
| Communications and ground segment | 150 | 150 | 0 | 0 |
| **Protected contingency & operations reserve** | **600** | **200** | **130** | **30** |
| **TOTAL** | **5,000** | **2,700** | **1,000** | **300** |

**Accounting clarification:** Category names group different capabilities across missions; a $60M line in one mission is not the same component as a $60M line in another. In the current game model, some communication and power expenses are folded into the larger platform/system packages for Missions 3 and 4. Every build must also pass **mass, energy, data, and safety checks**, not merely stay under its dollar cap.

### How choosing equipment actually works

In the **Earth: Build Your Mission** workshop, show a **budget remaining** counter and a list of required and optional equipment. The player selects among **Basic / Balanced / Advanced** variants rather than buying every part without limits.

**Equipment groups, only where relevant:**

- **Launch and delivery:** rocket/launcher capability, transfer stage, landing or deployment package.
- **Spacecraft / rover / telescope:** chassis, wheels, navigation, attitude control, scientific instrument platform.
- **Science:** cameras, spectrometers, sample tools, or astronomical sensors.
- **Power:** solar arrays, batteries, or mission-appropriate power systems.
- **Communications:** antenna, transmitter, storage, relay capacity, downlink schedule.
- **Protection:** thermal management, shielding, fault protection, redundant components.
- **Crewed missions only:** life support, food, water, oxygen, rest planning, EVA equipment, emergency capability.
- **Reserve:** protected contingency amount that the player should not spend casually.

A single selected component changes several dependent values. For example, an advanced spectrometer may improve **science capability** while increasing **cost, mass, electricity demand, thermal load, and data volume**. Choosing a less capable sensor can be the right decision when it preserves essential power and communication capacity.

**Illustrative workshop component example (game-balanced, not NASA pricing):**

| Rover camera option | Added cost | Added mass | Added power draw | Science/data effect |
| --- | ---: | ---: | ---: | --- |
| Basic panoramic camera | $20M | 3 kg | 12 W | Broad visual context, limited detail |
| Balanced scientific imager | $55M | 7 kg | 28 W | Better image detail and moderate data demand |
| Advanced imaging package | $105M | 13 kg | 58 W | Higher-detail images, greater data and storage burden |

**Pre-launch rules:**

1. Every **mandatory component** for the selected mission must be installed.
2. The total cost must be **at or below the mission cap**, with any required protected reserve intact.
3. **Payload mass must fit** the selected launch and landing/deployment capability.
4. **Power supply and battery endurance** must be adequate for modeled mission-critical operations.
5. **Data storage and communication downlink** must support essential measurements and telemetry.
6. For a **crewed** mission, required life-support and safety limits must pass before launch.
7. The player sees a **Pre-Launch Readiness Review** that explains *why* a design fails, not just a red “No.”

**When the design passes:** Mission Control says, *“Your spacecraft meets the modeled launch requirements. Mission authorization granted.”* The player presses **LAUNCH MISSION**; a brief launch sequence moves the game out of Earth mode into the relevant orbital, transfer, or observatory stage.

**When it fails:** Mission Control identifies constraints such as *“Payload exceeds launcher capacity by 24 kg”* (illustrative) and offers **Return to Workshop**. Launch never bypasses an unsatisfied mandatory safety requirement.

### Mission 04 launch consistency

The **default Cosmic Photographer campaign** uses a **new compact telescope**: the player equips it on Earth, launches it, checks out the spacecraft in orbit, and then observes a *historical/simulated* rare astronomical event. A separately labeled **advanced operations mode** can use an **existing observatory near L2**, in which case the player is allocating an **operations/observing resource budget**, **not purchasing or relaunching an existing billion-dollar telescope**. In this advanced mode, the transition after Earth planning is **observatory handover**, not a fabricated new launch.

---

## The Player's Role and the Story World

The player joins a fictional **Mission Control Academy** as a newly appointed **Mission Commander**. The academy offers four selectable missions, each inspired by real NASA projects or discoveries. The player chooses one on the opening screen before receiving a budget or entering the Earth workshop. A guide from Earth-based Mission Control briefs the player before launch and sends warnings, updates, and advice when a mission encounters trouble.

The player is not a passive viewer. They select equipment, allocate resources, plan routes and observations, solve problems, and decide when to continue, adapt, or stop an operation.

Each mission ends with a **Mission Debrief**: what the player accomplished, what was learned, which decisions mattered, and how an alternative decision could have changed the outcome. The same persistent player profile tracks progress **separately for each mission**, makes all four missions available from the start, and preserves discoveries in a personal **Legacy Archive**.

**Primary learners:** students aged approximately 13–18, with approachable explanations and optional deeper engineering information.

---

## Campaign Structure: Missions Versus Stages

LEGACY uses **four distinct missions**, chosen first from the Mission Control home screen. Every mission then opens with a three-question diagnostic and a **mandatory Earth-based construction and budgeting stage** before launch or observatory handover. Inside each mission, the player passes through relevant **stages**. The four environments below are therefore *stage types*, not four separate missions or a requirement that every mission visit every destination.

| Stage type | What the player learns and does |
| --- | --- |
| **On Earth — Mission Control & Workshop** | After mission selection and the three-question quiz, receive the briefing and a NASA-inspired game budget; choose equipment, calculate mass/power/cost, protect reserves, and pass launch readiness review. **Every mission starts here.** |
| **In Orbit — Transit & Operations** | Explore orbits and satellite systems, manage communication, solar power, navigation, launch or transfer constraints, and complete an orbital discovery mini-game. |
| **On the Moon — Lunar Exploration** | Navigate lunar terrain, manage a crewed excursion, protect Apollo heritage, and document historical equipment. Used primarily in Mission 1. |
| **On Mars — Robotic Exploration** | Select rover instruments, plan safe routes, investigate geological evidence, and search for historical rover sites. Used in Missions 2 and 3. |

**Mission 4** focuses on telescope operations: it begins with planning on Earth and moves to an orbital observatory or a conceptual Sun–Earth L2 observatory environment, depending on the selected scenario.

A mission's stages are linked by persistent state. After completing the Earth workshop, the player explicitly launches their configured spacecraft (or uses a labeled observatory handover in Mission 4 advanced mode). For example, choosing lighter batteries on Earth may limit operations later; neglecting crew recovery during transit may change what is safe to attempt on the Moon. The player can **save progress and continue from the latest completed stage** or replay a decision.

### Campaign Overview

| Mission | Title | Main setting | Central challenge | Historical or scientific connection |
| --- | --- | --- | --- | --- |
| **01** | **Echoes of Apollo — The Lunar Rover Legacy** | Earth → Orbit → Moon | Design a lunar exploration mission and protect an Apollo heritage site. | Apollo 15, Lunar Roving Vehicle, Lunar Reconnaissance Orbiter imagery. |
| **02** | **The Martian Mystery** | Earth → Orbit → Mars | Choose the right tools to investigate an unusual rock in Jezero Crater. | Perseverance and the Cheyava Falls / Sapphire Canyon investigation. |
| **03** | **The Lost Rover — Opportunity's Last Trail** | Earth → Orbit → Mars | Design a robotic documentation mission to revisit Opportunity's final area. | Opportunity's long mission, Mars history, dust storm and final communication. |
| **04** | **The Cosmic Photographer** | Earth → Orbit / Observatory | Plan and execute observations of a rare transient astronomical event. | Real NASA telescope science and archived imagery of supernovae. |

The first three missions connect **past exploration and future engineering**. The fourth extends the same design principles to astronomy, where the crucial resources include observing time, sensitivity, pointing, onboard storage, power, and communications.

---

## Mission 01 — Echoes of Apollo: The Lunar Rover Legacy

**Story premise:** A future scientific expedition is planned near the historic Apollo 15 landing region. The player must design a capable and safe lunar mission, document the remaining equipment, and protect an important part of human exploration history.

### Objectives

- Select a spacecraft and lunar exploration configuration within mass, cost, power, and communication constraints.
- Choose a landing and exploration plan that respects historic equipment and rover tracks.
- Manage crew resources during lunar surface operations.
- Use a lunar rover to document, rather than collect or damage, historical hardware.
- Unlock stories about Apollo 15 and the Lunar Roving Vehicle.
- Safely complete the planned science objectives and return or conclude operations according to the chosen scenario.

### Gameplay Sequence

**Stage A — On Earth: Build Your Mission**  
The player begins on Earth with a **$5.0B fictional mission budget** and allocates it among the launcher, crew spacecraft, lunar lander, lunar rover, cameras, communications, power, life-support capacity, and contingency reserves. A heavier or more capable instrument may increase scientific value but also make landing or power limits harder to satisfy.

**Stage B — In Orbit: The Space Highway**  
The player learns the difference between low Earth orbit, lunar transfer, and lunar orbit. They examine satellites and complete the **Mission Parts & Orbit Puzzle** described later in this document.

**Stage C — On the Moon: Discover the Legacy**  
Using a simplified map inspired by NASA's Apollo 15 and Lunar Reconnaissance Orbiter material, the player plans an observation route. Historical items can be selected to open interactive stories, photos, narrated explanations, and comparisons between 1971 technology and modern mission design.

**Stage D — The Crew Decision**  
A crew member becomes fatigued during a scheduled excursion. The player must shorten the excursion, reorganize the tasks, or continue only within safety limits. Earlier food, sleep, equipment, and travel-time decisions affect the safe options available.

### The Legacy Archive: Apollo 15

A discoverable item opens a small interactive story:

**“The Rover That Changed Lunar Exploration”**  
The Lunar Roving Vehicle let Apollo 15 astronauts explore farther from their lunar module and conduct science across the Hadley–Apennine region. The player sees authentic NASA photographs and imagery of traces documented by the Lunar Reconnaissance Orbiter. After the story, they solve a practical design problem: **How much rover range, mass, and power should their own expedition allocate?**

**Design principle:** Historical objects are **heritage to observe and protect**, not loot to collect. Site protection is modeled using simplified rules inspired by NASA recommendations, clearly identified as educational simplifications.

**Learning outcomes:** mission planning, engineering trade-offs, lunar exploration, crew safety, and preservation of space heritage.

---

## Mission 02 — The Martian Mystery

**Story premise:** An unusual Martian rock has been reported in a scientifically promising region of **Jezero Crater**. The player commands a new robotic investigation to examine it and determine what the observations can—and cannot—tell us.

The scenario draws inspiration from Perseverance's study of **Cheyava Falls** and the sample named **Sapphire Canyon**. NASA has described *potential biosignatures*, **not confirmed proof of ancient life**. This distinction becomes one of the mission's most important lessons.

### Objectives

- Choose scientific questions before choosing instruments.
- Design a rover that fits a mass, power, data, and mission-cost budget; the fictional starting cap is **$2.7B**.
- Select complementary tools: imaging, contextual mapping, and suitable chemical or mineralogical analysis.
- Navigate a route to the investigation site while conserving battery power and time.
- Gather and interpret evidence without jumping to unsupported conclusions.
- Send a defensible science report back to Earth.

### Gameplay Sequence

**Stage A — On Earth: The Science Plan**  
Mission Control presents three possible explanations for an unusual rock feature. The player chooses investigation priorities and instruments. A high-resolution camera alone cannot answer every chemical question; a more capable instrument package costs mass and electrical energy.

**Stage B — In Orbit: Choose the Survey Data**  
The player compares available orbital imagery and selects a target location and a landing/approach region. These maps support navigation but do not reveal everything about the rock's chemistry.

**Stage C — On Mars: Reach the Rock**  
The rover moves across a simplified Jezero landscape. Steeper or longer paths use more time and energy. Navigation speed matters: driving faster may shorten travel but increase modeled mobility or sensing risk.

**Stage D — Analyze the Evidence**  
Players examine observations and choose follow-up tests. Incomplete instrumentation produces incomplete information, not a fabricated “life detected” message. The best ending rewards careful reasoning, evidence quality, and acknowledgment of uncertainty.

### The Key Learning Moment

The player receives a scientific alert: **“Possible biosignature? Further investigation required.”**

They must choose between:

- Announcing a discovery immediately.
- Gathering independent supporting measurements.
- Reporting a cautious interpretation and listing alternative explanations.

The educationally strongest path is **evidence before certainty**. The game explains how scientists study water history, habitability, and potential biosignatures without treating them as proof of life.

**Learning outcomes:** scientific method, instrument selection, rover engineering, geological interpretation, and responsible communication of uncertainty.

---

## Mission 03 — The Lost Rover: Opportunity's Last Trail

**Story premise:** Years after Opportunity's mission ended, a new unmanned expedition is sent to **document its present condition and honor its scientific legacy**. The player uses historical records, orbital observations, and a carefully designed rover to approach the region of its last known operations.

**Important historical distinction:** Opportunity's location was not simply unknown. It last communicated on **June 10, 2018**, during a planet-wide dust storm, and NASA formally declared the mission complete on **February 13, 2019**. In LEGACY, “The Lost Rover” is a **storytelling title**, not a claim that scientists have no idea where the rover stopped.

### Objectives

- Study the route and scientific discoveries of Opportunity.
- Choose an appropriate landing/arrival region for a new robotic inspection mission.
- Design a rover with cameras, mobility, navigation, power, and communication capabilities within a fictional **$1.0B** starting cap.
- Use available maps and visual clues to approach the historical area.
- Make safe navigation and science trade-offs under uncertainty.
- Document the rover and nearby site without removing or damaging historical equipment.

### Gameplay Sequence

**Stage A — On Earth: Reconstruct the History**  
The player receives Opportunity's mission timeline, discoveries about past Martian water, and final operational context. They choose an inspection goal: high-resolution photography, environmental measurements, or a broader heritage survey.

**Stage B — In Orbit: Find the Clues**  
The player compares archived maps and a stylized orbital survey. Clues reveal historic mission locations and help establish a plausible approach route. This is a *documentation and navigation puzzle*, not a claim that Opportunity is literally missing from all records.

**Stage C — On Mars: Follow the Last Trail**  
The rover crosses uneven terrain while managing traction, wheel health, battery, temperature, and communication windows. The player balances travel speed against the risk of becoming immobilized or losing useful observations.

**Stage D — Discover the Rover's Story**  
When the site is successfully documented, the player unlocks narrated scenes about a mission planned for roughly 90 Martian days that lasted almost 15 years, and the severe storm that ended communication.

### Optional Crewed Variant — The Human Factor

The **default version is robotic**, consistent with the real Opportunity mission and appropriate for Mars exploration. An **explicitly fictional future extension** may include a human crew. In that variant, the player must plan extravehicular activity (EVA) duration, oxygen, rest, exposure risk, travel time, and rescue contingencies. The two versions must never be presented as a record of an actual crewed Opportunity recovery mission.

**Learning outcomes:** Mars exploration history, robotic autonomy, navigation, risk management, dust-storm effects on solar power, and preservation of historical spacecraft.

---

## Mission 04 — The Cosmic Photographer

**Story premise:** An observatory receives notice of a rare or short-lived astronomical event, such as a **supernova**. The player must select suitable instruments, plan an observation, and collect useful data before the opportunity is lost.

The mission can use a **historical NASA-observed supernova as the scientific case study**, with the in-game detection and deadline clearly marked as a replay or fictional simulation.

### Objectives

- Decide what question the observation should answer: brightness change, structure, spectrum, or evolution over time.
- Select an appropriate telescope or sensor configuration and observing wavelength, working within a fictional **$300M** budget for the default new compact observatory.
- Understand the trade-offs among sensitivity, field of view, observing duration, data volume, pointing, power, and communication.
- Choose when to observe and what to prioritize if time is limited.
- Interpret real NASA archival imagery alongside simulated observation results.
- Explain why different instruments reveal different information about the same event.

### Gameplay Sequence

**Stage A — On Earth: The Alert and Build Workshop**  
Mission Control sends a transient-event alert. The player examines the scientific goal, chooses an affordable compact orbiting observatory platform, selects optics/sensors, power, pointing, communication and launch hardware within the **$300M game cap**, and passes a pre-launch review. The new telescope is then launched in a brief cinematic before orbital checkout and observation.

**Stage B — In Orbit: Commission the Observatory**  
In the default route, the player has **just launched a new compact observatory** and now tests pointing, power, instrument availability, and downlink before the rare-event observation. In an optional advanced operations route, players can instead operate an educationally simplified existing virtual telescope rather than build a new spacecraft from scratch. For an advanced scenario, an observatory can be placed in a **conceptual Sun–Earth L2 environment**, inspired by the James Webb Space Telescope's orbit near L2. This is an **observing-geometry and systems-design lesson**, not a suggestion that L2 is the best location for every supernova observation.

**Stage C — Point, Capture, Transmit**  
The player chooses pointing, observation duration, camera/sensor settings, and downlink priorities. A more sensitive configuration may require longer exposure, stricter pointing, or greater data volume. Limited transmission capacity forces choices about which observations to retain.

**Stage D — Tell the Cosmic Story**  
After observing, an interactive archive presents real imagery and a narrated explanation of what a supernova is, how astronomers investigate one, and what remained uncertain in the selected historical case.

**Learning outcomes:** observational astronomy, instrument and wavelength selection, mission operations, data trade-offs, and interpretation of astronomical imagery.

---

## Shared System — Survival, Resources, and Engineering Trade-offs

Each mission uses a consistent dashboard, but **the resources shown depend on the vehicle and mission type**. A robotic rover must not display human food and sleep needs unless a clearly labeled fictional crewed mode is selected.

### Astronaut Experience — A Day in Space (Lightweight)

During **crewed missions and optional crewed scenarios**, players briefly experience an astronaut’s daily routine from inside the spacecraft or habitat. This should feel immersive without becoming a separate life simulator or taking attention away from mission design.

- **Plan the day:** Review a short schedule from Mission Control and balance experiments, exploration, maintenance, meals, exercise, and sleep.
- **Look after the crew:** Make quick choices about hydration, food, rest, fatigue, routine health check-ins, and exercise; the persistent health-tracking system records how these choices affect readiness for later tasks.
- **Live aboard:** Interact with a few spacecraft or habitat objects to learn what they do, with short voice narration and optional fact cards.
- **Look outside:** During travel, briefly switch to an interactive space-view window. Point at a visible planet, bright star, or other notable celestial object to identify it and hear or read a short, accurate explanation.
- **Respond to alerts:** Receive brief ground-control warnings and adapt the schedule when a health, equipment, or space-weather issue occurs.

**Design rule:** Present this as a few meaningful, 30–60-second interactions woven into travel and exploration—not a large standalone level. The player experiences the rhythm and responsibility of astronaut life; decisions feed into the existing health, time, and safety systems. Use realistic inspiration from astronaut routines while labeling simplified or fictional mechanics as educational simulations. **Robotic-only and telescope missions** use their own operations routines instead of pretending an astronaut is aboard.

### Astronaut Health Monitoring System — Throughout the Journey

For **every crewed mission**, LEGACY includes a **persistent, interactive health-monitoring system** that follows each astronaut from launch preparation to return. It appears as a compact **Crew Health** tab on the main mission dashboard rather than a separate mission or lengthy minigame. The player can check it at any time, and Mission Control can flag important changes automatically.

**Health indicators to track (simplified in-game values):**

| Category | What the player sees | Educational purpose |
| --- | --- | --- |
| **Vital signs** | Simulated heart rate and oxygen saturation (SpO₂) when measured, plus an overall wellness/readiness indicator | Learn why health checks matter and why one measurement should not be interpreted alone. |
| **Sleep & fatigue** | Hours slept, sleep debt, fatigue trend, schedule consistency | Connect rest and workload to alertness and mission performance. |
| **Food & hydration** | Meals, water intake, remaining supplies, hydration status | Understand nutrition and consumable planning in space. |
| **Exercise & physical condition** | Exercise completed, missed sessions, physical-readiness trend | Learn why astronauts maintain regular physical activity in microgravity. |
| **Stress & workload** | Simplified stress/workload estimate, rest opportunities | Recognize the human limits of demanding mission schedules. |
| **Radiation & exposure** | Simulated accumulated exposure, active EVA time, hazard warnings | Show why exposure planning and mission alerts are essential. |

**How the system works during gameplay:**

1. **Always-visible status:** A small crew-status icon summarizes *Normal / Needs Attention / Action Required*. Selecting it opens individual astronaut profiles, recent measurements, trends, and the planned daily schedule.
2. **Regular check-ins:** At key points in the journey, the player confirms sleep, meals, hydration, exercise, and routine health checks in one quick interaction. Most of the time, the system updates automatically from the simulated schedule and events.
3. **Context-aware warnings:** Mission Control warns about a relevant change, such as growing sleep debt, inadequate hydration, a missed exercise session, or excess modeled radiation exposure during an EVA.
4. **Meaningful choices:** The player can reschedule experiments, reduce workload, plan recovery time, adjust food/water allocation, or postpone an EVA. These choices affect **crew readiness, mission time, available supplies, and scientific opportunities**.
5. **Health history and debrief:** A timeline records indicator changes, warnings, decisions, and consequences. At the end of the mission, the player sees a **Crew Health Report** explaining what happened, why the decisions mattered, and what could be improved with Mission Replay.

**Illustrative scenario:** During the journey, the dashboard shows that an astronaut's fatigue has increased after several shortened sleep periods. Mission Control recommends reviewing the schedule. The player can postpone a nonessential experiment or reduce the next day's workload; the game then shows the resulting effect on crew readiness and mission progress.

**Design and scientific boundaries:** Keep this system **brief and understandable**, not a complex clinical simulator. Health values and thresholds in the game are **fictional or simplified educational simulations**, clearly labeled as such; do not imply that they are live astronaut data, real diagnoses, or NASA-certified medical decision rules. The player learns to monitor trends, recognize warnings, and follow mission safety procedures rather than practice medicine. **Robotic-only missions and unmanned telescope missions have equipment-condition monitoring, not astronaut health statistics.**


### Resource Dashboard

| Resource | Crewed missions | Robotic / telescope missions | Typical consequence |
| --- | --- | --- | --- |
| **Energy / power** | Life support, communication, equipment | Instruments, locomotion, onboard computers, observation | Operations restricted if power is insufficient. |
| **Food / consumables** | Food, water, oxygen and relevant reserves | Not applicable | Crew endurance and planning constraints. |
| **Sleep / fatigue** | Rest periods, workload, performance risk | Not applicable | Fatigue can reduce the safety margin for demanding operations. |
| **Health / exposure** | Persistent crew vital-sign check-ins, sleep, fatigue, hydration, activity, stress, radiation and EVA exposure trends | Hardware temperature / condition instead | Warnings may require recovery time, a schedule change, or postponing unsafe activities. |
| **Time / speed** | Time remaining, travel and EVA duration | Driving speed, observing windows, mission time | Faster is not always safer or scientifically better. |
| **Mass** | Vehicle, instruments, supplies | Vehicle, instruments, deployment hardware | Exceeding capability makes a design infeasible. |
| **Budget** | Development and operating decisions | Development and operating decisions | Forces prioritization and trade-offs. |
| **Data / communications** | Health and mission telemetry | Scientific data, images, command/relay capacity | Some data may need to be compressed, delayed, or prioritized. |
| **Scientific value** | Safe, completed measurements | Useful and interpretable measurements | Better science comes from suitable instruments and careful choices. |

The game uses **simplified, documented models**. A number displayed in gameplay is either (a) sourced historical/scientific information, (b) a calculation made from declared assumptions, or (c) a fictional game-balance value. The interface makes that difference visible.

### Engineering Trade-offs, Not Random Multiple Choice

Every consequential decision should change at least one measured resource or later opportunity:

- **Better camera:** more scientific detail, but increased mass, energy, or data demand.
- **Larger battery:** longer operations, but higher mass or budget use.
- **Faster rover drive:** less elapsed time, but greater modeled mobility risk or energy demand.
- **More science time:** more data, but less margin for rest, power recovery, or unexpected events.
- **Extra protective capability:** improves the safety margin but consumes mission resources.
- **Longer exposure on a telescope:** improves faint-target measurements under the model, but competes with pointing time, tracking limitations, and storage.

A mission can have multiple *good* solutions. However, **crew safety constraints are not optional bonus points**. Designs that cross hard safety limits must be revised, aborted, or redirected to safe recovery.

---

## Unexpected Events — The Mission Can Change

Mission Control does not wait silently while a player progresses. The game injects **scenario-based alerts** at meaningful times. Events are linked to mission context and selected design decisions; they are not random punishments.

### Event A — Solar Storm Warning

**Earth → Mission Control:** *“Solar activity has increased. Review radiation precautions and the current operation schedule.”*

Possible choices:

1. **Pause exposed crew operations** and move to a safer designated area or shelter strategy in the game.
2. **Replan the mission timeline** and protect vulnerable operations.
3. **Ignore the warning**, which the simulation treats as a safety violation or increased risk, not an optimal shortcut.

For robotic and astronomical missions, the same event may affect communications, instrument availability, or an illustrative radiation-sensitive subsystem—without introducing a nonexistent astronaut. It is important to distinguish a **solar radiation event** from a **Martian dust storm**, because they are different hazards.

### Event B — Astronaut Rescue / Emergency Assistance

A fictional EVA crew member is unable to complete the planned route because of fatigue or equipment constraints. The commander must evaluate the remaining time, oxygen, available mobility support, communication, and the safest response.

Choices may include ending the EVA, sending appropriate assistance within modeled safety rules, or using a predefined safe return plan. Players learn **emergency prioritization and contingency planning**, not real-world medical or EVA rescue procedures.

### Event C — Power Failure

An instrument, battery, or solar panel system underperforms. The player can reduce nonessential activities, use a reserve, or sacrifice optional observations to maintain mission-critical functions.

### Event D — Communication Delay or Blackout

Mission Control sends a command, but the spacecraft cannot respond instantly. The player must understand that Moon and Mars operations differ in communication delay and autonomy requirements. The model should represent meaningful delay without pretending every transmission is real-time.

### Event E — Martian Dust Storm

In a Mars rover scenario, decreased sunlight can restrict a **solar-powered** rover's operating energy. This event connects directly to Opportunity's history. It should not automatically be applied in the same way to rovers using other power systems.

**Event design rule:** the player sees the cause, the options, the direct resource changes, and the possible downstream effect; they also learn the scientific concept behind the situation.

---

## In Orbit — Explore Satellites and Solve the Mission Puzzle

The orbital stage should feel alive, exploratory, and educational—not simply like a transition screen.

### A. Interactive Orbit Explorer

The player can view a stylized Earth, rotate the camera, and tap orbiting objects for short information cards:

- **Starlink satellites:** recognizable examples of large satellite constellations in low Earth orbit. **Starlink is operated by SpaceX, not NASA.**
- **Scientific satellites:** examples from NASA Earth-observing or space-science missions, with clearly credited data.
- **Orbital concepts:** altitude, inclination, orbital period, communication coverage, and why different missions need different orbital configurations.

If the team uses real catalog-based orbital positions, it must show the data source and timestamp (for example, **CelesTrak**). If it uses a static or animated demonstration, label the motion **illustrative**, not live real-time tracking.

### B. Mission Parts & Orbit Puzzle

A short educational mini-game asks players to **match floating information markers, spacecraft components, and mission clues to the correct historical mission**.

Example clue sets:

- **Apollo 15:** Lunar Roving Vehicle, lunar module, surface exploration.
- **Perseverance:** Mars rover, science instruments, Jezero Crater.
- **Opportunity:** solar-powered Mars rover, exploration history, Perseverance Valley.
- **Space telescopes:** scientific instruments, pointing systems, data downlink.

The scene presents **virtual archive fragments / clues**, not real NASA hardware physically drifting in orbit. Correct matches unlock a narrated mini-story and explain the component's purpose. Incorrect matches trigger a helpful hint rather than an arbitrary penalty.

### C. Learn While Exploring

Tapping an object opens a concise card with:

**Name · What it is · What it does · Why it matters · How it connects to this mission · Source**

This **Point-to-Learn** system also works on the Moon, Mars, inside spacecraft, and in the telescope interface. It should support both hover and tap/click so touch-screen players are not excluded.

### D. Look Around — Interactive Space Sky

While the player is **in space**, they can briefly switch to a **Look Around** view and explore the sky outside the spacecraft. This is a small, optional educational interaction integrated into travel and mission operations—not a separate level.

- **Look and identify:** Rotate the viewpoint and point to a visible planet, recognizable bright star, the Moon, Earth, or another notable celestial object **when it would be visible from that mission's viewpoint**.
- **Instant fact card:** Hover, click, or tap an object to see **its name, what kind of object it is, one memorable fact, and a short NASA/source link**. Optional voice narration reads the explanation aloud.
- **Context matters:** Objects shown should depend on the spacecraft's location, viewing direction, and simulated time. Not every planet or star should appear from every location, and a bright background or sunlight can limit visibility.
- **Stay immersed:** After viewing an object, the player closes the card and returns immediately to the mission. Exploration can unlock a small entry in the personal **Discovery Log**.
- **Accuracy label:** If the sky scene is artistically arranged or not generated from astronomical position data, mark it **"Illustrative sky — not a real-time star map."** If positional data is used, show its source and the simulated observation date/time.

**Example interaction:** During the Earth-to-Moon journey, a player looks through the window, selects **Earth**, and sees a short explanation of how Earth appears from space. They select a bright star that is represented as visible in the scene and learn its name and one key fact. The interaction takes only a few seconds and never interrupts spacecraft controls or safety alerts.

---

## The Legacy Archive — Storytelling Through Objects

The archive is the game's emotional and educational center.

Instead of showing a wall of text when a player encounters historical equipment, LEGACY opens an **Interactive Memory** with:

1. A short voiced story (with subtitles).
2. An authentic NASA photo, image, or mission reference where available.
3. A simple interactive illustration or 3D model, clearly marked when reconstructed.
4. A short explanation of the object's design, purpose, and contribution.
5. A question or design choice that brings the lesson back into the active mission.

**Sample audio narration — Apollo 15 rover (original proposed game script):**

> “In 1971, astronauts took a rover onto the Moon. It let them travel farther and explore more of the landscape than walking alone. Now it is your turn to design a journey. How much power and mobility will you reserve for exploration—and how will you protect the traces they left behind?”

Stories may be voiced by a fictional Mission Control narrator or a clearly marked dramatized archive voice. Do not invent historical recordings or present generated voices as authentic astronaut audio.

**The distinctive mechanic:** **discover the past → apply its lessons to the future**.

---

## Save Progress, Unlock Stages, and Revisit Decisions

The game should support both short sessions and a longer campaign. Each mission is selectable from the beginning; players can save multiple mission campaigns independently.

- **Autosave at stage transitions** and after important decisions.
- **Continue Mission** from the latest saved checkpoint.
- **Mission Select** on the home screen to start **any of the four missions** or continue an existing save, without unlocking missions in a fixed order.
- **Legacy Archive persistence:** discovered facts, images, stories, and achievements remain accessible.
- **Player profile:** store completed missions, learning outcomes, and decision summaries.
- **Replay / Rewind:** revisit a decision from a checkpoint and compare results under the same simulation rules.

A saved state may include the selected mission, **the initial 3-question answers**, current stage, **starting budget and spend ledger**, selected equipment and component costs, **launch-readiness checks**, objective status, spacecraft configuration, available resources, decision history, event flags, unlocked archive entries, and final-quiz results.

When a decision affects future consequences, the game should explain the cause. For example, insufficient power reserve chosen on Earth may force a shorter scientific operation on Mars. A replay must actually recompute the result; it should not merely display a different prewritten ending unrelated to the player's choices.

---

## The What-If Machine — Every Decision Changes Your Future

At the end of each mission, show a **Mission Decision Timeline**:

1. **Mission Design:** Selected a heavier camera but reduced the power reserve.
2. **Transit / Orbit:** Used extra energy during an unplanned maneuver.
3. **Exploration:** Had less available power for an important observation.
4. **Debrief:** Learned why the observation was shortened and what alternative configuration could have helped.

Then offer **Rewind to Decision 1**. The player changes a component, reruns the same rules, and compares the mission outcome.

### Example Interactive Situation — Human Factor

**MISSION CONTROL — DAY 08**  
**Crew:** Strained  
**Energy:** Limited  
**Science:** On track

> “Your crew has accumulated sleep debt. A major scientific operation is scheduled. What will you do?”

**Option A — Delay science operations and allow recovery.**  
Modeled result: lower fatigue risk, but a schedule delay and possibly fewer measurements.

**Option B — Continue at the original pace.**  
Modeled result: more immediate science opportunity, but greater performance risk; an unsafe option may trigger an abort requirement.

**Option C — Reduce the workload and operate essential systems only.**  
Modeled result: a compromise with lower near-term science output and more stable resources.

These are **illustrative game outcomes**, not clinical predictions or NASA operational rules.

---

## Mission Endings and Achievements

Avoid treating the story as a simple **Win / Lose** quiz. Each completed mission receives a debrief that explains the scientific outcome, engineering feasibility, safety, and lessons learned.

Possible achievements:

- **Scientific Pioneer:** completed valuable scientific observations with a sound plan.
- **Crew Guardian:** protected the crew and adjusted the mission responsibly.
- **Heritage Protector:** documented an Apollo or Opportunity site without disturbing it.
- **Careful Investigator:** interpreted a possible Martian biosignature without claiming certainty.
- **Cosmic Photographer:** collected and interpreted a useful observing sequence.
- **Mission Redesign Required:** found a critical design weakness and learned how to correct it.

Achievements are feedback and encouragement. **Unsafe actions must never earn an advantage just because they produce dramatic science results.**

---

## Learning Before and After the Game

LEGACY is designed to improve understanding, not merely entertain. The educational impact should be tested rather than assumed.

### Before Playing — Initial Knowledge Check

On the **home screen**, a visible **“Before You Launch — 3 Questions”** tile introduces the assessment. After the player selects a mission, they answer **exactly three baseline questions before the Earth equipment workshop**. The exact questions and developer answer key are specified in the **Initial Knowledge Check** section above. The design themes can cover:

- Why a spacecraft cannot carry every possible instrument.
- How crew fatigue or limited resources can affect a mission.
- What observations can tell us about past water on Mars.
- Why a potential biosignature is not proof of life.
- Why a telescope's wavelength and observing time matter.

The questions should assess understanding rather than ask players to memorize obscure facts. A short, optional diagnostic can adjust tutorial difficulty.

### After Playing — Final Knowledge Check

After completing a mission, students answer **three different but equivalent questions** on the same concepts. These questions are separate from the pre-quiz so we are testing knowledge transfer rather than memory of the original wording. The game presents:

- Initial versus final knowledge-check results.
- Concepts improved and concepts that still need practice.
- Specific explanations tied to the player's decisions.
- Optional replay of a mission or stage to practice weaker concepts.

### Impact Measurement

The initial target audience is **students aged 13–18**. A small pilot with students or educators could assess gameplay clarity, conceptual understanding, and engagement.

**Example evaluation procedure:** an **exactly 3-question** pre-test, a short guided gameplay session, and an **exactly 3-question** comparable post-test. Report only **actual measured results**, along with the number of participants and limitations. A small pilot may provide useful feedback but cannot prove long-term learning or a broad population effect.

The longer-term educational goal is for learners to understand how **engineering trade-offs, astronaut well-being, scientific evidence, and historic achievements** are connected in space exploration.

---

## Visual and Audio Experience

The game should feel like an accessible miniature mission-control experience rather than a collection of quizzes.

- **Main menu:** four large clickable mission cards, each with a destination, game budget, save status and **Start / Continue**, plus a clearly visible **3-question initial quiz** tile.
- **Earth Build Workshop:** equipment cards with understandable explanations, real-time budget bar, mass/power/data limits, protected reserve, ground-control warnings, and a dramatic **LAUNCH** action after readiness approval.
- **Mission Control:** clean dashboards, live resource indicators, incoming messages, a compact **Crew Health** tab for crewed missions (health trends, alerts, check-ins, and history), and clearly explained engineering limits.
- **Earth / Orbit:** an interactive Earth view with satellite markers, recognizable orbital paths, and clickable learning cards.
- **Interactive space view:** a quick **Look Around** mode during spaceflight, with selectable visible planets, bright stars, and notable objects; short fact cards and optional narrated descriptions.
- **Moon:** a navigable lunar exploration map with authentic Apollo imagery and a heritage-preservation objective.
- **Mars:** atmospheric rover exploration environments, route planning, investigation points, and historic mission clues.
- **Observatory:** an instrument-selection panel, sky target, observation timeline, and scientific image gallery.
- **Audio:** optional narrator, Mission Control dialogue, archive stories, notification sounds, and subtitles.
- **Accessibility:** readable typography, keyboard and touch-friendly controls, subtitles for all speech, and a way to mute narration or reduce motion.

A sophisticated visual experience is valuable only if it supports meaningful decisions and accurate learning. Every visually impressive feature should connect to at least one actual mechanic.

---

## Scientific Integrity and the Use of Real Data

LEGACY is a **fictional educational game inspired by real scientific work**, not a NASA-operated mission or a certified engineering or medical simulator.

**Separate three kinds of content in the interface:**

1. **Verified NASA historical/scientific material:** mission dates, photographs, locations, instruments, published findings, and credited visuals.
2. **Educational calculations:** simplified mass, power, time, data, and risk models with visible assumptions.
3. **Fictional events:** new expeditions, rescue situations, simulated alerts, mission characters, and game-balanced resource values.

The player should always be able to tell which is which. **In particular, NASA-reported historic mission costs must never be confused with LEGACY's fictional starting dollar budgets or component prices.**

Key accuracy safeguards:

- **Apollo:** Use real Apollo 15 material; do not portray historical hardware as collectible debris. Explain heritage-site precautions.
- **Martian Mystery:** Present Cheyava Falls / Sapphire Canyon as evidence under investigation, **not confirmed extraterrestrial life**.
- **Opportunity:** State that communication stopped in **2018** and NASA ended the mission in **2019**; do not imply its last operational area is entirely unknown.
- **Crew health:** Use simulated monitoring indicators and label them as educational game data; never claim medical diagnoses, real astronaut measurements, or operational NASA medical validation.
- **Mars crew health:** Keep robotic missions robotic unless a crewed extension is explicitly fictional.
- **Solar events versus dust storms:** Do not conflate radiation hazards with reduced sunlight caused by Martian dust.
- **Starlink:** Credit **SpaceX** as operator and any independent orbital data provider by name; it is not a NASA satellite constellation.
- **L2:** Describe it as an appropriate example for some observatories, including Webb, not a universal observing location.
- **Space sky:** Show celestial objects that fit the represented viewpoint and simulated time; label decorative or approximate sky arrangements as illustrative, not as a verified live star chart.
- **Supernova scenario:** Distinguish archived NASA observations from a simulated live alert or observing opportunity.

---

## Final Concept

LEGACY should not feel like a conventional rocket simulator, and it should not be a simple educational quiz with space backgrounds.

It should let a student **become a mission commander**, choose **one of four missions on the first screen**, answer **three important questions before learning**, begin **on Earth with a limited NASA-inspired game budget**, select equipment and components, pass a real readiness check, **launch**, confront an unexpected problem, learn from the spacecraft and people who came before, and discover how one engineering decision changes what becomes possible later.

Its four missions tell different stories—**Apollo's lunar legacy, an uncertain Martian discovery, Opportunity's remarkable journey, and a rare cosmic event**—while teaching one central lesson:

> **Space exploration is not just about reaching a destination. It is about asking the right questions, making responsible decisions, protecting people and places, and learning from every mission.**

**LEGACY — Every Mission Leaves a Story.**

**Choose your mission on Earth. Build within your budget. Launch what you designed. Discover what your decisions make possible.**

---

## Source and Inspiration Links

These links support the historical and scientific ideas that the fictional missions draw upon. The game should credit individual images, datasets, and models at the point where they are used.

### NASA mission cost references (historical cost figures; not game budgets)

- [NASA — A Brief History of NASA (Apollo total program cost)](https://www.nasa.gov/history/SP-4225/documentation/brief-history/history.htm)
- [NASA/JPL — Mars 2020 Press Kit, Quick Facts (Perseverance funding)](https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/quick_facts/)
- [NASA/JPL — Mars Exploration Rover Landing Press Kit (Spirit + Opportunity program cost)](https://www.jpl.nasa.gov/news/press_kits/merlandings.pdf)
- [NASA Goddard — Swift mission FAQ (observatory cost)](https://imagine.gsfc.nasa.gov/observatories/learning/swift/faq/)
- [NASA — Webb Telescope Review (2018 total life-cycle cost estimate)](https://www.nasa.gov/news-release/nasa-completes-webb-telescope-review-commits-to-launch-in-early-2021/)

### Lunar legacy and heritage

- [NASA Science — Apollo 15 on the Moon](https://science.nasa.gov/resource/apollo-15-on-the-moon/)
- [NASA Science — Apollo 15 Lunar Rover and Instruments](https://science.nasa.gov/resource/apollo-15-mission-image-view-of-the-apollo-lunar-surface-experiments-package-alsep/)
- [NASA Science — Retracing the Steps of Apollo 15 (LRO imagery)](https://science.nasa.gov/photojournal/retracing-the-steps-of-apollo-15/)
- [NASA — Recommendations for Protection of Lunar Historic Sites](https://www.nasa.gov/wp-content/uploads/2023/12/nasa-usg-lunar-historic-sites-reva.pdf)

### Mars missions and science

- [NASA Science — Perseverance Rover](https://science.nasa.gov/mission/mars-2020-perseverance/)
- [NASA Science — Mars Report, September 2025: potential biosignatures](https://science.nasa.gov/mars/the-mars-report/2025-september-special-edition/)
- [NASA Science — Opportunity Rover](https://science.nasa.gov/mission/mer-opportunity/)
- [NASA Science — Opportunity mission ends (2019)](https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/)

### Human factors, observatories, and orbits

- [NASA — Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA — Risk from Inadequate Sleep and Irregular Schedules](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/)
- [NASA — Space Radiation Hazard](https://www.nasa.gov/hrp/hazard-space-radiation/)
- [NASA Science — Webb's Orbit Near L2](https://science.nasa.gov/asset/webb/webbs-orbit-at-sun-earth-lagrange-point-2-l2/)
- [NASA Science — James Webb Telescope Overview](https://science.nasa.gov/mission/webb/science-overview/science-explainers/telescope-overview/)
- [CelesTrak — Starlink orbital catalog (non-NASA)](https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json)

*Project concept prepared for the NASA Space Apps Challenge 2026. LEGACY is an independent educational game concept and is not an official NASA product.*
