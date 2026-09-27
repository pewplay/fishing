// ----
// Game
// ----

(function () {
  let gameOver = false;

  // --------------
  // Animation loop
  // --------------

  function animationLoop() {
    if (!gameOver) {
      indicator.updatePosition();
      indicator.detectCollision();
      progressBar.updateUi();
      progressBar.detectGameEnd();
      fish.updateFishPosition();
      requestAnimationFrame(animationLoop);
    }
  }

  // ---------
  // Indicator
  // ---------

  class Indicator {
    constructor() {
      this.indicator = document.querySelector('.indicator');
      this.height = this.indicator.clientHeight;
      this.y = 0;
      this.velocity = 0;
      this.acceleration = 0;
      this.topBounds = gameBody.clientHeight * -1 + 48;
      this.bottomBounds = 0;
    }

    applyForce(force) {
      this.acceleration += force;
    }

    updatePosition() {
      this.velocity += this.acceleration;
      this.y += this.velocity;

      //  Reset acceleration
      indicator.acceleration = 0;

      // Change direction when hitting the bottom + add friction
      if (this.y > this.bottomBounds) {
        this.y = 0;
        this.velocity *= 0.5;
        this.velocity *= -1;
      }

      // Prevent from going beyond the top
      // Don't apply button forces when beyond the top
      // console.log(indicator.y, this.topBounds);
      if (indicator.y < this.topBounds) {
        indicator.y = this.topBounds;
        indicator.velocity = 0;
      } else {
        if (keyPressed) {
          indicator.applyForce(-0.5);
        }
      }

      // Apply constant force
      indicator.applyForce(0.3);

      // Update object position
      this.indicator.style.transform = `translateY(${this.y}px)`;
    }

    detectCollision() {
      if (
      fish.y < this.y && fish.y > this.y - this.height ||
      fish.y - fish.height < this.y && fish.y - fish.height > this.y - this.height)
      {
        progressBar.fill();
        document.body.classList.add('collision');
      } else {
        progressBar.drain();
        document.body.classList.remove('collision');
      }
    }}


  // ----
  // Fish
  // ----

  class Fish {
    constructor() {
      this.fish = document.querySelector('.fish');
      this.height = this.fish.clientHeight;
      this.y = 5;
      this.direction = null;
      this.randomPosition = null;
      this.randomCountdown = null;
      this.speed = 2;
    }

    resetPosition() {
      this.y = 5;
    }

    updateFishPosition() {
      if (!this.randomPosition || this.randomCountdown < 0) {
        this.randomPosition = Math.ceil(Math.random() * (gameBody.clientHeight - this.height)) * -1;
        this.randomCountdown = Math.abs(this.y - this.randomPosition);
        this.speed = Math.abs(Math.random() * (3 - 1) + 1);
      };

      if (this.randomPosition < this.y) {
        this.y -= this.speed;
      } else {
        this.y += this.speed;
      }

      this.fish.style.transform = `translateY(${this.y}px)`;
      this.randomCountdown -= this.speed;
    }}


  // ------------
  // Progress bar
  // ------------

  class ProgressBar {
    constructor() {
      this.wrapper = document.querySelector('.progress-bar');
      this.progressBar = this.wrapper.querySelector('.progress-gradient-wrapper');
      this.progress = 50;
    }

    reset() {
      this.progress = 50;
    }

    drain() {
      if (this.progress > 0) this.progress -= 0.4;
      if (this.progress < 1) this.progress = 0;
    }

    fill() {
      if (this.progress < 100) this.progress += 0.3;
    }

    detectGameEnd() {
      if (this.progress >= 100) {
        playSuccess();

        gameOver = true;
      }
    }

    updateUi() {
      this.progressBar.style.height = `${this.progress}%`;
    }}


  // -----------
  // Application
  // -----------

  const gameBody = document.querySelector('.game-body');
  let keyPressed = false;
  const indicator = new Indicator();
  const progressBar = new ProgressBar();
  const fish = new Fish();

  // ------------
  // Mouse events
  // ------------

  // Pointer events cover mouse, touch and pen
  window.addEventListener('pointerdown', indicatorActive);
  window.addEventListener('pointerup', indicatorInactive);
  window.addEventListener('pointercancel', indicatorInactive);
  window.addEventListener('blur', indicatorInactive);
  window.addEventListener('keydown', indicatorActive);
  window.addEventListener('keyup', indicatorInactive);

  function indicatorActive() {
    if (!keyPressed) {
      keyPressed = true;
      document.body.classList.add('indicator-active');
    }
  }

  function indicatorInactive() {
    if (keyPressed) {
      keyPressed = false;
      document.body.classList.remove('indicator-active');
    }
  }

  // ----------
  // Reset game
  // ----------

  const niceCatch = document.querySelector('.nice-catch');
  const perfect = document.querySelector('.perfect');
  const successButton = document.querySelector('.success');
  const game = document.querySelector('.game');
  successButton.addEventListener('click', resetGame);

  function resetGame() {
    if (!gameOver) return;
    successAnimations.forEach(animation => animation.cancel());
    successAnimations = [];
    progressBar.reset();
    fish.resetPosition();

    successButton.removeAttribute('style');
    niceCatch.removeAttribute('style');
    perfect.removeAttribute('style');
    game.removeAttribute('style');

    gameOver = false;
    animationLoop();
  }

  // ----------------
  // Success timeline
  // ----------------
  // (Web Animations API, same timing and easing as the original GSAP timeline)

  let successAnimations = [];
  const power3Out = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
  const power1Out = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  // Elastic.easeOut.config(1, 0.3) sampled into keyframes
  function elasticFrames(from, steps = 60) {
    const period = 0.3;
    const frames = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const e = t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - period / 4) * (2 * Math.PI) / period) + 1;
      frames.push({ transform: `rotateX(${from * (1 - e)}deg)` });
    }
    return frames;
  }

  function playSuccess() {
    successButton.style.display = 'flex';
    successAnimations = [
      game.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: power1Out, fill: 'forwards' }),
      successButton.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 200, easing: power3Out, fill: 'both' }),
      niceCatch.animate([{ transform: 'translateY(50px)' }, { transform: 'translateY(0)' }], { duration: 500, delay: 200, easing: power3Out, fill: 'both' }),
      perfect.animate(elasticFrames(-90), { duration: 3000, delay: 900, fill: 'both' })
    ];
  }

  // -------------
  // Initiate loop
  // -------------

  animationLoop();

})();

// -------
// Seaweed
// -------

(function () {
  let seaweed = [];
  const canvas = document.querySelector('[data-element="seaweed"]');
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  const context = canvas.getContext('2d');

  function animationLoop() {
    clearCanvas();
    seaweed.forEach(seaweed => seaweed.draw());

    requestAnimationFrame(animationLoop);
  }

  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  class Seaweed {
    constructor(segments, spread, xoff) {
      this.segments = segments;
      this.segmentSpread = spread;
      this.x = 0;
      this.xoff = xoff;
      this.y = 0;
      this.radius = 1;
      this.sin = Math.random() * 10;
    }

    draw() {
      context.beginPath();
      context.strokeStyle = "#143e5a";
      context.fillStyle = "#143e5a";
      context.lineWidth = 2;
      for (let i = this.segments; i >= 0; i--) {
        if (i === this.segments) {
          context.moveTo(
          Math.sin(this.sin + i) * i / 2.5 + this.xoff,
          canvas.height + -i * this.segmentSpread);

        } else {
          context.lineTo(
          Math.sin(this.sin + i) * i / 2.5 + this.xoff,
          canvas.height + -i * this.segmentSpread);

        }
        // context.arc(Math.sin(this.sin + i) * 10 + 30, this.y + (this.segmentSpread * i), this.radius, 0, 2*Math.PI); 
      }
      context.stroke();

      this.sin += 0.05;
    }}


  seaweed.push(new Seaweed(6, 8, 25));
  seaweed.push(new Seaweed(8, 10, 35));
  seaweed.push(new Seaweed(4, 8, 45));

  animationLoop();
})();

// -----------------
// Reel line tension
// -----------------

(function () {
  let line = null;
  const canvas = document.querySelector('[data-element="reel-line-tension"]');
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  const context = canvas.getContext('2d');

  function animationLoop() {
    clearCanvas();
    line.draw();
    line.animate();

    requestAnimationFrame(animationLoop);
  }

  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  class Line {
    constructor() {
      this.tension = 0;
      this.tensionDirection = 'right';
    }

    draw() {
      context.beginPath();
      context.strokeStyle = "#18343d";
      context.lineWidth = 1.3;
      context.moveTo(canvas.width, 0);
      context.bezierCurveTo(
      canvas.width, canvas.height / 2 + this.tension,
      canvas.width / 2, canvas.height + this.tension,
      0, canvas.height);

      context.stroke();
    }

    animate() {
      if (document.body.classList.contains('collision')) {
        if (this.tension > -30) this.tension -= 8;
      } else {
        if (this.tension < 0) this.tension += 4;
      }
    }}


  line = new Line();
  animationLoop();
})();

// -------
// Bubbles
// -------

(function () {
  let bubbles = {};
  let bubblesCreated = 0;
  const canvas = document.querySelector('[data-element="bubbles"]');
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  const context = canvas.getContext('2d');

  function animationLoop() {
    clearCanvas();
    Object.keys(bubbles).forEach(bubble => bubbles[bubble].draw());

    requestAnimationFrame(animationLoop);
  }

  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  class Bubble {
    constructor() {
      this.index = Object.keys(bubbles).length;
      this.radius = Math.random() * (6 - 2) + 2;
      this.y = canvas.height + this.radius;
      this.x = canvas.width * Math.random() - this.radius;
      this.sin = this.style > 0.5 ? 0 : 5;
      this.style = Math.random();
      this.childAdded = false;
      this.speed = 1;
      this.sway = Math.random() * (0.03 - 0.01) + 0.01;
      this.swayDistance = Math.random() * (canvas.width - canvas.width / 2) + canvas.width / 2;
    }

    draw() {
      context.beginPath();
      context.strokeStyle = "#abe2f9";
      context.lineWidth = 2;
      context.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, 2 * Math.PI);
      context.stroke();
      this.x = Math.sin(this.sin) * this.swayDistance + this.swayDistance - this.radius;
      this.sin += this.sway;
      this.y -= this.speed;

      if (this.y + this.radius < 0) {
        delete bubbles[this.index];
      }

      if (this.y < canvas.height * 0.6) {
        if (!this.childAdded) {
          bubbles[bubblesCreated] = new Bubble();
          bubblesCreated++;
          this.childAdded = true;
        }
      }
    }}


  bubbles[bubblesCreated] = new Bubble();
  bubblesCreated++;

  animationLoop();
})();