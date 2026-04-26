class Sensor {
  constructor(vehicle, numRays, rayLength) {
    this.vehicle = vehicle;
    this.numRays = numRays;
    this.rayLength = rayLength;
    this.angles = [];
    
    // Spread rays in a 180 degree arc facing UP (since river flows DOWN)
    // Angles in p5: UP is -PI/2
    let startAngle = -PI;
    let endAngle = 0;
    if (this.numRays === 1) {
      this.angles.push(-PI/2);
    } else {
      let step = PI / (this.numRays - 1);
      for (let i = 0; i < this.numRays; i++) {
        this.angles.push(startAngle + i * step);
      }
    }
  }

  // Cast rays against obstacles and return normalized distances and types
  read(obstacles, isBest) {
    let readings = [];
    
    for (let i = 0; i < this.numRays; i++) {
      let angle = this.angles[i];
      let dir = createVector(cos(angle), sin(angle));
      
      let recordDist = this.rayLength;
      let recordType = 0; // 0=None, 1=LOW, 2=HIGH, 3=WALL
      let closestPt = null;

      // Sample points along the ray for collision detection
      let numSamples = 10; // Reduced from 15 to 10 for performance
      let sampleStep = this.rayLength / numSamples;
      
      for (let s = 1; s <= numSamples; s++) {
        let testPt = p5.Vector.add(this.vehicle.pos, p5.Vector.mult(dir, s * sampleStep));
        let hit = false;
        let hitType = null;
        
        for (let obs of obstacles) {
           let inX = testPt.x > obs.pos.x - obs.w/2 && testPt.x < obs.pos.x + obs.w/2;
           let inY = testPt.y > obs.pos.y - obs.h/2 && testPt.y < obs.pos.y + obs.h/2;
           if (inX && inY) {
             hit = true;
             hitType = obs.type;
             break;
           }
        }
        
        if (hit) {
          recordDist = s * sampleStep;
          if (hitType === 'LOW') recordType = 1;
          else if (hitType === 'HIGH') recordType = 2;
          else if (hitType === 'WALL') recordType = 3;
          closestPt = testPt;
          break; // Stop going further on this ray
        }
      }
      
      // Visual Trick: Draw sensors ONLY for the Champion agent!
      if (Vehicle.debug || isBest) {
        push();
        stroke(255, 215, 0, 150); // Gold laser
        strokeWeight(2);
        let endPt = p5.Vector.add(this.vehicle.pos, p5.Vector.mult(dir, this.rayLength));
        
        if (closestPt) {
          line(this.vehicle.pos.x, this.vehicle.pos.y, closestPt.x, closestPt.y);
          fill(255, 0, 0);
          noStroke();
          circle(closestPt.x, closestPt.y, 8);
        } else {
          stroke(255, 255, 255, 50); // Faded laser if no hit
          strokeWeight(1);
          line(this.vehicle.pos.x, this.vehicle.pos.y, endPt.x, endPt.y);
        }
        pop();
      }

      readings.push({
        distance: recordDist / this.rayLength,
        typeId: recordType
      });
    }
    
    return readings;
  }
}
