# Kinect Adventures — Neuro-Evolutionary River Rush 🚣‍♂️

**Master IA2 — Steering Behaviors (Nice 2025-2026)**


[▶️ Jouer en ligne (GitHub Pages)](https://yisola2.github.io/kinect-adventures-remake/)  
[🎥 Vidéo de démo (YouTube)](ici le lien de youtube)

---

## Contexte

L'idée c'était de faire un **River Rush** style Kinect Adventures. Vue top-down, une rivière qui défile, des radeaux qui doivent esquiver des rochers et des troncs d'arbres. Et le joueur peut contrôler son radeau avec le corps via la webcam (PoseNet de ml5.js), ou bien un algoritme evolutionnaire entraine un reseau de neurone pour controler le radeau.

Le réseau de neurones ne contrôle pas directement le radeau (gauche/droite). Il sort les **poids des steering behaviors** — `w_seek`, `w_avoid` — et une troisième valeur `z_action` pour gérer le saut/esquive. C'est le `BehaviorManager` qui calcule ensuite la force finale en sommant les behaviors pondérés.

### Comment marche le `z_action` (jump / duck)

Le NN sort une valeur `z_action ∈ [0, 1]` (sigmoid). On l'interprète comme suit :

- `z_action > 0.7` → l'agent saute (`zState = 'JUMPING'` pendant 40 frames). Pendant ce temps, il ignore les obstacles `LOW` (les rochers).
- `z_action < 0.3` → l'agent se baisse (`zState = 'DUCKING'` pendant 40 frames). Il ignore les obstacles `HIGH` (les troncs flottants).
- Entre les deux → `NORMAL`, esquive latérale uniquement.

Chaque déclenchement (`NORMAL → JUMPING` ou `NORMAL → DUCKING`) incrémente un compteur `zActionCount` qui sert de **pénalité de fitness** (voir Section 3 plus bas).


## Architecture

```
Webcam → ml5.PoseNet → Keypoints (jump, duck, lean)
                          ↓
                    p5.js Game Loop
                          ↓
              Vehicle (classe de base)
                    ↙         ↘
          KinectAgent          Player (webcam)
              ↓
        5 Raycasts (Sensor)
              ↓
      ml5.tf.sequential (NN)
              ↓
        3 outputs sigmoid
     [w_seek, w_avoid, z_action]
              ↓
        BehaviorManager
     (somme pondérée → force)
              ↓
     Algorithme génétique
  (fitness → sélection tournoi → crossover → mutation)
```

### Réseau de neurones

| Paramètre | Valeur |
|---|---|
| Entrées | 10 (5 distances raycast + 5 types d'obstacle) |
| Couches cachées | 1 (configurable via slider, 1–4) |
| Neurones/couche | 8 (configurable, 4–64) |
| Activation | ReLU (configurable : sigmoid, tanh) |
| Sorties | 3 : `w_seek`, `w_avoid`, `z_action` |

### Fonction de fitness

```
fitness = (distanceParcourue * 1.0) + (vitesseMoyenne * 50) + (waypoints * 100) - (zActionCount * Z_ACTION_COST)
```

Le `Z_ACTION_COST` (= 50) est une pénalité que j'ai ajoutée après avoir galéré pour casser un local minimum (voir Section 3).

---

## Les problèmes rencontrés

### 1. Le problème du "Freeze" — les agents ne bougent pas

Au tout début, les agents restaient complètement **immobiles**. Ils ne bougeaient pas du tout latéralement. D'un point de vue purement évolutif, leur stratégie était cohérente : sauter/se baisser en boucle suffisait à survivre, donc le GA n'avait aucune pression à apprendre l'esquive. Mais ce n'est pas le comportement que je voulais voir, donc j'ai dû casser ça.

Au début j'ai cherché côté NN — initialisation des poids, normalisation des inputs, sorties — tout avait l'air correct. En vrai, plusieurs problèmes se cumulaient :

**Bug silencieux n°1 — `obs.r` indéfini.** `Vehicle.avoid()` calcule un rayon d'évitement comme :

```js
let expandedRadius = this.r + obs.r + this.largeurZoneEvitementDevantVaisseau;
```

Mes obstacles n'avaient pas de propriété `r`. Donc `expandedRadius = NaN`, le test `abs(diff.y) < NaN` retournait toujours `false`, et **`avoid()` retournait un vecteur nul**. Pendant des dizaines de générations, l'esquive latérale était purement décorative — peu importe ce que le NN demandait. C'est ça qui fait paraître les agents "immobiles" : ils n'avaient littéralement aucune force latérale.
**Fix :** ajouter `this.r = Math.max(w, h) / 2;` dans le constructeur d'`Obstacle`.

**Bug silencieux n°2 — pas de murs wall-to-wall.** Le générateur de circuit ne posait que des obstacles ponctuels sur la rivière. Aucun obstacle ne couvrait toute la largeur, donc apprendre à sauter ou se baisser n'avait aucune utilité. Une fois l'avoid réparé, ça a cassé l'inverse : les agents apprenaient à esquiver mais jamais à sauter.
**Fix :** ajouter dans `circuit.js` un type d'obstacle qui occupe toute la largeur, avec un cooldown pour ne pas en spawner deux d'affilée.

**Multiplicateur d'avoid trop fort.** À un moment j'avais `setWeight('avoidObstacle', w_avoid * 5.0)`. Le facteur 5 écrasait les autres sorties du NN — peu importe la valeur prédite, l'avoid dominait toujours. Le brain ne pouvait plus arbitrer librement.
**Fix :** ramener à `* 3.0` (et `seekForward * 1.5`) pour que ce soit le NN qui décide de la priorité, pas un multiplicateur en dur.

**Et quelques tunings autour :** `maxForce = 2.0` (au lieu de la valeur de base 0.2 héritée de `Vehicle`), friction à `0.95` au lieu de `0.9` pour garder un peu d'élan latéral, et portée des capteurs à `300px` au lieu de `200px` pour donner plus de marge de réaction.

### 2. La Separation — une fausse bonne idée

Au début j'avais 4 sorties pour le NN : seek, avoid, **separation**, et z_action. L'idée c'était que les agents apprendraient à ne pas se rentrer dedans.

Sauf que dans ce jeu, les agents **ne flock pas**. Ils partagent le même canvas visuellement, mais ils ne s'influencent pas physiquement. Ajouter la separation n'a fait que du bruit — ça ajoutait une dimension de recherche en plus pour l'algorithme génétique, sans aucun bénéfice. Les agents convergeaient beaucoup plus lentement.

**La solution :** J'ai retiré la separation et réduit les sorties à 3. L'entraînement est devenu immédiatement plus rapide. À l'origine, je l'avais ajoutée surtout pour des raisons esthétiques (les radeaux qui se collent les uns aux autres ne rendaient pas terrible visuellement) — c'était une mauvaise raison de complexifier le NN.

### 3. Le local minima du "Jump Spam"

À un moment, les agents avaient découvert un truc : **sauter en permanence**. Comme le jump ignore les obstacles LOW, ils survivaient plus longtemps en spammant le jump qu'en apprenant à esquiver latéralement. C'était un **local minima classique** — la stratégie "tout sauter" avait un fitness correct mais plafonnait.

**La solution :** Le `Z_ACTION_COST`. Chaque jump ou duck coûte 50 points de fitness. Ça force les agents à réserver le jump pour les obstacles **inévitables** (les wall-to-wall) et à préférer l'esquive latérale, qui est "gratuite."

Pour que ça marche, j'ai aussi ajouté des **obstacles wall-to-wall** qui couvrent toute la largeur de la rivière. Sans eux, il n'y aurait aucune raison d'apprendre le jump. Le ratio obstacles normaux / wall-to-wall dépend de la difficulté.

### 4. Sélection par tournoi vs Roulette

Au début j'utilisais la **sélection par roulette** (probabilité proportionnelle à la fitness). Mais quand un agent avait un fitness 10x supérieur aux autres, il dominait complètement la sélection et on perdait toute diversité génétique.

**La solution :** Sélection par **tournoi** (taille 5) comme dans l'algo du cours. On tire 5 agents au hasard et on garde le meilleur. C'est plus robuste et ça maintient la diversité.

---

## Comment utiliser

### Entraîner une IA
1. Ouvrir `index.html` dans un navigateur
2. Ajuster les sliders du **Brain Lab** (Layers, Neurons, Activation, Mutation, Pop Size)
3. Choisir la difficulté de la rivière (Easy → Killer)
4. Cliquer **TRAIN AI**
5. Augmenter le **Warp** (1x → 10x) pour accélérer
6. L'entraînement s'arrête quand 60% des agents atteignent le **Target Distance**
7. Le meilleur cerveau est automatiquement sauvegardé dans le **Brain Vault**

### Organiser une course
1. Cliquer **Export** dans le Vault pour télécharger des cerveaux `.json`
2. Uploader plusieurs `.json` via le sélecteur de fichiers
3. Cliquer **START RACE**
4. Chaque cerveau a sa propre couleur + nom affiché au-dessus du radeau
5. À la fin, un classement avec médailles 🥇🥈🥉 s'affiche
6. Cliquer **RERUN RACE** pour relancer

### Jouer avec la webcam
1. Cliquer **WEBCAM PLAY**
2. Autoriser l'accès à la caméra
3. **Pencher le corps** à gauche/droite pour diriger
4. **Lever les deux mains** au-dessus des épaules pour sauter
5. **S'accroupir** (nez descend) pour se baisser

> **Astuce :** Rafraîchir la page avant le mode webcam force le GPU, ce qui rend PoseNet plus fluide.

---

## Stack technique

- **p5.js** — Rendu, physique, game loop
- **ml5.js** — PoseNet (webcam) + `ml5.tf.sequential()` (cerveaux IA)
- **TensorFlow.js** (via ml5) — Backend CPU pour l'entraînement, WebGL pour PoseNet
- **Vanilla JS / HTML / CSS** — Pas de framework, tout tourne dans le navigateur

## Ce que j'ai appris

- **Un bug silencieux peut tuer l'apprentissage sans rien casser visuellement.** L'`obs.r` indéfini faisait passer `avoid()` à `NaN` et retourner zéro. Le NN pouvait apprendre tout ce qu'il voulait, ça ne servait à rien. Toujours vérifier que les forces calculées ne sont pas dégénérées avant d'accuser le NN.
- **Ne pas écraser les sorties du NN avec des multiplicateurs trop grands.** Avec `* 5.0` sur l'avoid, le NN ne pouvait plus arbitrer — c'est lui qui doit décider de la priorité, pas un facteur en dur.
- **Moins de sorties = convergence plus rapide.** Chaque sortie supplémentaire augmente exponentiellement l'espace de recherche du GA.
- **Les pénalités sont essentielles** pour éviter les local minima. Sans le `Z_ACTION_COST`, les agents trouvent des "raccourcis" qui plafonnent.
- **La sélection par tournoi** est plus robuste que la roulette pour maintenir la diversité génétique.
- **CPU > GPU** pour les petits réseaux. Le transfert mémoire vers le GPU coûte plus cher que le calcul lui-même.

> Merci aux assistants IA (Claude, ChatGPT) qui m'ont accompagné pendant tout le debug — notamment pour traquer le bug silencieux d'`obs.r` qui m'aurait pris des jours à trouver tout seul.

---

## Structure des fichiers

```
├── index.html          ← Dashboard (Grid CSS, sliders, Brain Vault)
├── sketch.js           ← Game loop, modes, background, HUD
├── vehicle.js          ← Classe de base (seek, flee, avoid, pursue...)
├── kinectAgent.js      ← Agent IA (NN + sensors + behaviors)
├── population.js       ← Algo génétique (tournoi, crossover, mutation)
├── behaviorManager.js  ← Somme pondérée des forces de steering
├── circuit.js          ← Générateur procédural d'obstacles
├── sensors.js          ← Raycasts (5 directions, 300px)
├── brainStorage.js     ← Sauvegarde/chargement des cerveaux (localStorage + JSON)
├── ui.js               ← Sliders, boutons, Brain Vault UI
├── obstacle.js         ← Rochers, troncs, murs (vector art)
└── assets/water.png    ← Texture de rivière (scrolling)
```
