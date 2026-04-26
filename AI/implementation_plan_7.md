# Bug Fixes and Architectural Improvements

Your other AI assistant is incredibly sharp! It caught several edge cases, mathematical incoherences, and memory leaks that are completely valid. 

The only point where it is wrong is **Point 9 (Network Topology Sliders)** — we actually *just* implemented that in our last phase, so its snapshot of the code was slightly outdated!

Here is my plan to systematically fix the valid issues it raised:

## Proposed Changes

### 1. Crash Prevention & Memory Leaks
- **`keyPressed` Crash:** Add a guard `if (!player) return;` in `sketch.js` so pressing arrow keys outside of Play Mode doesn't crash the game.
- **GPU Memory Leak:** Update the "Stop / Main Menu" button logic in `ui.js` to properly call `.dispose()` on all TensorFlow neural networks before destroying the agents array, preventing memory leaks over multiple training sessions.
- **Webcam Light:** When clicking Stop, explicitly stop the webcam video tracks so the green light on your laptop turns off.

### 2. Physical & Fitness Mathematical Incoherences
- **Unlock Y-Axis Movement:** The AI correctly noticed that locking the agents to `y = height - 100` makes the `seekForward` behavior useless. I will unlock the Y-axis so agents can physically push forward up the river (up to a limit), allowing the neural network to actually learn acceleration!
- **Fix Fitness Formula:** Because Y was locked, distance was just a clone of time alive. By unlocking Y, agents can truly travel further in less time. I will also fix the `(1000 / timeAlive)` bug which mathematically penalized agents for surviving longer.

### 3. Population & Generation Flow
- **Reset Fitness & Timers:** Reset `this.bestFitness` and `circuitManager.spawnTimer` at the start of every generation so the HUD generation stats don't permanently freeze at all-time highs and obstacle pacing doesn't drift.
- **Negative Fitness Protection:** Clamp fitness to `Math.max(0.1, fitness)` before roulette-wheel selection to prevent mathematical collapse if an agent gets a negative score from a crash penalty.
- **Stop Condition:** Implement the 60% completion rule. If 60% of agents survive past a massive distance threshold (e.g., 5000px), training automatically halts, saves the brain, and celebrates.

### 4. Semantic naming
- Rename `Agent` class to `KinectAgent` to strictly follow your professor's UML diagram requirements.

## User Review Required

Does this plan look good to you? If you approve, I will execute these bug fixes to make the simulation mathematically sound and completely stable!
