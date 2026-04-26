# CLAUDE.md — Project Context

## Project Name
**Kinect Adventures Remake** — A neuro-evolutionary game combining steering behaviors and body-controlled player interaction.

## Academic Context
- **Course:** Master IA2 — Steering Behaviors (Nice 2025-2026)
- **Type:** Mini-project (binôme autorisé) — due Sunday 26 April midnight
- **Inspired by:** The Coding Train — Coding Challenge #69: Evolutionary Steering Behaviors
- **Also inspired by:** Course Example 9 — neuro-evolutionary cars on a circuit
- **Deliverables:** GitHub + GitHub Pages or itch.io + YouTube video (1-2 min)

---

## Core Concept
Instead of cars on a road, we use a **Kinect Adventures-style Top-Down Vertical River (River Rush)** where:
- The **player** is controlled via webcam + ml5 PoseNet (body gestures: jump, duck, lean)
- **AI agents** (population of ~20) are `Vehicle` subclasses that evolve using neuro-evolution
- The neural network does **not** output raw actions (left/right) — it outputs the **weights of steering behaviors**
- This is a direct extension of Challenge #69: instead of food/poison attraction weights, agents learn circuit-navigation behavior weights

---

## Mandatory Requirements
- **ml5.js** for player body/gesture control (hands, head, face, mouth, eyes)
- **Neural network + neuro-evolutionary algorithm** (like course Example 9)
- **Document fitness function** clearly
- **UI sliders** to configure network topology (inputs, hidden layers, neurons/layer, activation)
- **Stop condition** for training (e.g. 60% of agents complete a lap)
- **Circuit generator/editor** with difficulty levels (easy, medium, hard, killer)
- **Save/load trained brains** (JSON) for competitions between brains
- **Steering behaviors during race** (separation, obstacle avoidance, path following, etc.)
- Bonus: decision trees (pit stops when fuel runs out)

---

## Tech Stack
- **p5.js** — game canvas, rendering, physics, game loop
- **ml5.js** — PoseNet/MoveNet for player + `ml5.neuralNetwork()` for AI agents
- **TensorFlow.js** (via ml5) — underlying neural network engine
- **Vanilla JS / HTML** — no framework, runs entirely in browser, CDN only

---

## Architecture Overview

```
ml5.PoseNet (webcam)
    ↓ player keypoints (jump, duck, lean left/right, block)
p5.js Game Loop
    ↓ game state (obstacles, waypoints, all agents)
Vehicle (base class — every animated object)
    ↓ extended by subclasses
KinectAgent extends Vehicle        ← AI agents (neuro-evolved)
    ↓ sensors: N configurable raycasts
ml5.NeuralNetwork (brain)
    ↓ outputs = WEIGHTS for each steering behavior
BehaviorManager
    ↓ weighted sum of behavior forces → final steering force
    ├── seek(nextWaypoint)
    ├── flee(nearestObstacle)
    ├── separation(otherAgents)
    └── pathFollowing(circuit)
Neuro-Evolutionary Algorithm
    ↓ fitness → selection → crossover → mutation → next generation
```

---

## Class Structure

```
Vehicle (base class — ALL animated objects)
├── properties: pos, vel, acc, maxSpeed, maxForce
├── methods: seek(), flee(), arrive(), separate(),
│            pursue(), evade(), pathFollow()
│            applyForce(), update(), draw()
│
├── KinectAgent extends Vehicle      ← AI agents (neuro-evolved)
│   ├── brain: ml5.neuralNetwork
│   ├── sensors: raycasts (N configurable)
│   ├── fitness: distance + speed bonus
│   └── behaviorManager: BehaviorManager
│
├── Player extends Vehicle           ← webcam-controlled player
│   └── controlled by ml5 PoseNet keypoints
│
└── Obstacle extends Vehicle         ← moving obstacles (optional)

BehaviorManager  (optional but recommended by professor)
├── behaviors: Map<name, { fn, weight, active }>
├── add(name, fn, weight)
├── remove(name) / enable(name) / disable(name)
├── computeForce(agent) → weighted sum of all active forces
├── save() → JSON
└── load(JSON)
```

---

## Neural Network

### Inputs (configurable via sliders)
- N raycast distances to obstacles (default: 5 directions)
- Next 2-3 waypoint positions (relative x, y)
- Current speed
- Distance to nearest other agent (for separation)
- Circuit ID (which circuit is active)

### Outputs = Steering Behavior Weights
```javascript
// NN does not output left/right/jump — it outputs HOW MUCH to apply each behavior
outputs = {
  w_seek_waypoint,   // attraction toward next waypoint
  w_flee_obstacle,   // repulsion from obstacles
  w_separation,      // repulsion from other agents
  w_path_follow,     // force to stay on path
}
// Final force = Σ(weight_i × behaviorForce_i)  via BehaviorManager
```

### Topology (UI sliders)
| Parameter | Range | Default |
|---|---|---|
| Input neurons | N raycasts + fixed | ~12 |
| Hidden layers | 1–4 | 2 |
| Neurons/layer | 4–64 | 16 |
| Activation | sigmoid / relu / tanh | relu |
| Population size | 10–100 | 20 |
| Mutation rate | 0.01–0.5 | 0.1 |

---

## Fitness Function
```
fitness(agent) =
    distance_covered * 1.0        // primary: how far along the circuit
  + (1000 / time_alive) * 0.5     // speed bonus: faster = better
  + waypoints_reached * 100       // milestone reward
  - crash_count * 50              // penalty per collision
```

## Stop Condition
Training stops when **60% of agents** complete at least one full lap without crashing.

---

## Player Controls (ml5 PoseNet)
| Body Gesture | Game Action |
|---|---|
| Both wrists above shoulders | Jump |
| Hips drop (squat) | Duck |
| Shoulder midpoint shifts left | Lean left |
| Shoulder midpoint shifts right | Lean right |
| Right wrist raised sharply | Block |

---

## Circuit Generalization
- One brain trained progressively: circuit 1 → fine-tune on circuit 2 → etc.
- Circuit ID is included as NN input so brain knows its context
- Circuits increase in complexity (curriculum learning)

---

## File Structure
```
/
├── index.html
├── sketch.js            ← p5.js main game loop
├── vehicle.js           ← Vehicle base class (all steering behaviors)
├── agent.js             ← KinectAgent extends Vehicle
├── player.js            ← Player extends Vehicle (PoseNet)
├── population.js        ← neuro-evolutionary algorithm
├── behaviorManager.js   ← BehaviorManager
├── circuit.js           ← circuit generator / editor
├── ui.js                ← sliders, HUD, topology config
├── brainStorage.js      ← save / load JSON brains
├── CLAUDE.md            ← this file
├── PLAN.md              ← development plan
└── README.md            ← project doc (required by professor)
```

---

## Hard Constraints
- Everything runs **in the browser**, no backend
- All libraries via CDN (p5.js, ml5.js)
- Works with a standard laptop webcam
- Hosted on GitHub Pages or itch.io
- **All animated objects must be Vehicle subclasses**
- **All base steering behaviors live in Vehicle**, custom/combined in subclasses
