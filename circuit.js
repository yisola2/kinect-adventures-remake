class CircuitManager {
  constructor() {
    this.difficulty = 'MEDIUM'; // EASY, MEDIUM, HARD, KILLER
    this.spawnTimer = 0;
    this.wallTimer = 0;
    // Minimum scroll-frames between two wall-to-wall obstacles, so the agent
    // (zStateTimer=40) and the player (zStateTimer=60) have time to land,
    // return to NORMAL, and commit to a new jump/duck. 60 frames * scrollSpeed=5 = 300 px gap.
    this.wallToWallCooldown = 0;
    this.W2W_MIN_COOLDOWN = 60;
    this.curriculumLearning = false;
  }

  setDifficulty(level) {
    this.difficulty = level;
  }

  update(obstacles, currentBestTime) {
    // 1. Curriculum learning: auto increase difficulty based on best survival time
    if (this.curriculumLearning) {
      if (currentBestTime > 1200 && this.difficulty === 'EASY') { // 20 seconds at 60fps
         this.difficulty = 'MEDIUM';
         this.updateUI();
      } else if (currentBestTime > 2400 && this.difficulty === 'MEDIUM') { // 40 seconds
         this.difficulty = 'HARD';
         this.updateUI();
      } else if (currentBestTime > 3600 && this.difficulty === 'HARD') { // 60 seconds
         this.difficulty = 'KILLER';
         this.updateUI();
      }
    }

    // 2. Procedural River Walls — tied to a counter (not frameCount)
    // so they keep up when training speed > 1x
    this.wallTimer++;
    if (this.wallTimer >= 20) {
      this.wallTimer = 0;
      obstacles.push(new Obstacle(50, -100, 100, 100, 'WALL'));
      obstacles.push(new Obstacle(width - 50, -100, 100, 100, 'WALL'));
    }

    // 3. Procedural Obstacles based on Difficulty
    this.spawnTimer++;
    if (this.wallToWallCooldown > 0) this.wallToWallCooldown--;

    let spawnInterval = 80;
    let rockSizeMin = 60;
    let rockSizeMax = 90;
    let logSizeMin = 180;
    let logSizeMax = 350;
    let wallToWallChance = 0.05;

    if (this.difficulty === 'EASY') {
      spawnInterval = 130;
      rockSizeMax = 70;
      logSizeMax = 220;
      wallToWallChance = 0.05;
    } else if (this.difficulty === 'MEDIUM') {
      spawnInterval = 90;
      wallToWallChance = 0.15;
    } else if (this.difficulty === 'HARD') {
      spawnInterval = 70;
      rockSizeMin = 70;
      rockSizeMax = 100;
      logSizeMin = 250;
      logSizeMax = 400;
      wallToWallChance = 0.3;
    } else if (this.difficulty === 'KILLER') {
      spawnInterval = 50;
      rockSizeMin = 80;
      rockSizeMax = 120;
      logSizeMin = 350;
      logSizeMax = 500;
      wallToWallChance = 0.5;
    }

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      let type = random() > 0.5 ? 'LOW' : 'HIGH';
      
      // Determine probability of a Wall-to-Wall obstacle based on difficulty
      let wallToWallChance = 0.1;
      if (this.difficulty === 'MEDIUM') wallToWallChance = 0.3;
      if (this.difficulty === 'HARD') wallToWallChance = 0.5;
      if (this.difficulty === 'KILLER') wallToWallChance = 0.7;
      
      let isWallToWall = random() < wallToWallChance;

      // Respect z-state recovery: never spawn two wall-to-wall obstacles
      // closer together than W2W_MIN_COOLDOWN scroll-frames. If the cooldown
      // is still active, downgrade this one to a regular dodgeable obstacle.
      if (isWallToWall && this.wallToWallCooldown > 0) {
        isWallToWall = false;
      }

      let w, h, x;
      if (isWallToWall) {
        // Spans the entire playable river width (canvas width - river banks)
        w = width - 100;
        h = type === 'HIGH' ? 40 : 80;
        x = width / 2; // Centered
        this.wallToWallCooldown = this.W2W_MIN_COOLDOWN;
      } else {
        w = type === 'HIGH' ? random(logSizeMin, logSizeMax) : random(rockSizeMin, rockSizeMax);
        h = type === 'HIGH' ? 40 : w;
        // TRAINING: bias spawns near the canvas center so a frozen agent is
        // hit by every small obstacle and is forced to dodge or pay the
        // z-action cost. COMPETITION/PLAY keep the original wide spread for
        // fairness (everyone sees the same circuit) and player-friendliness.
        let isTraining = (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'TRAINING');
        if (isTraining) {
          x = width / 2 + random(-80, 80);
        } else {
          x = random(150, width - 150);
        }
      }

      obstacles.push(new Obstacle(x, -50, w, h, type));
    }
  }

  updateUI() {
    let uiSelect = document.getElementById('difficultySelect');
    if (uiSelect && uiSelect.value !== this.difficulty) {
       uiSelect.value = this.difficulty;
    }
  }
}
