// brainStorage.js
// Handles downloading and uploading trained Neural Networks (Brains)

let loadedBrains = [];
const VAULT_KEY = 'KinectAdventures_BrainVault';

// --- BRAIN VAULT (LocalStorage) ---

function saveToVault(brainJSON) {
  let vault = getVaultedBrains();
  
  // Add unique ID and ensure date is fresh
  brainJSON.metadata.id = Date.now();
  brainJSON.metadata.date = new Date().toLocaleString();
  
  vault.push(brainJSON);
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  console.log("Brain saved to Vault!");
  
  if (typeof renderVault === 'function') renderVault();
}

function getVaultedBrains() {
  let data = localStorage.getItem(VAULT_KEY);
  return data ? JSON.parse(data) : [];
}

function deleteFromVault(id) {
  let vault = getVaultedBrains();
  vault = vault.filter(b => b.metadata.id !== id);
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  if (typeof renderVault === 'function') renderVault();
}

function clearVault() {
  if (confirm("Are you sure you want to delete ALL vaulted brains?")) {
    localStorage.removeItem(VAULT_KEY);
    if (typeof renderVault === 'function') renderVault();
  }
}

// --- FILE SYSTEM (Downloads) ---

function saveBestBrain() {
  if (!population) return;
  
  let brainJSON = null;

  // Always prefer the absolute best brain recorded so far
  if (population.allTimeBestBrainData) {
     brainJSON = population.allTimeBestBrainData;
  } else if (population.agents.length > 0) {
     // Fallback: If Generation 1 hasn't even finished yet, just grab the current leader
     let currentBest = population.agents[0];
     for (let a of population.agents) {
       if (a.distanceCovered > currentBest.distanceCovered) {
         currentBest = a;
       }
     }
     let weights = currentBest.brain.getWeights();
     let weightData = weights.map(w => Array.from(w.dataSync()));
     brainJSON = {
       metadata: {
         generation: population.generation,
         fitness: Math.floor(currentBest.distanceCovered),
         distance: Math.floor(currentBest.distanceCovered),
         timeAlive: currentBest.timeAlive,
         date: new Date().toLocaleString(),
         difficulty: typeof circuitManager !== 'undefined' ? circuitManager.difficulty : 'UNKNOWN',
         color: currentBest.color.levels,
         topology: {
           hiddenLayers: typeof topHiddenLayers !== 'undefined' ? topHiddenLayers : 1,
           neuronsPerLayer: typeof topNeurons !== 'undefined' ? topNeurons : 8,
           activation: typeof topActivation !== 'undefined' ? topActivation : 'relu'
         }
       },
       weights: weightData
     };
  }

  // 1. Auto-save to Vault (Internal Database)
  saveToVault(brainJSON);
  
  // 2. Trigger physical download
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(brainJSON));
  let downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  
  // Format filename: brain_GenX_Diff_Date_Fitness.json
  let dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let filename = `brain_Gen${brainJSON.metadata.generation}_${brainJSON.metadata.difficulty}_${dateStr}_Fit${brainJSON.metadata.fitness}.json`;
  
  downloadAnchorNode.setAttribute("download", filename);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function loadBrains(event) {
  let files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    let reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target.result);
        loadedBrains.push({ data: data, filename: files[i].name });
        console.log("Loaded brain:", data.metadata);
        updateLeaderboardUI();
      } catch (err) {
        alert("Failed to parse JSON for file: " + files[i].name);
      }
    };
    reader.readAsText(files[i]);
  }
}

function updateLeaderboardUI() {
  let label = document.getElementById('loadedBrainsLabel');
  if (label) {
    label.innerText = loadedBrains.length + " brains loaded!";
    label.style.color = "#00ff00";
  }
}
