# Phase 5: UI Controls & Polish

This phase focuses on building a clean user interface around the game canvas, allowing you to tweak the Neural Network's parameters in real-time without modifying the code.

## Proposed Changes

### 1. `index.html`
- Create a two-column layout:
  - **Left Column**: The p5.js Game Canvas.
  - **Right Column**: A styled control panel for the Neural Network.
- Add `<input type="range">` sliders for:
  - Mutation Rate (0.01 to 0.5)
  - Population Size (10 to 100)
  - (Optional) Game Speed multiplier to train faster.
- Add a "Reset Simulation" button.

### 2. `ui.js` [NEW]
- Create a new file dedicated to handling the DOM elements.
- This script will read the values from the HTML sliders and update the global variables in `sketch.js` and `population.js` instantly.

### 3. `sketch.js` & `population.js`
- Export `POP_SIZE` and mutation rates as variables that can be modified by `ui.js`.
- Add a `resetSimulation()` function that clears the current population and restarts it with the new UI settings.

## User Review Required

> [!IMPORTANT]
> The original instructions also mention sliders for **Network Topology (hidden layers, neurons/layer, activation)**.
> Changing the number of hidden layers or neurons *while* the game is running requires completely deleting all current brains and starting evolution from scratch, because the mathematical shape of the brains changes. 
> 
> **Question:** Should we include the Topology sliders right now, or just start with Mutation Rate and Population Size?

Please approve this plan or let me know if you want to modify the UI controls!
