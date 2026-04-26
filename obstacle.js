class Obstacle {
  constructor(x, y, w, h, type) {
    this.pos = createVector(x, y);
    this.w = w;
    this.h = h;
    // Vehicle.avoid() expects a circular `r` on every obstacle. Use the
    // half-extent of the larger side so we never miss the lateral overlap
    // check, regardless of the agent's heading.
    this.r = Math.max(w, h) / 2;
    this.type = type; // 'LOW' (rock), 'HIGH' (bridge), 'WALL' (border)
    this.speed = 3; // Scroll speed (river moving down)

    // Pre-calculate grass tufts for walls to prevent flickering
    if (this.type === 'WALL') {
      this.tufts = [];
      for (let i = 0; i < 5; i++) {
        this.tufts.push({
          x: random(-this.w / 3, this.w / 3),
          y: random(-this.h / 3, this.h / 3),
          size: random(5, 12)
        });
      }
    }
  }

  update() {
    this.pos.y += this.speed;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    if (this.type === 'WALL') {
      // Dark green river banks
      fill(20, 60, 20);
      rectMode(CENTER);
      rect(0, 0, this.w, this.h);
      
      // Stable Grass Tufts
      stroke(40, 100, 40);
      strokeWeight(2);
      noFill();
      if (this.tufts) {
        for (let t of this.tufts) {
          // Draw a little 'v' shape for grass tuft
          line(t.x, t.y, t.x - t.size/2, t.y - t.size);
          line(t.x, t.y, t.x + t.size/2, t.y - t.size);
        }
      }
      noStroke();
    } else if (this.type === 'LOW') {
      // Rugged Vector Rock
      noStroke();
      fill(80, 85, 90); // Slate Grey
      
      // Draw a jagged boulder shape
      beginShape();
      vertex(-this.w/2, -this.h/4);
      vertex(-this.w/4, -this.h/2);
      vertex(this.w/4, -this.h/2.5);
      vertex(this.w/2, -this.h/5);
      vertex(this.w/2.2, this.h/3);
      vertex(this.w/4, this.h/2);
      vertex(-this.w/4, this.h/2.2);
      vertex(-this.w/2, this.h/4);
      endShape(CLOSE);

      // Highlights on the edges
      fill(120, 125, 130, 150);
      beginShape();
      vertex(-this.w/3, -this.h/3);
      vertex(-this.w/5, -this.h/2.2);
      vertex(0, -this.h/3);
      endShape(CLOSE);

      // Mossy spots
      fill(40, 100, 40, 180);
      ellipse(-this.w/5, this.h/4, this.w/4, this.h/6);
      ellipse(this.w/4, -this.h/8, this.w/5, this.h/8);
    } else if (this.type === 'HIGH') {
      // Vector Log
      rectMode(CENTER);
      fill(80, 50, 20);
      stroke(60, 30, 10);
      strokeWeight(2);
      rect(0, 0, this.w, this.h, 10);
      // Bark textures
      noStroke();
      fill(60, 30, 10, 100);
      rect(0, -this.h/4, this.w * 0.8, 2);
      rect(0, this.h/4, this.w * 0.8, 2);
      // End rings
      fill(120, 90, 60);
      ellipse(-this.w/2, 0, 10, this.h);
      ellipse(this.w/2, 0, 10, this.h);
    }
    pop();
  }
}
