# Phase 7: Brain Storage & Competition Mode

This phase introduces the ability to download your smartest AI brains to your computer as `.json` files, and then upload them later to race them against each other in a special "Competition Mode."

## Proposed Changes

### 1. `brainStorage.js` [NEW]
- Create a new script to handle the saving and loading of TensorFlow.js models.
- **Save:** A function that extracts the weights from the current "Champion" (the yellow raft) and downloads them as a `.json` file. The file will include metadata like Generation, Fitness, and Circuit Difficulty.
- **Load:** A function that reads uploaded `.json` files and reconstructs a Neural Network with those exact weights.

### 2. UI Updates (`index.html` & `ui.js`)
- Add a **"Download Champion Brain"** button to the AI Controls panel.
- Add an **"Upload Brains"** file input (allowing multiple file selection).
- Add a **"Start Competition"** button.

### 3. Competition Mode (`sketch.js` & `population.js`)
- Add `GAME_MODE = 'COMPETITION'` alongside `TRAINING` and `PLAY`.
- In Competition mode, the Genetic Algorithm (mutation and crossover) is completely disabled. The simulation will run using *only* the specific brains you uploaded.
- Add a live Leaderboard to the HUD showing the uploaded brains and who is currently in the lead.

## User Review Required

> [!IMPORTANT]  
> If you upload 3 brains for a competition, should the game automatically fill the remaining 17 spots with random "dummy" agents, or should the race *strictly* contain only the 3 brains you uploaded?
> 
> **Recommendation:** We should only race the brains you explicitly upload. It makes the leaderboard cleaner and it is much more fun to watch your specific champions battle it out without random noise.

Please approve this plan or let me know if you want to change how Competition Mode works!
