class KinectAgent extends Vehicle {
  constructor(x, y, brain) {
    super(x, y);
    this.color = color(random(100, 255), random(100, 255), random(100, 255), 150);
    this.maxSpeed = 8;
    this.maxForce = 2.0; // Increased so avoidance force can actually push the raft clear
    this.r = 12;

    this.isDead = false;
    this.fitness = 0;
    this.distanceCovered = 0;
    this.timeAlive = 0;
    this.zActionCount = 0; // jumps + ducks performed this run, used as a fitness penalty

    this.sensors = new Sensor(this, 5, 300);

    // Neural Network (tf.js wrapped by ml5)
    if (brain) {
      this.brain = brain;
    } else {
      this.brain = ml5.tf.sequential();
      // Use global topology variables from ui.js
      let hLayers = typeof topHiddenLayers !== 'undefined' ? topHiddenLayers : 1;
      let nPerLayer = typeof topNeurons !== 'undefined' ? topNeurons : 8;
      let actFunc = typeof topActivation !== 'undefined' ? topActivation : 'relu';

      // First hidden layer (connects to 10 inputs)
      this.brain.add(ml5.tf.layers.dense({ units: nPerLayer, inputShape: [10], activation: actFunc }));

      // Additional hidden layers
      for (let i = 1; i < hLayers; i++) {
        this.brain.add(ml5.tf.layers.dense({ units: nPerLayer, activation: actFunc }));
      }

      // 3 outputs (w_seek, w_avoid, z_action). We tried adding a separation
      // weight but it was noise: agents share a canvas only visually, they
      // don't actually flock, so it just disrupted training.
      this.brain.add(ml5.tf.layers.dense({ units: 3, activation: 'sigmoid' }));
    }

    // CORE ARCHITECTURE: 
    // The agent uses standard steering behaviors from Craig Reynolds.
    // The Neural Network does NOT calculate forces directly.
    // Instead, the Neural Network outputs the "weights" of these standard behaviors!

    this.behaviorManager.addBehavior('seekForward', (v) => {
      // Steer towards a point far ahead to keep moving up the river
      return v.seek(createVector(v.pos.x, v.pos.y - 200));
    }, 1.0);

    this.behaviorManager.addBehavior('avoidObstacle', (v, ctx) => {
      // Skip obstacles we're currently passing safely via z-state
      // (the brain already committed to jumping/ducking; don't shove us sideways too)
      let dangerous = ctx.obstacles.filter(obs => {
        if (obs.type === 'LOW' && v.zState === 'JUMPING') return false;
        if (obs.type === 'HIGH' && v.zState === 'DUCKING') return false;
        return true;
      });
      return v.avoid(dangerous);
    }, 1.0);
  }

  think(context, isBest) {
    if (this.isDead) return;

    // Optimization: Agents only run their neural network every 3 frames (~20 times/sec).
    // This dramatically improves browser performance without noticeably hurting AI reaction time.
    if (frameCount % 3 !== 0) return;

    let readings = this.sensors.read(context.obstacles, isBest);
    let inputs = [
      readings[0].distance,
      readings[1].distance,
      readings[2].distance,
      readings[3].distance,
      readings[4].distance,
      // We MUST feed the type of obstacle to the brain so it knows whether to jump or duck!
      readings[0].typeId / 3.0, // Normalize to 0-1 (0=None, 1=Rock, 2=Log, 3=Wall)
      readings[1].typeId / 3.0,
      readings[2].typeId / 3.0,
      readings[3].typeId / 3.0,
      readings[4].typeId / 3.0
    ];

    ml5.tf.tidy(() => {
      let xs = ml5.tf.tensor2d([inputs]);
      let ys = this.brain.predict(xs);
      let results = ys.dataSync(); // 3 values in [0,1] (sigmoid)

      let w_seek = results[0];
      let w_avoid = results[1];
      // TEMP TEST: force z-action neutral so jump/duck never trigger.
      // If avoid is wired up correctly, agents should still survive (briefly)
      // by dodging sideways. If they freeze and instantly die, avoid is broken.
      //let z_action = 0.5;
      let z_action = results[2];

      // Update the weights of the standard steering behaviors dynamically.
      // Multipliers are kept in the same range so the brain (not us) decides priority.
      this.behaviorManager.setWeight('seekForward', w_seek * 1.5);
      this.behaviorManager.setWeight('avoidObstacle', w_avoid * 3.0);

      // Jump/Duck logic:
      // Since output is 0 to 1:
      // < 0.3 = Duck, > 0.7 = Jump
      if (z_action > 0.7 && this.zState === 'NORMAL') {
        this.zState = 'JUMPING';
        this.zStateTimer = 40;
        this.zActionCount++;
        if (isBest && typeof playJumpSound === 'function') playJumpSound();
      } else if (z_action < 0.3 && this.zState === 'NORMAL') {
        this.zState = 'DUCKING';
        this.zStateTimer = 40;
        this.zActionCount++;
        if (isBest && typeof playDuckSound === 'function') playDuckSound();
      }
    });
  }

  updateAgent(context, isBest) {
    if (this.isDead) return;

    this.timeAlive++;
    this.distanceCovered += scrollSpeed;

    // Neural Net thinks and adjusts the weights
    this.think(context, isBest);

    // BehaviorManager calculates final force using the new NN weights
    let steering = this.behaviorManager.calculate(context);
    this.applyForce(steering);
    this.update();

    // Instead of locking Y strictly to height - 100, we clamp it.
    // This allows the agent's 'seekForward' behavior to actually accelerate them up the river!
    // We restrict them from going off-screen or too far back.
    if (this.pos.y > height - 50) this.pos.y = height - 50;
    if (this.pos.y < height / 2) this.pos.y = height / 2;

    this.vel.x *= 0.95;
    this.vel.y *= 0.95;

    // Check death collision
    for (let obs of context.obstacles) {
      if (checkCollision(this, obs)) {
        this.isDead = true;
        break;
      }
    }
  }

  showAgent(isBest) {
    // Dead agents always disappear to keep the screen clean
    if (this.isDead) return;

    // Visual Ghosting Trick
    let oldColor = this.color;
    if (GAME_MODE === 'COMPETITION') {
      // In competition: keep everyone fully visible with their distinct color
    } else if (isBest) {
      this.color = color(255, 215, 0); // Bright Gold for champion
    } else {
      // Ghost others during training
      this.color = color(oldColor.levels[0], oldColor.levels[1], oldColor.levels[2], 30);
    }

    this.show();
    this.color = oldColor; // restore

    // Draw name tag above the raft in Competition mode
    if (GAME_MODE === 'COMPETITION' && this.name) {
      push();
      fill(0, 0, 0, 150);
      noStroke();
      let tw = textWidth(this.name) + 10;
      rect(this.pos.x - tw/2, this.pos.y - 35, tw, 16, 4);
      fill(this.color);
      textSize(10);
      textAlign(CENTER, CENTER);
      text(this.name, this.pos.x, this.pos.y - 27);
      pop();
    }
  }
}
