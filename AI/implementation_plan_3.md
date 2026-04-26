# Phase 6: Circuit Generator & Progression

Our game is currently an endless river that randomly spawns obstacles. To meet the requirements of Phase 6, we need to introduce structured **Circuits** with different **Difficulty Levels**.

## Proposed Changes

### 1. The `CircuitManager` Class (`circuit.js`)
We will create a new file to manage how and when obstacles spawn based on difficulty:
- **Easy:** Obstacles spawn slowly (every 90 frames), rocks are small, logs are narrow.
- **Medium:** Standard pacing (every 60 frames).
- **Hard:** Obstacles spawn fast (every 40 frames), leaving very narrow gaps.
- **Killer:** Extreme pacing (every 25 frames) with wide logs requiring perfect jump/duck timing.

### 2. UI Difficulty Selector
- Add a dropdown menu to `index.html` allowing you to pick the Circuit Difficulty.
- Add a "Curriculum Learning" checkbox. If checked, the game starts on Easy, and once an AI survives for 20 seconds, it automatically bumps the difficulty to Medium, then Hard!

### 3. Waypoints (Checkpoint System)
- The plan requires "waypoints" for fitness evaluation.
- We will spawn an invisible horizontal line (checkpoint) every 500 pixels. When an agent crosses it, they get a massive fitness bonus. This stops agents from just spinning in circles to stay alive.

## User Review Required

> [!IMPORTANT]  
> The original plan mentions a **"Manual circuit editor: click to place/remove obstacles"**. 
> Because our game is a vertical endless scroller (like Subway Surfers) rather than a static F1 race track, a manual click-to-place editor is very clunky. It would require pausing the game, unrolling a massive canvas, placing rocks, and saving it.
> 
> **Question:** Can we skip the manual point-and-click editor and focus purely on the **Procedural Difficulty Generator**? Procedural generation is usually much better for endless runner Neuro-Evolution!

Please review this plan. If you agree to skip the manual editor, I will start building `circuit.js`!
