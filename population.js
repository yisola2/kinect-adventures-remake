// Penalty per jump/duck activation. Pushes the brain to reserve z-actions
// for unavoidable obstacles (wall-to-wall) instead of using them on anything.
// Tune up if agents still freeze and z-action everything; down if they refuse
// to z-action even when they should.
const Z_ACTION_COST = 50;

class Population {
  constructor(size) {
    this.size = size;
    this.agents = [];
    this.generation = 1;
    this.bestFitness = 0;

    this.allTimeBestFitness = 0;
    this.allTimeBestBrainData = null;
    this.competitionFinished = false; // freezes the scene once all brains die in COMPETITION

    for (let i = 0; i < this.size; i++) {
      this.agents.push(new KinectAgent(width / 2 + random(-20, 20), height - 100 + random(-10, 10)));
    }
  }

  update(context, render = true) {
    let allDead = true;
    for (let i = 0; i < this.agents.length; i++) {
      let agent = this.agents[i];
      let isBest = (i === 0 && GAME_MODE === 'TRAINING'); // Only ghost in Training mode

      agent.updateAgent(context, isBest);
      if (render) agent.showAgent(isBest);
      if (!agent.isDead) {
        allDead = false;
      }
    }

    if (allDead) {
      // Competition is a single race — freeze instead of restarting.
      if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'COMPETITION') {
        if (!this.competitionFinished) {
          this.competitionFinished = true;
          let sorted = [...this.agents].sort((a, b) => b.distanceCovered - a.distanceCovered);
          console.log("Competition finished! Final standings:");
          sorted.forEach((a, i) => console.log(`  #${i + 1} ${a.name || 'unnamed'} — ${Math.floor(a.distanceCovered)}px`));
        }
      } else {
        this.nextGeneration();
      }
    } else if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'TRAINING') {
      // 60% Stop Condition Check (threshold is user-configurable in the UI)
      let target = (typeof trainingTargetDistance !== 'undefined') ? trainingTargetDistance : 2000;
      let finishedAgents = this.agents.filter(a => a.distanceCovered >= target).length;
      if (finishedAgents / this.agents.length >= 0.6) {
        console.log(`60% of population reached ${target}px. Training Complete!`);
        GAME_MODE = 'IDLE';
        if (typeof saveBestBrain === 'function') saveBestBrain();
        alert(`Training Complete! 60% of agents reached ${target}px. The Best Brain has been automatically downloaded.`);
        // Dispose memory
        this.agents.forEach(agent => {
          if (agent.brain) agent.brain.dispose();
        });
        this.agents = [];
        return;
      }
    }
  }

  calculateFitness() {
    this.bestFitness = 0; // Reset per generation
    let sum = 0;
    // Calculate raw fitness
    for (let agent of this.agents) {
      // Waypoint bonus: 100 points for every 2000 pixels covered
      let waypointsReached = Math.floor(agent.distanceCovered / 2000);

      // Fixed Fitness Formula: Distance + Speed Bonus + Waypoints − z-action cost.
      // The z-action term discourages agents from jumping/ducking everything;
      // they should reserve it for obstacles they can't dodge sideways.
      let speedBonus = (agent.distanceCovered / (agent.timeAlive + 1)) * 50;
      let zActionPenalty = (agent.zActionCount || 0) * Z_ACTION_COST;
      agent.fitness = agent.distanceCovered * 1.0
        + speedBonus
        + (waypointsReached * 100)
        - zActionPenalty;

      // Clamp fitness to prevent negative tournament/roulette weirdness
      agent.fitness = Math.max(0.1, agent.fitness);

      // Exponential Fitness Trick: Square the fitness so the absolute best agents
      // have a massively higher chance of being picked than average agents
      agent.fitness = Math.pow(agent.fitness, 2);

      if (agent.fitness > this.bestFitness) {
        this.bestFitness = agent.fitness;
      }
      sum += agent.fitness;
    }

    // Normalize fitness (0 to 1)
    if (sum > 0) {
      for (let agent of this.agents) {
        agent.fitness /= sum;
      }
    }
  }

  nextGeneration() {
    if (typeof circuitManager !== 'undefined') {
      circuitManager.spawnTimer = 0;
      circuitManager.wallTimer = 0;
      circuitManager.wallToWallCooldown = 0;
    }
    this.calculateFitness();

    // Sort descending by fitness
    this.agents.sort((a, b) => b.fitness - a.fitness);

    // Check if we have a new all-time champion before destroying the brains!
    let genBest = this.agents[0];
    if (genBest.distanceCovered > this.allTimeBestFitness) {
      this.allTimeBestFitness = genBest.distanceCovered;

      let weights = genBest.brain.getWeights();
      let weightData = weights.map(w => Array.from(w.dataSync()));

      this.allTimeBestBrainData = {
        metadata: {
          generation: this.generation,
          fitness: Math.floor(genBest.distanceCovered),
          distance: Math.floor(genBest.distanceCovered),
          timeAlive: genBest.timeAlive,
          date: new Date().toLocaleString(),
          difficulty: typeof circuitManager !== 'undefined' ? circuitManager.difficulty : 'UNKNOWN',
          color: genBest.color.levels,
          topology: {
            hiddenLayers: typeof topHiddenLayers !== 'undefined' ? topHiddenLayers : 1,
            neuronsPerLayer: typeof topNeurons !== 'undefined' ? topNeurons : 8,
            activation: typeof topActivation !== 'undefined' ? topActivation : 'relu'
          }
        },
        weights: weightData
      };
      console.log(`New ALL-TIME BEST found in Gen ${this.generation}! Distance: ${this.allTimeBestFitness}`);
    }

    console.log(`Generation ${this.generation} completed. Best fitness: ${this.bestFitness}`);

    // (Competition no longer restarts here — update() handles it by setting
    // competitionFinished=true so the scene freezes at final leaderboard.)

    let newAgents = [];

    // Elitism: Keep the best agent identical
    let bestBrain = this.cloneBrain(this.agents[0].brain);
    let bestAgent = new KinectAgent(width / 2 + random(-20, 20), height - 100 + random(-10, 10), bestBrain);
    bestAgent.color = color(255, 255, 0); // Yellow to identify the champion
    newAgents.push(bestAgent);

    // Crossover and Mutate for the rest
    for (let i = 1; i < this.size; i++) {
      let parentA = this.selectParent();
      let parentB = this.selectParent();
      let childBrain = this.crossover(parentA.brain, parentB.brain);
      this.mutate(childBrain);
      newAgents.push(new KinectAgent(width / 2 + random(-20, 20), height - 100 + random(-10, 10), childBrain));
    }

    // Dispose old brains from memory
    for (let agent of this.agents) {
      agent.brain.dispose();
    }

    this.agents = newAgents;
    this.generation++;

    // Reset the game environment for the new generation
    obstacles = [];
    for (let y = 0; y < height + 100; y += 100) {
      obstacles.push(new Obstacle(50, y, 100, 100, 'WALL'));
      obstacles.push(new Obstacle(width - 50, y, 100, 100, 'WALL'));
    }
    frameCount = 0; // Reset frameCount to synchronize obstacle spawning
  }

  selectParent() {
    // Tournament selection: pick K random candidates, keep the fittest.
    // More robust than roulette wheel — doesn't collapse diversity when one
    // agent dominates the fitness distribution.
    const TOURNAMENT_SIZE = 5;
    let best = null;
    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
      let candidate = this.agents[Math.floor(random(this.agents.length))];
      if (best === null || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best;
  }

  cloneBrain(brain) {
    let newBrain = ml5.tf.sequential();
    let hLayers = typeof topHiddenLayers !== 'undefined' ? topHiddenLayers : 1;
    let nPerLayer = typeof topNeurons !== 'undefined' ? topNeurons : 8;
    let actFunc = typeof topActivation !== 'undefined' ? topActivation : 'relu';

    newBrain.add(ml5.tf.layers.dense({ units: nPerLayer, inputShape: [10], activation: actFunc }));
    for (let i = 1; i < hLayers; i++) {
      newBrain.add(ml5.tf.layers.dense({ units: nPerLayer, activation: actFunc }));
    }
    newBrain.add(ml5.tf.layers.dense({ units: 3, activation: 'sigmoid' }));
    ml5.tf.tidy(() => {
      let weights = brain.getWeights();
      let clonedWeights = weights.map(w => w.clone());
      newBrain.setWeights(clonedWeights);
    });
    return newBrain;
  }

  crossover(brainA, brainB) {
    let childBrain = ml5.tf.sequential();
    let hLayers = typeof topHiddenLayers !== 'undefined' ? topHiddenLayers : 1;
    let nPerLayer = typeof topNeurons !== 'undefined' ? topNeurons : 8;
    let actFunc = typeof topActivation !== 'undefined' ? topActivation : 'relu';

    childBrain.add(ml5.tf.layers.dense({ units: nPerLayer, inputShape: [10], activation: actFunc }));
    for (let i = 1; i < hLayers; i++) {
      childBrain.add(ml5.tf.layers.dense({ units: nPerLayer, activation: actFunc }));
    }
    childBrain.add(ml5.tf.layers.dense({ units: 3, activation: 'sigmoid' }));

    ml5.tf.tidy(() => {
      let weightsA = brainA.getWeights();
      let weightsB = brainB.getWeights();
      let childWeights = [];
      for (let i = 0; i < weightsA.length; i++) {
        let shape = weightsA[i].shape;
        let valuesA = weightsA[i].dataSync().slice();
        let valuesB = weightsB[i].dataSync().slice();
        let childValues = [];
        for (let j = 0; j < valuesA.length; j++) {
          childValues[j] = random() < 0.5 ? valuesA[j] : valuesB[j];
        }
        childWeights.push(ml5.tf.tensor(childValues, shape));
      }
      childBrain.setWeights(childWeights);
    });
    return childBrain;
  }

  mutate(brain) {
    ml5.tf.tidy(() => {
      let weights = brain.getWeights();
      let mutatedWeights = [];
      for (let i = 0; i < weights.length; i++) {
        let shape = weights[i].shape;
        let values = weights[i].dataSync().slice();
        for (let j = 0; j < values.length; j++) {
          if (random() < currentMutationRate) {
            values[j] += randomGaussian(0, 0.5);
          }
        }
        mutatedWeights.push(ml5.tf.tensor(values, shape));
      }
      brain.setWeights(mutatedWeights);
    });
  }
}
