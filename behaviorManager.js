class BehaviorManager {
  constructor(vehicle) {
    this.vehicle = vehicle;
    // Map of behaviors : name -> { active: boolean, weight: number, computeForce: function }
    this.behaviors = new Map();
  }

  // Inject a new behavior logic into the manager
  addBehavior(name, computeFunction, weight = 1.0) {
    this.behaviors.set(name, {
      active: true,
      weight: weight,
      compute: computeFunction
    });
  }

  removeBehavior(name) {
    this.behaviors.delete(name);
  }

  activate(name) {
    if (this.behaviors.has(name)) this.behaviors.get(name).active = true;
  }

  deactivate(name) {
    if (this.behaviors.has(name)) this.behaviors.get(name).active = false;
  }

  setWeight(name, weight) {
    if (this.behaviors.has(name)) this.behaviors.get(name).weight = weight;
  }

  // Accumulate all active behaviors
  calculate(context) {
    let steeringForce = createVector(0, 0);
    
    // Accumulate forces (Weighted Truncated Sum)
    for (let [name, behavior] of this.behaviors) {
      if (behavior.active) {
        let force = behavior.compute(this.vehicle, context);
        // Important: check if force exists to prevent errors
        if (force && (force.x !== 0 || force.y !== 0)) {
           force.mult(behavior.weight);
           steeringForce.add(force);
        }
      }
    }
    
    // Limit to max force of the vehicle
    steeringForce.limit(this.vehicle.maxForce);
    return steeringForce;
  }
}
