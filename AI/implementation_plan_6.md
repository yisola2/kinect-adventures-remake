# Phase 5: Network Topology Configuration

According to your university requirements (`CLAUDE.md`), you are strictly required to provide a UI that lets the user configure the Neural Network Topology *before* training begins. 

Right now, the AI brain is hardcoded to a single hidden layer with 8 neurons and a `relu` activation function. We need to make this dynamic!

## Proposed Changes

### 1. UI Updates (`index.html` & `ui.js`)
Add a new **Network Topology** section to the Train AI panel:
- **Hidden Layers:** Slider from `1` to `4` (Default: `1`)
- **Neurons per Layer:** Slider from `4` to `64` (Default: `8`)
- **Activation Function:** Dropdown with `relu`, `sigmoid`, and `tanh`

### 2. Dynamic Brain Creation (`agent.js`)
When a new population is spawned for Training, the neural network will be built dynamically using a loop:
```javascript
let brain = ml5.tf.sequential();

// First hidden layer (connects to the 10 inputs)
brain.add(ml5.tf.layers.dense({units: neuronsPerLayer, inputShape: [10], activation: activationFunc}));

// Extra hidden layers (if the user selected 2, 3, or 4 layers)
for (let i = 1; i < hiddenLayers; i++) {
  brain.add(ml5.tf.layers.dense({units: neuronsPerLayer, activation: activationFunc}));
}

// Final Output Layer (always 4 outputs with sigmoid for 0-1 steering weights)
brain.add(ml5.tf.layers.dense({units: 4, activation: 'sigmoid'}));
```

### 3. Brain Storage Updates (`brainStorage.js` & `sketch.js`)
- **Save:** When downloading the Champion Brain, the JSON file will now include the `topology` (e.g., `{ layers: 2, neurons: 16, activation: 'relu' }`) in its metadata.
- **Load (Competition Mode):** When you upload a brain for a race, `sketch.js` will read the JSON metadata and rebuild the exact custom topology required before injecting the weights.

## User Review Required

Does this cover everything you need for the "Topology Sliders" requirement from your professor? If you approve, I will implement it so you can experiment with "Deep" vs "Shallow" neural networks!
