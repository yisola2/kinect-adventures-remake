// Global UI variables
let currentMutationRate = 0.1;
let currentPopSize = 20;
let currentDifficulty = 'MEDIUM';
let curriculumLearning = false;

// Topology variables
let topHiddenLayers = 1;
let topNeurons = 8;
let topActivation = 'relu';

// How many physics ticks to run per rendered frame during training
let trainingCyclesPerFrame = 1;

// Distance (in px) an agent must reach for the 60% stop condition to fire.
let trainingTargetDistance = 2000;

function setupUI() {
  let sliderMutationRate = document.getElementById('mutationRate');
  let sliderPopSize = document.getElementById('popSize');
  let difficultySelect = document.getElementById('difficultySelect');
  let curriculumCheck = document.getElementById('curriculumCheck');
  
  let btnStartTraining = document.getElementById('btnStartTraining');
  let btnStartCompetition = document.getElementById('btnStartCompetition');
  let btnStartPlay = document.getElementById('btnStartPlay');
  let btnStop = document.getElementById('btnStop');
  let btnSaveBrain = document.getElementById('btnSaveBrain');
  let fileUploadBrains = document.getElementById('fileUploadBrains');
  
  let labelMutation = document.getElementById('labelMutation');
  let labelPopSize = document.getElementById('labelPopSize');
  
  let sliderHiddenLayers = document.getElementById('sliderHiddenLayers');
  let sliderNeurons = document.getElementById('sliderNeurons');
  let selectActivation = document.getElementById('selectActivation');
  let labelHiddenLayers = document.getElementById('labelHiddenLayers');
  let labelNeurons = document.getElementById('labelNeurons');

  if (sliderHiddenLayers) {
    sliderHiddenLayers.addEventListener('input', (e) => {
      topHiddenLayers = parseInt(e.target.value);
      labelHiddenLayers.innerText = topHiddenLayers;
    });
  }
  
  if (sliderNeurons) {
    sliderNeurons.addEventListener('input', (e) => {
      topNeurons = parseInt(e.target.value);
      labelNeurons.innerText = topNeurons;
    });
  }
  
  if (selectActivation) {
    selectActivation.addEventListener('change', (e) => {
      topActivation = e.target.value;
    });
  }
  
  if (sliderMutationRate) {
    sliderMutationRate.addEventListener('input', (e) => {
      currentMutationRate = parseFloat(e.target.value);
      labelMutation.innerText = currentMutationRate.toFixed(2);
    });
  }
  
  if (sliderPopSize) {
    sliderPopSize.addEventListener('input', (e) => {
      currentPopSize = parseInt(e.target.value);
      labelPopSize.innerText = currentPopSize;
    });
  }

  let sliderTrainSpeed = document.getElementById('trainSpeed');
  let labelTrainSpeed = document.getElementById('labelTrainSpeed');
  if (sliderTrainSpeed) {
    sliderTrainSpeed.addEventListener('input', (e) => {
      trainingCyclesPerFrame = parseInt(e.target.value);
      labelTrainSpeed.innerText = trainingCyclesPerFrame + 'x';
    });
  }

  let sliderTargetDist = document.getElementById('targetDist');
  let labelTargetDist = document.getElementById('labelTargetDist');
  if (sliderTargetDist) {
    sliderTargetDist.addEventListener('input', (e) => {
      trainingTargetDistance = parseInt(e.target.value);
      labelTargetDist.innerText = trainingTargetDistance + 'px';
    });
  }
  
  if (difficultySelect) {
    difficultySelect.addEventListener('change', (e) => {
      currentDifficulty = e.target.value;
      if (typeof circuitManager !== 'undefined') circuitManager.setDifficulty(currentDifficulty);
    });
  }

  if (curriculumCheck) {
    curriculumCheck.addEventListener('change', (e) => {
      curriculumLearning = e.target.checked;
      if (typeof circuitManager !== 'undefined') circuitManager.curriculumLearning = curriculumLearning;
    });
  }
  
  if (btnStartTraining) {
    btnStartTraining.addEventListener('click', () => {
      // Smart Backend Switching: CPU is faster for small AI training
      if (typeof ml5 !== 'undefined' && ml5.tf) {
        ml5.tf.setBackend('cpu').then(() => console.log("Backend: CPU (Training)"));
      }
      if (typeof GAME_MODE !== 'undefined') GAME_MODE = 'TRAINING';
      if (typeof resetSimulation === 'function') resetSimulation();
    });
  }

  if (btnStartCompetition) {
    btnStartCompetition.addEventListener('click', () => {
      if (typeof loadedBrains !== 'undefined' && loadedBrains.length === 0) {
        alert("Please upload at least 1 brain (.json file) first!");
        return;
      }
      // Smart Backend Switching: CPU is faster for running existing small AI brains
      if (typeof ml5 !== 'undefined' && ml5.tf) {
        ml5.tf.setBackend('cpu').then(() => console.log("Backend: CPU (Competition)"));
      }
      if (typeof GAME_MODE !== 'undefined') GAME_MODE = 'COMPETITION';
      if (typeof resetSimulation === 'function') resetSimulation();
    });
  }

  if (btnStartPlay) {
    btnStartPlay.addEventListener('click', () => {
      // Smart Backend Switching: WebGL (GPU) is MUCH faster for PoseNet webcam tracking
      if (typeof ml5 !== 'undefined' && ml5.tf) {
        ml5.tf.setBackend('webgl').then(() => console.log("Backend: WebGL (Play Mode)"));
      }
      if (typeof GAME_MODE !== 'undefined') GAME_MODE = 'PLAY';
      if (typeof resetSimulation === 'function') resetSimulation();
    });
  }

  if (btnStop) {
    btnStop.addEventListener('click', () => {
      if (typeof GAME_MODE !== 'undefined') GAME_MODE = 'IDLE';
      
      // Stop Webcam stream to turn off the light
      if (typeof video !== 'undefined' && video) {
        if (video.elt && video.elt.srcObject) {
          video.elt.srcObject.getTracks().forEach(track => track.stop());
        }
        video.remove();
        video = null;
      }
      
      // Memory Leak Fix: Dispose of all TensorFlow neural networks before clearing array
      if (typeof population !== 'undefined' && population && population.agents) {
        population.agents.forEach(agent => {
          if (agent.brain) agent.brain.dispose();
        });
        population.agents = [];
      }
      
      // Clear obstacles
      if (typeof obstacles !== 'undefined') obstacles = [];
    });
  }

  if (btnSaveBrain) {
    btnSaveBrain.addEventListener('click', () => {
      if (typeof saveBestBrain === 'function') saveBestBrain();
    });
  }

  if (fileUploadBrains) {
    fileUploadBrains.addEventListener('change', (e) => {
      if (typeof loadBrains === 'function') loadBrains(e);
    });
  }

  let btnClearVault = document.getElementById('btnClearVault');
  if (btnClearVault) {
    btnClearVault.addEventListener('click', () => {
      if (typeof clearVault === 'function') clearVault();
    });
  }

  // Sync labels from actual slider values on page load
  if (sliderHiddenLayers && labelHiddenLayers) {
    topHiddenLayers = parseInt(sliderHiddenLayers.value);
    labelHiddenLayers.innerText = topHiddenLayers;
  }
  if (sliderNeurons && labelNeurons) {
    topNeurons = parseInt(sliderNeurons.value);
    labelNeurons.innerText = topNeurons;
  }
  if (sliderMutationRate && labelMutation) {
    currentMutationRate = parseFloat(sliderMutationRate.value);
    labelMutation.innerText = currentMutationRate.toFixed(2);
  }
  if (sliderPopSize && labelPopSize) {
    currentPopSize = parseInt(sliderPopSize.value);
    labelPopSize.innerText = currentPopSize;
  }
  if (sliderTrainSpeed && labelTrainSpeed) {
    trainingCyclesPerFrame = parseInt(sliderTrainSpeed.value);
    labelTrainSpeed.innerText = trainingCyclesPerFrame + 'x';
  }
  if (sliderTargetDist && labelTargetDist) {
    trainingTargetDistance = parseInt(sliderTargetDist.value);
    labelTargetDist.innerText = trainingTargetDistance + 'px';
  }

  // Initial render
  renderVault();
}

function renderVault() {
  let vaultList = document.getElementById('vault-list');
  if (!vaultList) return;
  
  let brains = (typeof getVaultedBrains === 'function') ? getVaultedBrains() : [];
  
  if (brains.length === 0) {
    vaultList.innerHTML = '<p style="text-align: center; color: #666; margin-top: 50px;">Vault is empty.<br>Complete a training session to save a brain!</p>';
    return;
  }
  
  // Sort by date (newest first)
  brains.sort((a, b) => b.metadata.id - a.metadata.id);
  
  vaultList.innerHTML = '';
  brains.forEach(brain => {
    let div = document.createElement('div');
    div.className = 'vault-item';
    
    let meta = brain.metadata;
    let topologyStr = meta.topology ? `${meta.topology.hiddenLayers}L x ${meta.topology.neuronsPerLayer}N (${meta.topology.activation})` : 'Classic';
    
    div.innerHTML = `
      <h4>${meta.difficulty} Champion - Gen ${meta.generation}</h4>
      <p>
        <strong>Fitness:</strong> ${meta.fitness} px<br>
        <strong>Date:</strong> ${meta.date}<br>
        <strong>Topology:</strong> ${topologyStr}
      </p>
      <div class="vault-controls">
        <button class="btn-deploy" onclick="deployFromVault(${meta.id})">Deploy</button>
        <button onclick="downloadFromVault(${meta.id})">Download</button>
        <button class="btn-delete" onclick="deleteFromVault(${meta.id})">Delete</button>
      </div>
    `;
    vaultList.appendChild(div);
  });
}

function deployFromVault(id) {
  let brains = getVaultedBrains();
  let brain = brains.find(b => b.metadata.id === id);
  if (brain) {
    // Add to the competition list
    loadedBrains.push({
      data: brain,
      filename: `vault_gen${brain.metadata.generation}_${brain.metadata.difficulty}.json`
    });
    updateLeaderboardUI();
    alert("Brain deployed to Competition Mode!");
  }
}

function downloadFromVault(id) {
  let brains = getVaultedBrains();
  let brain = brains.find(b => b.metadata.id === id);
  if (brain) {
    // Reuse the download logic
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(brain));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    let dateStr = new Date(brain.metadata.id).toISOString().slice(0, 10);
    downloadAnchorNode.setAttribute("download", `vault_gen${brain.metadata.generation}_${brain.metadata.difficulty}_${dateStr}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
}
