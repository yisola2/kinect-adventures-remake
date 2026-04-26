# Kinect Adventures Remake: Top-Down River Rush

This plan details the implementation of a Top-Down 2D "River Rush" game using p5.js and ml5.js, satisfying all Master IA2 course requirements.

## Mechanics Overview
1. **Perspective:** Top-Down 2D. The river flows from top to bottom.
2. **Mechanics:** 
   - **Steer:** Move left/right to dodge rocks.
   - **Jump:** Avoid "Low" obstacles (simulated by enlarging the raft and ignoring low collisions).
   - **Duck:** Avoid "High" obstacles (simulated by flattening the raft and ignoring high collisions).
3. **AI:** Neuro-evolutionary agents use raycasts to detect obstacles and output Steering, Jump, and Duck commands.
4. **Player:** Uses webcam (PoseNet/MoveNet) to lean, raise hands (jump), and squat (duck).

## Proposed Implementation Phases

### Phase 1: Base Engine & Physics (p5.js)
Establish the 2D canvas, the Vehicle base class, and the procedural river.
- **Resource Reuse:** We will copy and adapt `Vehicle.js` and `BehaviorManager.js` from the existing `tp/` directory to save time and guarantee stable steering physics.
- `index.html`: Canvas container and CDN links for p5.js, ml5.js.
- `sketch.js`: Main game loop, rendering the scrolling river background.
- `vehicle.js`: Base class updated with `zState` (Normal, Jumping, Ducking).
- `obstacle.js`: Procedural obstacle spawner (Rocks = Low, Bridges = High, Walls = Impassable).

### Phase 2: Player Control (ml5.js)
Integrate the webcam and PoseNet/MoveNet.
- `player.js`: Extends `Vehicle`. 
- `poseNet.js`: Maps webcam keypoints:
  - Leaning = `applyForce(left/right)`
  - Wrists above head = `setJumping(true)`
  - Nose drops = `setDucking(true)`

### Phase 3: AI Agents & Steering Behaviors
Implement the autonomous agents using Craig Reynolds' steering.
- `agent.js`: Extends `Vehicle`. 
- `sensors.js`: 5 forward-facing raycasts to detect obstacle type and distance.
- `behaviorManager.js`: Calculates weighted forces (Seek forward, Avoid obstacles).

### Phase 4: Neuro-Evolution (The Genetic Algorithm)
Introduce the ml5.js Neural Network to evolve the agents.
- `population.js`: Manages 20 agents. Evaluates fitness based on distance traveled and collisions.
- **Neural Network Topology:**
  - **Inputs:** 5 raycast distances + obstacle type.
  - **Outputs:** Steering Force (Left/Right), Jump Probability, Duck Probability.
- Genetic operations: Selection, Crossover, Mutation.

### Phase 5: UI & Polish
Add sliders and save/load features.
- `ui.js`: DOM sliders for Mutation Rate, Population Size, etc.
- **Save/Load:** Export/Import trained brains (JSON) and procedural seeds to race different brains on the same river.

## Verification Plan
1. **Physics Check:** Ensure jump/duck correctly bypasses specific obstacle types.
2. **AI Check:** Ensure the population learns to steer, jump, and duck over generations.
3. **Webcam Check:** Ensure PoseNet correctly identifies body gestures in real-time without severe framerate drops.
