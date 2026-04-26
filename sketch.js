let player;
let obstacles = [];
let scrollSpeed = 5;

// Mode Toggle: 'IDLE', 'TRAINING' (AI only), 'PLAY' (Webcam), or 'COMPETITION'
let GAME_MODE = 'IDLE';

// ML5 Variables
let video;
let poseNet;
let poses = [];
let poseJumpTriggered = false;
let poseDuckTriggered = false;

// AI Population
let population;
let POP_SIZE = 20;

// Assets
let imgWater;
let bgY = 0;

// Sound Engine
let osc, noise, env;

function preload() {
  imgWater = loadImage('assets/water.png');
}

function setup() {
  let canvas = createCanvas(800, 600);
  canvas.parent('canvas-container');

  // Performance Optimization: Use CPU for small neural networks
  // This reduces latency by avoiding GPU memory transfer overhead.
  if (typeof ml5 !== 'undefined' && ml5.tf) {
    ml5.tf.setBackend('cpu').then(() => {
      console.log("TensorFlow Backend set to: " + ml5.tf.getBackend());
    });
  }

  circuitManager = new CircuitManager();
  circuitManager.setDifficulty(currentDifficulty);
  circuitManager.curriculumLearning = curriculumLearning;

  // Initialize UI controls
  setupUI();
}

function resetSimulation() {
  obstacles = [];
  // Recreate initial river walls
  for (let y = 0; y < height + 100; y += 100) {
    obstacles.push(new Obstacle(50, y, 100, 100, 'WALL'));
    obstacles.push(new Obstacle(width - 50, y, 100, 100, 'WALL'));
  }

  if (GAME_MODE === 'COMPETITION') {
    // Fix the procedural generation seed so it's a fair race!
    randomSeed(998);

    population = new Population(loadedBrains.length);
    population.agents = [];

    // Dummy network shapes are no longer needed globally here, 
    // because each brain might have a DIFFERENT topology!
    // We will compute shapes dynamically per-brain inside the loop.

    for (let i = 0; i < loadedBrains.length; i++) {
      let bData = loadedBrains[i].data;

      let meta = bData.metadata;
      let hLayers = meta.topology ? meta.topology.hiddenLayers : 1;
      let nPerLayer = meta.topology ? meta.topology.neuronsPerLayer : 8;
      let act = meta.topology ? meta.topology.activation : 'relu';

      let brain = ml5.tf.sequential();
      brain.add(ml5.tf.layers.dense({ units: nPerLayer, inputShape: [10], activation: act }));
      for (let k = 1; k < hLayers; k++) {
        brain.add(ml5.tf.layers.dense({ units: nPerLayer, activation: act }));
      }
      brain.add(ml5.tf.layers.dense({ units: 3, activation: 'sigmoid' }));

      // Rebuild shape map based on dynamic topology
      let shapes = brain.getWeights().map(w => w.shape);

      let tensors = [];
      ml5.tf.tidy(() => {
        for (let j = 0; j < bData.weights.length; j++) {
          tensors.push(ml5.tf.tensor(bData.weights[j], shapes[j]));
        }
        brain.setWeights(tensors);
      });

      let agent = new KinectAgent(width / 2 + random(-40, 40), height - 100 + random(-20, 20), brain);

      // Give each uploaded brain a distinct name and color so we can tell them apart!
      agent.name = loadedBrains[i].filename.replace('.json', '');

      colorMode(HSB, 360, 100, 100);
      agent.color = color((i * 137.5) % 360, 80, 100);
      colorMode(RGB, 255);

      population.agents.push(agent);
    }

  } else if (GAME_MODE === 'TRAINING') {
    // Normal Training Mode
    // Randomize the seed so every run is unique
    randomSeed(Date.now() % 100000);

    POP_SIZE = currentPopSize;
    population = new Population(POP_SIZE);
  } else if (GAME_MODE === 'PLAY') {
    randomSeed(Date.now() % 100000);

    // Initialize Webcam if it hasn't been yet
    if (!video) {
      video = createCapture(VIDEO);
      video.size(320, 240);
      video.hide();
      poseNet = ml5.poseNet(video, modelReady);
      poseNet.on('pose', function (results) {
        poses = results;
      });
    }

    player = new Vehicle(width / 2, height - 100);
    player.color = "cyan";
    player.maxSpeed = 8;
  }

  if (circuitManager) {
    circuitManager.spawnTimer = 0;
    circuitManager.wallTimer = 0;
    circuitManager.wallToWallCooldown = 0;
  }
  frameCount = 0;
}

function modelReady() {
  // Setup Sound Engine
  osc = new p5.Oscillator('sine');
  noise = new p5.Noise('brown');
  env = new p5.Envelope();
  env.setADSR(0.01, 0.1, 0.1, 0.1);
  env.setRange(0.5, 0);

  console.log("PoseNet is Ready!");
}

function playJumpSound() {
  if (GAME_MODE === 'TRAINING' && trainingCyclesPerFrame > 1) return;
  if (osc) {
    osc.setType('sine');
    osc.start();
    osc.freq(400);
    osc.freq(800, 0.1);
    if (env) env.play(osc);
    setTimeout(() => { if (osc) osc.stop(); }, 200);
  }
}

function playDuckSound() {
  if (GAME_MODE === 'TRAINING' && trainingCyclesPerFrame > 1) return;
  if (osc) {
    osc.setType('triangle');
    osc.start();
    osc.freq(300);
    osc.freq(100, 0.1);
    if (env) env.play(osc);
    setTimeout(() => { if (osc) osc.stop(); }, 200);
  }
}

function playCrashSound() {
  if (GAME_MODE === 'TRAINING' && trainingCyclesPerFrame > 1) return;
  noise.start();
  env.play(noise);
  setTimeout(() => noise.stop(), 300);
}

let shakeAmount = 0;

function draw() {
  // Handle Screen Shake
  if (shakeAmount > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.9;
    if (shakeAmount < 0.1) shakeAmount = 0;
  }

  // Draw Scrolling Water Background
  drawBackground();

  if (GAME_MODE === 'IDLE') {
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("KINECT ADVENTURES", width / 2, height / 2 - 40);
    textSize(16);
    text("Select a mode above to start", width / 2, height / 2 + 10);
    textAlign(LEFT, BASELINE);
    return;
  }

  // Toggle debug view with Shift key
  Vehicle.debug = keyIsDown(SHIFT);

  // In TRAINING mode, run multiple simulation cycles per rendered frame.
  // Only the final cycle renders, so the user still sees a smooth scene.
  let cycles = (GAME_MODE === 'TRAINING') ? trainingCyclesPerFrame : 1;
  for (let n = 0; n < cycles; n++) {
    let render = (n === cycles - 1);
    simulationTick(render);
  }

  if (GAME_MODE === 'PLAY') {
    // Handle Controls (Keyboard + Webcam)
    processKeyboardControls();
    processPoseControls();

    player.update();
    player.pos.y = height - 100;
    player.vel.x *= 0.9;
    player.vel.y *= 0.9;
    player.show();
    drawWebcam();
  }

  // Draw HUD
  drawHUD();
}

// One unit of physics. When `render` is false, no draw calls are made —
// used to "fast-forward" training without paying for rendering.
function simulationTick(render) {
  // Frozen competition: show final results overlay
  let frozen = (GAME_MODE === 'COMPETITION' && population && population.competitionFinished);
  if (frozen) {
    if (render) {
      // Dark overlay
      fill(0, 200);
      rect(0, 0, width, height);

      // Title
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(28);
      text("🏁 RACE FINISHED 🏁", width / 2, 40);

      // Leaderboard sorted by distance
      let sorted = [...population.agents].sort((a, b) => b.distanceCovered - a.distanceCovered);
      textSize(16);
      textAlign(LEFT, CENTER);
      for (let i = 0; i < sorted.length; i++) {
        let y = 90 + i * 35;
        // Color swatch
        fill(sorted[i].color);
        noStroke();
        rect(width/2 - 180, y - 8, 20, 20, 4);
        // Name + distance
        fill(255);
        let medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
        text(`${medal}  ${sorted[i].name || 'Agent'}  —  ${Math.floor(sorted[i].distanceCovered)}px`, width/2 - 150, y);
      }

      // Rerun button
      textAlign(CENTER, CENTER);
      textSize(20);
      fill(40, 160, 40);
      rect(width/2 - 80, height - 80, 160, 45, 8);
      fill(255);
      text("RERUN RACE", width/2, height - 58);
    }
    return;
  }

  // Live competition: draw color legend on the left
  if (GAME_MODE === 'COMPETITION' && population && render) {
    push();
    textSize(11);
    textAlign(LEFT, CENTER);
    noStroke();
    for (let i = 0; i < population.agents.length; i++) {
      let a = population.agents[i];
      let y = 15 + i * 22;
      fill(a.color);
      rect(8, y - 6, 14, 14, 3);
      fill(a.isDead ? 100 : 255);
      text((a.name || 'Agent') + (a.isDead ? ' ✗' : ''), 28, y);
    }
    pop();
  }

  circuitManager.update(obstacles, getBestTimeAlive());

  let crashed = false;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.speed = scrollSpeed;
    obs.update();
    if (render) obs.show();

    if (GAME_MODE === 'PLAY' && player) {
      if (checkCollision(player, obs)) crashed = true;
    }

    if (obs.pos.y > height + 100) obstacles.splice(i, 1);
  }

  if (render && crashed) {
    shakeAmount = 10;
    fill(255, 0, 0, 100);
    rect(0, 0, width, height);
  }

  if (GAME_MODE === 'TRAINING' || GAME_MODE === 'COMPETITION') {
    if (population) {
      let context = { obstacles: obstacles, agents: population.agents };
      population.update(context, render);
    }
  }
}

function processKeyboardControls() {
  // Keyboard fallback
  if (keyIsDown(LEFT_ARROW)) {
    player.applyForce(createVector(-0.8, 0));
  }
  if (keyIsDown(RIGHT_ARROW)) {
    player.applyForce(createVector(0.8, 0));
  }
}

function processPoseControls() {
  if (poses.length > 0) {
    let pose = poses[0].pose;

    // 1. LEANING (Steering)
    // Calculate midpoint between shoulders
    if (pose.leftShoulder && pose.rightShoulder) {
      let shoulderMidX = (pose.leftShoulder.x + pose.rightShoulder.x) / 2;
      // In mirrored video: camera left is physical right.
      if (shoulderMidX < 140) {
        player.applyForce(createVector(1.0, 0)); // Steer Right
      } else if (shoulderMidX > 180) {
        player.applyForce(createVector(-1.0, 0)); // Steer Left
      }
    }

    // 2. JUMPING (Both wrists above shoulders)
    if (pose.leftWrist && pose.rightWrist && pose.leftShoulder && pose.rightShoulder) {
      if (pose.leftWrist.y < pose.leftShoulder.y && pose.rightWrist.y < pose.rightShoulder.y) {
        if (!poseJumpTriggered) {
          if (player.zState === 'NORMAL') {
            player.zState = 'JUMPING';
            player.zStateTimer = 60;
            if (typeof playJumpSound === 'function') playJumpSound();
          }
          poseJumpTriggered = true;
        }
      } else {
        poseJumpTriggered = false; // Reset when hands go down
      }
    }

    // 3. DUCKING (Nose drops below a certain threshold)
    if (pose.nose) {
      // 150 is roughly middle-bottom of a 240px tall video. Needs squatting.
      if (pose.nose.y > 150) {
        if (!poseDuckTriggered) {
          if (player.zState === 'NORMAL') {
            player.zState = 'DUCKING';
            player.zStateTimer = 60;
            if (typeof playDuckSound === 'function') playDuckSound();
          }
          poseDuckTriggered = true;
        }
      } else {
        poseDuckTriggered = false; // Reset when standing up
      }
    }
  }
}

function drawWebcam() {
  push();
  // Position PiP in the top right corner
  translate(width - 320, 0);

  // Draw background frame for webcam
  fill(0);
  rect(0, 0, 320, 240);

  // Flip the video horizontally for a mirror effect
  translate(320, 0);
  scale(-1, 1);

  // Draw the video and the PoseNet keypoints
  if (video) {
    image(video, 0, 0, 320, 240);
  }

  if (poses.length > 0) {
    let pose = poses[0].pose;
    for (let i = 0; i < pose.keypoints.length; i++) {
      let keypoint = pose.keypoints[i];
      if (keypoint.score > 0.2) {
        fill(0, 255, 0);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 8, 8);
      }
    }

    // Draw skeleton lines
    stroke(255, 255, 0);
    strokeWeight(2);
    for (let i = 0; i < poses[0].skeleton.length; i++) {
      let a = poses[0].skeleton[i][0];
      let b = poses[0].skeleton[i][1];
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
  }
  pop();
}

function keyPressed() {
  // Guard: Keyboard controls only apply to the active player in PLAY mode
  if (!player || GAME_MODE !== 'PLAY') return;

  // Keyboard Z-Axis fallbacks
  if (keyCode === UP_ARROW && player.zState === 'NORMAL') {
    player.zState = 'JUMPING';
    player.zStateTimer = 60; // 1 second jump duration
  } else if (keyCode === DOWN_ARROW && player.zState === 'NORMAL') {
    player.zState = 'DUCKING';
    player.zStateTimer = 60; // 1 second duck duration
  }
}

function drawHUD() {
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);

  if (GAME_MODE === 'TRAINING') {
    text("AI Training Mode", 10, 10);
    text("Generation: " + population.generation, 10, 30);

    // Calculate current generation's best distance
    let currentBestDist = 0;
    let aliveCount = 0;
    for (let a of population.agents) {
      if (!a.isDead) aliveCount++;
      if (a.distanceCovered > currentBestDist) currentBestDist = a.distanceCovered;
    }

    fill(255, 215, 0); // Gold for the bests
    text("Current Best Dist: " + Math.floor(currentBestDist) + " px", 10, 50);
    text("All-time Best Dist: " + Math.floor(population.allTimeBestFitness) + " px", 10, 70);

    fill(255);
    text("Vehicles Alive: " + aliveCount + " / " + population.agents.length, 10, 100);
    text("Difficulty: " + circuitManager.difficulty, 10, 120);

    text("(Training stops at " + (typeof trainingTargetDistance !== 'undefined' ? trainingTargetDistance : 2000) + "px)", 10, 150);
  } else if (GAME_MODE === 'COMPETITION') {
    let finished = (population && population.competitionFinished);
    if (finished) {
      fill(255, 215, 0);
      text("RACE FINISHED — Final Leaderboard", 10, 10);
      fill(255);
    } else {
      text("Competition Mode!", 10, 10);
    }
    text("Circuit: " + circuitManager.difficulty, 10, 30);
    text("Racing Brains: " + population.agents.length, 10, 50);

    text("Leaderboard:", 10, 80);
    // Sort a copy of agents by distance
    let sortedAgents = [...population.agents].sort((a, b) => b.distanceCovered - a.distanceCovered);
    for (let i = 0; i < sortedAgents.length; i++) {
      fill(sortedAgents[i].color);
      // Show the file name on the leaderboard!
      text(`#${i + 1} ${sortedAgents[i].name} : ${Math.floor(sortedAgents[i].distanceCovered)}`, 10, 100 + (i * 20));
    }
  } else {
    text("Player vs AI", 10, 10);
    if (population) {
      text("Gen: " + population.generation, 10, 30);

      let currentBestDist = 0;
      for (let a of population.agents) {
        if (a.distanceCovered > currentBestDist) currentBestDist = a.distanceCovered;
      }
      text("AI Best Dist: " + Math.floor(currentBestDist) + " px", 10, 50);
    }

    text("Webcam Controls:", 10, 80);
    text("- LEAN Left/Right to Steer", 10, 100);
    text("- RAISE BOTH HANDS to Jump", 10, 120);
    text("- SQUAT DOWN to Duck", 10, 140);

    if (poses.length === 0) {
      fill(255, 255, 0);
      text("Loading Webcam & PoseNet...", 10, 170);
    } else {
      fill(0, 255, 0);
      text("Webcam Active!", 10, 170);
    }
  }
}

function drawBackground() {
  if (imgWater) {
    // Scroll the water image you liked
    bgY += scrollSpeed * 0.5;
    if (bgY >= imgWater.height) bgY = 0;

    for (let x = 0; x < width; x += imgWater.width) {
      for (let y = bgY - imgWater.height; y < height; y += imgWater.height) {
        image(imgWater, x, y);
      }
    }
  } else {
    background(20, 45, 90);
  }
}

function checkCollision(v, obs) {
  let testX = v.pos.x;
  let testY = v.pos.y;

  if (v.pos.x < obs.pos.x - obs.w / 2) testX = obs.pos.x - obs.w / 2;
  else if (v.pos.x > obs.pos.x + obs.w / 2) testX = obs.pos.x + obs.w / 2;

  if (v.pos.y < obs.pos.y - obs.h / 2) testY = obs.pos.y - obs.h / 2;
  else if (v.pos.y > obs.pos.y + obs.h / 2) testY = obs.pos.y + obs.h / 2;

  let distX = v.pos.x - testX;
  let distY = v.pos.y - testY;
  let distance = sqrt((distX * distX) + (distY * distY));

  if (distance <= v.r) {
    if (obs.type === 'LOW' && v.zState === 'JUMPING') return false;
    if (obs.type === 'HIGH' && v.zState === 'DUCKING') return false;
    return true;
  }
  return false;
}

function getBestTimeAlive() {
  let best = 0;
  if (population && population.agents) {
    for (let a of population.agents) {
      if (!a.isDead && a.timeAlive > best) {
        best = a.timeAlive;
      }
    }
  }
  return best;
}

function mousePressed() {
  // Handle "RERUN RACE" button click on the canvas
  if (GAME_MODE === 'COMPETITION' && population && population.competitionFinished) {
    // Check if click is inside the rerun button area (centered, near bottom)
    let canvas = document.querySelector('canvas');
    if (canvas) {
      let rect = canvas.getBoundingClientRect();
      let cx = mouseX;
      let cy = mouseY;
      // Button is at: x = width/2 - 80, y = height - 80, w = 160, h = 45
      if (cx > width/2 - 80 && cx < width/2 + 80 && cy > height - 80 && cy < height - 35) {
        // Dispose old brains
        population.agents.forEach(a => { if (a.brain) a.brain.dispose(); });
        population.competitionFinished = false;
        resetSimulation();
      }
    }
  }
}
