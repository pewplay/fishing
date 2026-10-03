// Fishing Game
// Hold to lift the catch zone, keep the fish inside it and fill the meter.
// The simulation runs on a fixed 60 Hz step so it plays at the same speed on
// every display; the whole scene keeps its original pixel sizes and is scaled
// as a single block to fill the available space.

(function () {
  'use strict';

  // -------
  // Storage
  // -------

  const STORE_PREFIX = 'fishing:';

  function load(key, fallback) {
    try {
      const value = localStorage.getItem(STORE_PREFIX + key);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(STORE_PREFIX + key, String(value));
    } catch (e) { /* storage unavailable: play without saving */ }
  }

  // ---------
  // Elements
  // ---------

  const body = document.body;
  const stageWrap = document.getElementById('stage-wrap');
  const stage = document.getElementById('stage');
  const game = document.querySelector('.game');
  const gameBody = document.querySelector('.game-body');
  const successBox = document.getElementById('success');
  const successText = document.getElementById('success-text');
  const againButton = document.getElementById('again');
  const niceCatch = successBox.querySelector('.nice-catch');
  const perfect = successBox.querySelector('.perfect');
  const statCaught = document.getElementById('stat-caught');
  const statTime = document.getElementById('stat-time');
  const statBest = document.getElementById('stat-best');

  const SCENE_W = 108;
  const SCENE_H = 352;
  const STEP = 1000 / 60;

  let scale = 1;
  let state = 'ready'; // ready | playing | landed
  let keyPressed = false;
  let roundSteps = 0;
  let lowestProgress = 50;
  let caught = parseInt(load('caught', '0'), 10) || 0;
  let bestMs = parseInt(load('best', '0'), 10) || 0;

  // ---------
  // Indicator
  // ---------

  class Indicator {
    constructor() {
      this.el = document.querySelector('.indicator');
      this.height = 46;
      this.y = 0;
      this.velocity = 0;
      this.acceleration = 0;
      this.topBounds = -350 + 48;
      this.bottomBounds = 0;
    }

    reset() {
      this.y = 0;
      this.velocity = 0;
      this.acceleration = 0;
    }

    applyForce(force) {
      this.acceleration += force;
    }

    update() {
      this.velocity += this.acceleration;
      this.y += this.velocity;
      this.acceleration = 0;

      // Bounce off the bottom with friction
      if (this.y > this.bottomBounds) {
        this.y = 0;
        this.velocity *= -0.5;
      }

      // Stop at the top; no lift is applied while pinned there
      if (this.y < this.topBounds) {
        this.y = this.topBounds;
        this.velocity = 0;
      } else if (keyPressed && state === 'playing') {
        this.applyForce(-0.5);
      }

      // Constant sinking force
      this.applyForce(0.3);
    }

    overlaps(fish) {
      return (fish.y < this.y && fish.y > this.y - this.height) ||
        (fish.y - fish.height < this.y && fish.y - fish.height > this.y - this.height);
    }

    render() {
      this.el.style.transform = `translateY(${this.y.toFixed(2)}px)`;
    }
  }

  // ----
  // Fish
  // ----

  class Fish {
    constructor() {
      this.el = document.querySelector('.fish');
      this.height = 17;
      this.y = 5;
      this.target = null;
      this.countdown = 0;
      this.speed = 2;
    }

    reset() {
      this.y = 5;
      this.target = null;
    }

    update() {
      if (this.target === null || this.countdown < 0) {
        this.target = -Math.ceil(Math.random() * (350 - this.height));
        this.countdown = Math.abs(this.y - this.target);
        this.speed = Math.random() * 2 + 1;
      }
      this.y += this.target < this.y ? -this.speed : this.speed;
      this.countdown -= this.speed;
    }

    render() {
      this.el.style.transform = `translateY(${this.y.toFixed(2)}px)`;
    }
  }

  // ------------
  // Progress bar
  // ------------

  class ProgressBar {
    constructor() {
      this.el = document.querySelector('.progress-gradient-wrapper');
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

    render() {
      this.el.style.height = `${Math.min(100, this.progress)}%`;
    }
  }

  const indicator = new Indicator();
  const fish = new Fish();
  const progressBar = new ProgressBar();

  // --------------------------------
  // Decorative canvases (2x logical)
  // --------------------------------

  function makeLayer(selector) {
    const canvas = document.querySelector(selector);
    const layer = {
      canvas,
      ctx: canvas.getContext('2d'),
      w: canvas.offsetWidth * 2,
      h: canvas.offsetHeight * 2,
      fit() {
        // Backing store matches the on-screen size for crisp lines
        const k = scale * (window.devicePixelRatio || 1) / 2;
        canvas.width = Math.max(1, Math.round(layer.w * k));
        canvas.height = Math.max(1, Math.round(layer.h * k));
        layer.ctx.setTransform(canvas.width / layer.w, 0, 0, canvas.height / layer.h, 0, 0);
      },
      clear() {
        layer.ctx.clearRect(0, 0, layer.w, layer.h);
      }
    };
    return layer;
  }

  const seaweedLayer = makeLayer('[data-element="seaweed"]');
  const lineLayer = makeLayer('[data-element="reel-line-tension"]');
  const bubbleLayer = makeLayer('[data-element="bubbles"]');

  // Seaweed
  class Seaweed {
    constructor(segments, spread, xoff) {
      this.segments = segments;
      this.spread = spread;
      this.xoff = xoff;
      this.sin = Math.random() * 10;
    }

    update() {
      this.sin += 0.05;
    }

    draw(L) {
      const c = L.ctx;
      c.beginPath();
      c.strokeStyle = '#143e5a';
      c.lineWidth = 2;
      for (let i = this.segments; i >= 0; i--) {
        const x = Math.sin(this.sin + i) * i / 2.5 + this.xoff;
        const y = L.h - i * this.spread;
        if (i === this.segments) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  const seaweed = [new Seaweed(6, 8, 25), new Seaweed(8, 10, 35), new Seaweed(4, 8, 45)];

  // Line tension
  const line = {
    tension: 0,
    update() {
      if (body.classList.contains('collision')) {
        if (this.tension > -30) this.tension -= 8;
      } else if (this.tension < 0) {
        this.tension += 4;
      }
    },
    draw(L) {
      const c = L.ctx;
      c.beginPath();
      c.strokeStyle = '#18343d';
      c.lineWidth = 1.3;
      c.moveTo(L.w, 0);
      c.bezierCurveTo(L.w, L.h / 2 + this.tension, L.w / 2, L.h + this.tension, 0, L.h);
      c.stroke();
    }
  };

  // Bubbles
  const bubbles = [];

  class Bubble {
    constructor() {
      const W = bubbleLayer.w;
      this.radius = Math.random() * 4 + 2;
      this.y = bubbleLayer.h + this.radius;
      this.sin = Math.random() * Math.PI * 2;
      this.speed = 1;
      this.sway = Math.random() * 0.02 + 0.01;
      this.amp = Math.random() * Math.max(1, W / 2 - this.radius - 3);
      this.x = W / 2;
      this.childAdded = false;
    }

    update() {
      this.x = bubbleLayer.w / 2 + Math.sin(this.sin) * this.amp;
      this.sin += this.sway;
      this.y -= this.speed;
      if (!this.childAdded && this.y < bubbleLayer.h * 0.6) {
        bubbles.push(new Bubble());
        this.childAdded = true;
      }
    }

    draw(L) {
      const c = L.ctx;
      c.beginPath();
      c.strokeStyle = '#abe2f9';
      c.lineWidth = 2;
      c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
      c.stroke();
    }
  }

  bubbles.push(new Bubble());

  // ------
  // Layout
  // ------

  function layout() {
    const rect = stageWrap.getBoundingClientRect();
    const s = Math.max(0.3, Math.min(rect.width / SCENE_W, rect.height / SCENE_H));
    scale = s;
    stage.style.width = `${SCENE_W * s}px`;
    stage.style.height = `${SCENE_H * s}px`;
    game.style.transform = `scale(${s})`;
    seaweedLayer.fit();
    lineLayer.fit();
    bubbleLayer.fit();
  }

  // ----------
  // Simulation
  // ----------

  function step() {
    fish.update();

    if (state === 'playing') {
      roundSteps++;
      indicator.update();
      if (indicator.overlaps(fish)) {
        progressBar.fill();
        body.classList.add('collision');
      } else {
        progressBar.drain();
        body.classList.remove('collision');
        lowestProgress = Math.min(lowestProgress, progressBar.progress);
      }
      if (progressBar.progress >= 100) land();
    } else if (state === 'ready') {
      indicator.update();
    }

    seaweed.forEach(s => s.update());
    line.update();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      bubbles[i].update();
      if (bubbles[i].y + bubbles[i].radius < 0) bubbles.splice(i, 1);
    }
  }

  function render() {
    indicator.render();
    fish.render();
    progressBar.render();

    seaweedLayer.clear();
    seaweed.forEach(s => s.draw(seaweedLayer));
    lineLayer.clear();
    line.draw(lineLayer);
    bubbleLayer.clear();
    bubbles.forEach(b => b.draw(bubbleLayer));

    if (state !== 'landed') statTime.textContent = formatTime(roundSteps * STEP);
  }

  function formatTime(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function updateStats() {
    statCaught.textContent = caught;
    statBest.textContent = bestMs > 0 ? formatTime(bestMs) : '–';
  }

  let last = 0;
  let acc = 0;

  function frame(now) {
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 6) {
      step();
      acc -= STEP;
      n++;
    }
    if (n === 6) acc = 0;
    render();
    requestAnimationFrame(frame);
  }

  // ------------
  // Round states
  // ------------

  function setReady() {
    state = 'ready';
    body.classList.add('is-ready');
  }

  function startPlaying() {
    state = 'playing';
    body.classList.remove('is-ready');
  }

  function land() {
    state = 'landed';
    keyPressed = false;
    body.classList.remove('indicator-active', 'collision');

    const ms = Math.round(roundSteps * STEP);
    const isBest = bestMs === 0 || ms < bestMs;
    caught++;
    save('caught', caught);
    if (isBest) {
      bestMs = ms;
      save('best', bestMs);
    }
    statTime.textContent = formatTime(ms);
    updateStats();

    const clean = lowestProgress >= 40;
    successBox.classList.toggle('no-perfect', !clean);
    successText.innerHTML = `Landed in ${formatTime(ms)}` + (isBest ? ' <span class="new-best">New best time!</span>' : '');
    playSuccess(clean);
  }

  function resetGame() {
    if (state !== 'landed') return;
    successAnimations.forEach(a => a.cancel());
    successAnimations = [];
    successBox.classList.remove('is-visible');
    successBox.removeAttribute('style');
    progressBar.reset();
    fish.reset();
    indicator.reset();
    roundSteps = 0;
    lowestProgress = 50;
    setReady();
  }

  // ----------------
  // Success timeline
  // ----------------

  let successAnimations = [];
  const power3Out = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
  const power1Out = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  // Elastic ease-out sampled into keyframes
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

  function playSuccess(clean) {
    successBox.classList.add('is-visible');
    const scene = stageWrap;
    successAnimations = [
      scene.animate([{ opacity: 1 }, { opacity: 0.12 }], { duration: 200, easing: power1Out, fill: 'forwards' }),
      successBox.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 200, easing: power3Out, fill: 'both' }),
      niceCatch.animate([{ transform: 'translateY(50px)' }, { transform: 'translateY(0)' }], { duration: 500, delay: 200, easing: power3Out, fill: 'both' })
    ];
    if (clean) {
      successAnimations.push(perfect.animate(elasticFrames(-90), { duration: 3000, delay: 900, fill: 'both' }));
    }
    setTimeout(() => { if (state === 'landed') againButton.focus({ preventScroll: true }); }, 300);
  }

  // ------
  // Input
  // ------

  function press() {
    if (state === 'landed') return;
    if (state === 'ready') startPlaying();
    if (!keyPressed) {
      keyPressed = true;
      body.classList.add('indicator-active');
    }
  }

  function release() {
    if (keyPressed) {
      keyPressed = false;
      body.classList.remove('indicator-active');
    }
  }

  window.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button > 0) return;
    if (state === 'landed') return;
    press();
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

  const IGNORED_KEYS = ['Tab', 'Escape', 'Meta', 'Control', 'Alt', 'ContextMenu', 'OS'];

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (IGNORED_KEYS.indexOf(e.key) !== -1 || /^F\d+$/.test(e.key)) return;
    if (state === 'landed') {
      if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        resetGame();
      }
      return;
    }
    if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
    press();
  });
  window.addEventListener('keyup', release);

  successBox.addEventListener('click', resetGame);
  window.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
    last = 0;
    acc = 0;
  });

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 150));
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stageWrap);

  // -----
  // Start
  // -----

  updateStats();
  setReady();
  layout();
  render();
  requestAnimationFrame(frame);
})();
