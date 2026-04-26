// Base physical vehicle class. AI logic moved to Behaviors.js
class Vehicle {
  static debug = false;

  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 4;
    this.maxForce = 0.2;
    this.r = 16;
    
    // Used for wander
    this.distanceCercle = 50;
    this.wanderRadius = 25;
    this.wanderTheta = PI / 2;
    this.displaceRange = 0.3;

    // Used for avoid — full r (not r/2) gives a comfier safety margin so
    // dodging fires earlier in lateral terms.
    this.largeurZoneEvitementDevantVaisseau = this.r;
    
    // Trail
    this.path = [];
    this.pathMaxLength = 20;
    this.color = "white";

    // Component: Behavior Manager
    if (typeof BehaviorManager !== 'undefined') {
      this.behaviorManager = new BehaviorManager(this);
    }

    // Z-Axis Simulation for Kinect Adventures
    this.zState = 'NORMAL'; // 'NORMAL', 'JUMPING', 'DUCKING'
    this.zStateTimer = 0;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    // River Boundaries: Constrain raft between the banks
    this.pos.x = constrain(this.pos.x, 100, width - 100);

    // Trail
    if (frameCount % 3 === 0) {
      this.path.push(this.pos.copy());
      if (this.path.length > this.pathMaxLength) {
        this.path.shift();
      }
    }

    // Update Z-Axis State Timer
    if (this.zState !== 'NORMAL') {
      this.zStateTimer--;
      if (this.zStateTimer <= 0) {
        this.zState = 'NORMAL';
      }
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Rotate raft slightly based on velocity
    let angle = map(this.vel.x, -5, 5, -PI/10, PI/10);
    rotate(angle);
    
    // 3D Jump Height
    let zOffset = 0;
    if (this.zState === 'JUMPING') {
      let maxT = (this instanceof KinectAgent) ? 40 : 60;
      zOffset = sin(map(this.zStateTimer, maxT, 0, 0, PI)) * 40;
    }

    // --- 1. SHADOW (Stays on water) ---
    fill(0, 0, 0, 40);
    noStroke();
    ellipse(zOffset * 0.3, zOffset * 0.3, this.r * 2.5, this.r * 3.5);

    // --- 2. THE RAFT (Vector Art) ---
    push();
    translate(-zOffset*0.5, -zOffset);
    if (this.zState === 'JUMPING') scale(1.1);
    if (this.zState === 'DUCKING') {
      tint(255, 150);
      scale(0.85);
    }

    rectMode(CENTER);
    let w = this.r * 2.5;
    let h = this.r * 3.5;

    // Draw Wood Planks
    stroke(60, 30, 10);
    strokeWeight(1);
    for (let i = -2; i <= 2; i++) {
      fill(100 + (i * 10), 60 + (i * 5), 30); // Variations in wood color
      rect(i * (w/5), 0, w/5, h, 4);
      // Wood grain lines
      line(i * (w/5), -h/3, i * (w/5), h/3);
    }

    // Ropes holding it together
    stroke(200, 180, 150);
    strokeWeight(2);
    line(-w/2, -h/4, w/2, -h/4);
    line(-w/2, h/4, w/2, h/4);

    // The Person (Minimalist Vector)
    noStroke();
    // Body/Shirt
    fill(this.color || 'blue');
    ellipse(0, 0, w * 0.6, w * 0.5);
    // Head
    fill(255, 200, 150);
    ellipse(0, -w*0.1, w * 0.4, w * 0.4);
    // Hat
    fill(60, 40, 20);
    rect(0, -w*0.2, w * 0.5, w * 0.1, 2);

    pop();
    pop();
  }
    
  drawDebugSpeed() {
    push();
    strokeWeight(2);
    stroke(255, 0, 0);
    line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 10, this.pos.y + this.vel.y * 10);
    pop();
  }

  // --- STEERING BEHAVIORS ---
  findProjection(p, a, b) {
    let ap = p5.Vector.sub(p, a);
    let ab = p5.Vector.sub(b, a);
    ab.normalize();
    ab.mult(ap.dot(ab));
    return p5.Vector.add(a, ab);
  }

  seek(target, arrival = false) {
    let force = p5.Vector.sub(target, this.pos);
    let desiredSpeed = this.maxSpeed;
    if (arrival) {
      let slowRadius = 100;
      let distance = force.mag();
      if (distance < slowRadius) {
        desiredSpeed = map(distance, 0, slowRadius, 0, this.maxSpeed);
      }
    }
    force.setMag(desiredSpeed);
    force.sub(this.vel);
    force.limit(this.maxForce);
    return force;
  }

  arrive(target) {
    return this.seek(target, true);
  }

  flee(target) {
    return this.seek(target).mult(-1);
  }

  pursue(targetVehicle) {
    let target = targetVehicle.pos.copy();
    let prediction = targetVehicle.vel.copy();
    prediction.mult(10);
    target.add(prediction);
    if (Vehicle.debug) {
      push();
      fill(0, 255, 0);
      noStroke();
      circle(target.x, target.y, 8);
      pop();
    }
    return this.seek(target);
  }

  evade(targetVehicle) {
    let pursuit = this.pursue(targetVehicle);
    pursuit.mult(-1);
    return pursuit;
  }

  wander() {
    let wanderPoint = this.vel.copy();
    wanderPoint.setMag(this.distanceCercle);
    wanderPoint.add(this.pos);

    let theta = this.wanderTheta + this.vel.heading();
    let x = this.wanderRadius * cos(theta);
    let y = this.wanderRadius * sin(theta);
    wanderPoint.add(x, y);

    if (Vehicle.debug) {
      push();
      noFill();
      stroke(255, 100);
      circle(this.pos.x + this.vel.copy().setMag(this.distanceCercle).x, this.pos.y + this.vel.copy().setMag(this.distanceCercle).y, this.wanderRadius * 2);
      stroke(0, 255, 0);
      line(this.pos.x, this.pos.y, wanderPoint.x, wanderPoint.y);
      fill(0, 255, 0);
      noStroke();
      circle(wanderPoint.x, wanderPoint.y, 8);
      pop();
    }

    let steer = p5.Vector.sub(wanderPoint, this.pos);
    steer.setMag(this.maxForce);
    
    this.wanderTheta += random(-this.displaceRange, this.displaceRange);
    return steer;
  }

  getObstacleLePlusProche(obstacles) {
    let closestDist = Infinity;
    let closestObs = undefined;
    for (let o of obstacles) {
      let d = this.pos.dist(o.pos);
      if (d < closestDist) {
        closestDist = d;
        closestObs = o;
      }
    }
    return closestObs;
  }

  avoid(obstacles) {
    let steer = createVector(0, 0);
    // Safe margin ahead of the vehicle
    let avoidDistance = 100 + this.vel.mag() * 5; // dynamic look-ahead; base 100 gives ~20 frames of warning even at standstill
    
    let closestObs = null;
    let closestDist = Infinity;
    let localClosestObs = null;

    let heading = this.vel.heading();

    // 1. Convert obstacles to local space and find the closest intersecting one
    for (let obs of obstacles) {
      // Vector from vehicle to obstacle
      let diff = p5.Vector.sub(obs.pos, this.pos);
      // Rotate by negative heading to get local coordinates relative to the car
      diff.rotate(-heading);

      // Local X is "forward", Local Y is "left/right"
      // If it's in front of us, and within action distance...
      if (diff.x > 0 && diff.x < avoidDistance) {
        // If it's horizontally aligned with our trajectory...
        let expandedRadius = this.r + obs.r + this.largeurZoneEvitementDevantVaisseau;
        if (abs(diff.y) < expandedRadius) {
          // It's a collision course! Find the closest one.
          if (diff.x < closestDist) {
            closestDist = diff.x;
            closestObs = obs;
            localClosestObs = diff;
          }
        }
      }
    }

    if (Vehicle.debug) {
      push();
      translate(this.pos.x, this.pos.y);
      rotate(heading);
      stroke(255, 150);
      strokeWeight(1);
      noFill();
      // Draw the projection bounding box for debugging
      let expandedR = this.r + 20 + this.largeurZoneEvitementDevantVaisseau; // average obs.r + our zone
      rectMode(CORNER);
      rect(0, -expandedR, avoidDistance, expandedR * 2);
      pop();
    }

    // 2. Compute steering force for the localized obstacle
    if (closestObs && localClosestObs) {
      let expandedRadius = this.r + closestObs.r + this.largeurZoneEvitementDevantVaisseau;

      // The closer it is locally, the stronger the force
      // Lateral force (Y) pushes away based on which side the obstacle is on
      let multiplier = 1.0 + (avoidDistance - localClosestObs.x) / avoidDistance;

      let steerY = (expandedRadius - localClosestObs.y) * multiplier; 
      // If obstacle is on the left (negative Y), we steer right (positive Y). 
      // But if localY is positive (right), we steer left (negative). 
      // So let's properly reflect the sign:
      if (localClosestObs.y > 0) steerY = -steerY; 
      else steerY = abs(steerY);

      // Add a slight braking force (negative X) depending on proximity
      let steerX = - (avoidDistance - localClosestObs.x) * 0.1;

      // Construct local steering vector
      let localSteer = createVector(steerX, steerY);
      
      // Convert local steering vector back to world space
      localSteer.rotate(heading);

      if (Vehicle.debug) {
        push();
        stroke("yellow");
        strokeWeight(3);
        line(closestObs.pos.x, closestObs.pos.y, closestObs.pos.x + localSteer.x * 10, closestObs.pos.y + localSteer.y * 10);
        pop();
      }

      localSteer.setMag(this.maxSpeed);
      localSteer.sub(this.vel);
      localSteer.limit(this.maxForce);
      return localSteer;
    }

    return steer;
  }

  separate(vehicles) {
    let desiredSeparation = this.r * 2.5;
    let steer = createVector(0, 0);
    let count = 0;

    for (let other of vehicles) {
      if (other !== this) {
        let d = this.pos.dist(other.pos);
        if (d > 0 && d < desiredSeparation) {
          let diff = p5.Vector.sub(this.pos, other.pos);
          diff.normalize();
          diff.div(d);
          steer.add(diff);
          count++;
        }
      }
    }

    if (count > 0) {
      steer.div(count);
    }

    if (steer.mag() > 0) {
      steer.setMag(this.maxSpeed);
      steer.sub(this.vel);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  follow(path) {
    let predict = this.vel.copy();
    if (predict.magSq() === 0) {
      predict = createVector(this.maxSpeed, 0);
    }
    predict.normalize();
    predict.mult(25);
    let predictpos = p5.Vector.add(this.pos, predict);

    let normal = null;
    let target = null;
    let worldRecord = Infinity;

    for (let i = 0; i < path.points.length; i++) {
      let a = path.points[i];
      let b = path.points[(i + 1) % path.points.length];
      
      let normalPoint = this.findProjection(predictpos, a, b);

      if (
        normalPoint.x < min(a.x, b.x) ||
        normalPoint.x > max(a.x, b.x) ||
        normalPoint.y < min(a.y, b.y) ||
        normalPoint.y > max(a.y, b.y)
      ) {
        normalPoint = b.copy();
        a = path.points[(i + 1) % path.points.length];
        b = path.points[(i + 2) % path.points.length];
      }

      let d = p5.Vector.dist(predictpos, normalPoint);
      if (d < worldRecord) {
        worldRecord = d;
        normal = normalPoint;
        let dir = p5.Vector.sub(b, a);
        dir.normalize();
        dir.mult(25);
        target = normal.copy();
        target.add(dir);
      }
    }

    if (Vehicle.debug && target) {
      push();
      stroke(0); fill(0);
      line(this.pos.x, this.pos.y, predictpos.x, predictpos.y);
      circle(predictpos.x, predictpos.y, 4);
      circle(normal.x, normal.y, 4);
      line(predictpos.x, predictpos.y, target.x, target.y);
      if (worldRecord > path.radius) fill(255, 0, 0);
      else fill(0, 255, 0);
      noStroke();
      circle(target.x, target.y, 8);
      pop();
    }

    if (worldRecord > path.radius && target) {
      return this.seek(target);
    } else {
      return createVector(0, 0);
    }
  }

  cohesion(vehicles) {
    let neighbordist = this.r * 15;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let d = this.pos.dist(other.pos);
      if (d > 0 && d < neighbordist) {
        sum.add(other.pos);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    }
    return createVector(0, 0);
  }

  align(vehicles) {
    let neighbordist = this.r * 15;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      let d = this.pos.dist(other.pos);
      if (d > 0 && d < neighbordist) {
        sum.add(other.vel);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.vel);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector(0, 0);
  }

  formationV(leader, index) {
    if (!leader || index === 0) return createVector(0, 0);

    // Grid coordinates:
    // Row 1: index 1 and 2
    // Row 2: index 3 and 4
    let row = Math.ceil(index / 2);
    // side: -1 for left (odd), 1 for right (even)
    let side = (index % 2 === 1) ? -1 : 1;

    let spacingFront = this.r * 2.5;  // Espace vers l'arrière
    let spacingSide = this.r * 2.5;  // Espace sur les côtés

    let leaderHeading = leader.vel.copy().normalize();
    if (leaderHeading.magSq() === 0) { 
      leaderHeading = createVector(1, 0); // Failsafe
    }

    let backVec = leaderHeading.copy().mult(-row * spacingFront);
    let rightVec = leaderHeading.copy().rotate(PI / 2).mult(side * row * spacingSide);

    let targetPos = p5.Vector.add(leader.pos, backVec);
    targetPos.add(rightVec);

    if (Vehicle.debug) {
      push();
      stroke(0, 255, 255);
      strokeWeight(1);
      drawingContext.setLineDash([3, 3]);
      line(this.pos.x, this.pos.y, targetPos.x, targetPos.y);
      drawingContext.setLineDash([]);
      fill(0, 255, 255);
      noStroke();
      circle(targetPos.x, targetPos.y, 6);
      pop();
    }

    // "Arrive" permet de freiner et de se caler précisément à la bonne place sans trembler
    return this.arrive(targetPos);
  }

  boundaries() {
    let d = (typeof params !== 'undefined') ? params.boundariesDist : 50;
    let desired = null;

    if (this.pos.x < d) {
      desired = createVector(this.maxSpeed, this.vel.y);
    } else if (this.pos.x > width - d) {
      desired = createVector(-this.maxSpeed, this.vel.y);
    }
    if (this.pos.y < d) {
      desired = createVector(this.vel.x, this.maxSpeed);
    } else if (this.pos.y > height - d) {
      desired = createVector(this.vel.x, -this.maxSpeed);
    }

    if (desired !== null) {
      desired.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector(0, 0);
  }
}
