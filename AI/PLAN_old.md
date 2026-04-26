# PLAN.md — Development Plan

## Project: Kinect Adventures Remake (Master IA2 — Nice 2025-2026)
**Due:** Sunday 26 April midnight
**Stack:** p5.js + ml5.js (CDN) — browser only

---

## Phase 1 — Vehicle Base & Circuit
**Goal:** A working 2D obstacle course with a keyboard-controlled Vehicle.

### Tasks
- [ ] HTML boilerplate with p5.js + ml5.js via CDN
- [ ] Implement `Vehicle` base class:
  - `pos`, `vel`, `acc`, `maxSpeed`, `maxForce`
  - `applyForce()`, `update()`, `draw()` (triangle shape)
  - `seek()`, `flee()`, `arrive()`, `separate()`
- [ ] Draw Top-Down vertical scrolling river with rocks (low) and logs (high)
- [ ] Add waypoints along the circuit (for fitness and path following)
- [ ] Implement Z-Axis simulation: Jump (scale up, ignore low), Duck (scale down, ignore high)
- [ ] `Player extends Vehicle` — keyboard-controlled (arrow keys) for now
- [ ] Basic collision detection
- [ ] HUD: distance, score, current waypoint

### Deliverable
> Playable obstacle course navigated by keyboard, using Vehicle base class.

---

## Phase 2 — ml5 PoseNet Player Control
**Goal:** Replace keyboard with webcam body gestures.

### Tasks
- [ ] Initialize ml5 PoseNet / MoveNet from webcam
- [ ] Map keypoints to game actions:
  - Both wrists above shoulders → `jump`
  - Hips drop → `duck`
  - Shoulder midpoint left → `lean left`
  - Shoulder midpoint right → `lean right`
  - Right wrist raised sharply → `block`
- [ ] Calibration step at game start (normalize keypoints to player body size)
- [ ] Optional: draw skeleton overlay on canvas (debug mode toggle)
- [ ] Keyboard fallback if no webcam detected

### Deliverable
> Player navigates the circuit using body via webcam.

---

## Phase 3 — BehaviorManager + KinectAgent
**Goal:** AI agents that use steering behaviors via BehaviorManager.

### Tasks
- [ ] Implement `BehaviorManager`:
  - `add(name, fn, weight)` / `remove(name)`
  - `enable(name)` / `disable(name)`
  - `computeForce(agent)` → weighted sum of all active behavior forces
  - `save()` → JSON / `load(JSON)`
- [ ] Implement `KinectAgent extends Vehicle`:
  - N configurable raycast sensors (obstacle distances)
  - `ml5.neuralNetwork` brain
  - `BehaviorManager` instance with: seek, flee, separation, pathFollow
  - Fitness tracker: distance + speed
- [ ] Run population of 20 agents simultaneously
- [ ] Visualize agents on canvas (color-coded by fitness)
- [ ] Debug mode: show raycasts

### Deliverable
> 20 agents navigate randomly using steering behaviors (no training yet).

---

## Phase 4 — Neuro-Evolutionary Algorithm
**Goal:** Agents improve across generations automatically.

### Tasks
- [ ] Neural network **outputs = behavior weights**, not raw actions:
  ```
  [w_seek, w_flee, w_separation, w_pathFollow]
  ```
- [ ] Implement `Population` class:
  - `evaluate()` — run all agents, compute fitness
  - `select()` — pick top agents by fitness (elitism)
  - `crossover(parentA, parentB)` — blend NN weights
  - `mutate(agent)` — perturb weights by mutation rate
  - `nextGeneration()` — replace old population
- [ ] Fitness function:
  ```
  fitness = distance * 1.0 + (1000/time) * 0.5 + waypoints * 100 - crashes * 50
  ```
- [ ] Stop condition: 60% of agents complete a full lap without crashing
- [ ] HUD: generation counter, best fitness, fitness graph

### Deliverable
> Agents visibly improve over generations and eventually navigate the circuit.

---

## Phase 5 — Network Topology UI (Sliders)
**Goal:** User configures neural network before training.

### Tasks
- [ ] Sliders / inputs for:
  - Number of raycasts (= input neurons, variable part)
  - Number of hidden layers (1–4)
  - Neurons per hidden layer (4–64)
  - Activation function: sigmoid / relu / tanh
  - Population size (10–100)
  - Mutation rate (0.01–0.5)
  - Mutation magnitude
- [ ] "Start Training" button rebuilds and restarts with new topology
- [ ] Optional: live network diagram visualization

### Deliverable
> User can tune and experiment with network architecture.

---

## Phase 6 — Circuit Generator & Editor
**Goal:** Multiple circuits with varying difficulty.

### Tasks
- [ ] Procedural circuit generator with difficulty levels:
  - `easy` — wide gaps, slow obstacles, gentle curves
  - `medium` — standard
  - `hard` — narrow gaps, faster obstacles
  - `killer` — extreme, requires precise navigation
- [ ] Manual circuit editor: click to place/remove obstacles and waypoints
- [ ] Save/load circuits as JSON (file download/upload or localStorage)
- [ ] Preset circuit library (at least 4)
- [ ] Circuit selection UI

### Deliverable
> Multiple circuits, editable and saveable.

---

## Phase 7 — Brain Save / Load & Competition Mode
**Goal:** Save trained brains and pit them against each other.

### Tasks
- [ ] Export trained brain as JSON (download file)
- [ ] Import brain from JSON file
- [ ] Brain metadata: name, generation, circuit trained on, best fitness
- [ ] Competition mode:
  - Load up to 20 different brains
  - Run them simultaneously on the same circuit
  - Live leaderboard ranked by fitness

### Deliverable
> Brains from different training runs can race each other.

---

## Phase 8 — Circuit Generalization
**Goal:** One brain handles multiple circuits (generalizable behavior).

### Tasks
- [ ] After stop condition on circuit 1, auto-load circuit 2 and continue training (don't reset weights)
- [ ] Circuit ID as NN input
- [ ] Optional: curriculum learning — auto-advance when stop condition met
- [ ] Visualize transfer performance (fitness on new circuit vs trained circuit)

### Deliverable
> A single brain that generalizes across difficulty levels.

---

## Phase 9 — Bonus Features (if time allows)
- [ ] **Separation behavior** already in BehaviorManager — tune weights during race
- [ ] **Mouse-click obstacles** — add obstacles mid-race by clicking canvas
- [ ] **Decision tree: pit stops** — agent detects low fuel → disable race behaviors → enable path-to-pit behaviors → refuel → re-enable race
- [ ] **Two-player mode** — player vs best AI agent side by side
- [ ] **Predators** — pursue behavior chasing slow agents

---

## Phase 10 — Polish & Delivery
- [ ] Clean and readable code with comments
- [ ] Write `README.md`:
  - Project description and objectives
  - How to run
  - Fitness function documentation
  - Architecture explanation
  - Section "MON EXPERIENCE" (why this game, which behaviors, difficulties, how resolved)
  - IDE used + AI models used
- [ ] Host on **GitHub Pages** or **itch.io** — link in README
- [ ] Record **YouTube video** (1-2 min demo + voiceover explanation)
- [ ] Send GitHub repo link to professor by email

---

## Timeline

| Phase | Content | Time estimate |
|---|---|---|
| 1 | Vehicle base + circuit | 2–3h |
| 2 | PoseNet player control | 2–3h |
| 3 | BehaviorManager + agents | 3–4h |
| 4 | Neuro-evolution loop | 3–4h |
| 5 | Topology sliders UI | 1–2h |
| 6 | Circuit generator/editor | 3–4h |
| 7 | Brain save/load + competition | 2h |
| 8 | Generalization | 2h |
| 9 | Bonus features | if time |
| 10 | Polish + README + video | 2–3h |

---

## Fitness Function Documentation

```
fitness(agent) =
    distance_covered * 1.0        // primary metric: progress on circuit
  + (1000 / time_alive) * 0.5     // speed bonus: faster agents score higher
  + waypoints_reached * 100       // rewards reaching checkpoints
  - crash_count * 50              // discourages reckless agents
```

This function rewards agents that are **fast AND precise**, not just those that inch forward slowly.

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| ML library | ml5.js | Required by professor, integrates with p5.js |
| NN outputs | Behavior weights | Aligned with Challenge #69, more elegant than raw actions |
| Evolution | Custom neuro-evolution | Full control, matches course examples |
| Base class | Vehicle (all objects) | Required by professor |
| Behavior system | BehaviorManager | Recommended by professor, clean architecture |
| Player input | ml5 PoseNet | Creative, meets ml5 requirement |
| Circuit type | Top-Down Vertical | Best fit for steering + PoseNet leaning |
| Brain storage | JSON download/upload | No backend, portable |
| Hosting | GitHub Pages | Free, no backend needed |

---

## README Structure (required)
```markdown
# Project Title
## Description
## How to Run
## Architecture
## Fitness Function
## Neural Network Topology
## Circuit Generator
## MON EXPERIENCE
  - Pourquoi ce jeu
  - Quels comportements choisis
  - Comment réglés
  - Difficultés rencontrées
  - Comment résolues
## IDE + AI Models Used
```
