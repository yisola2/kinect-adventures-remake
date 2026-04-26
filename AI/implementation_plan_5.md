# UI Action Menu & Idle State Workflow

We will refactor the UI and Game Loop so that the application acts like a proper game rather than automatically running scripts. 

## Proposed Changes

### 1. New Default Game Mode: `IDLE`
- In `sketch.js`, the default `GAME_MODE` will be changed from `TRAINING` to `IDLE`.
- When in `IDLE` mode, the canvas will simply draw the blue river and display a welcome text: **"Welcome! Please select a mode from the right panel."** No agents, no obstacles, no webcam.

### 2. Refactored UI Panel (`index.html` & `ui.js`)
We will organize the UI panel into distinct "Action Modules":

**Module A: Train AI**
- Sliders for Mutation Rate and Population Size.
- A **"Start Training"** button. Clicking this sets `GAME_MODE = 'TRAINING'` and begins neuro-evolution.

**Module B: Competition Mode**
- Brain file uploader.
- A **"Start Competition"** button. Clicking this sets `GAME_MODE = 'COMPETITION'` and races the uploaded brains.

**Module C: Play Mode**
- A **"Play (Webcam)"** button. Clicking this sets `GAME_MODE = 'PLAY'`, asks for camera permissions, and lets you play.

### 3. Removing the Pause Band-Aid
Since the user now has explicit control over when to enter and exit modes, we can remove the "Start/Pause" toggle button and the `isPaused` logic. If you want to stop, you just click "Stop" or select a different mode!

## User Review Required

Does this menu-style layout sound good? Once you approve, I'll update the HTML and Game Loop to implement this clean workflow!
