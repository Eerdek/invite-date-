// ---------------------------------------------------------------------------
// Animated string-art heart (canvas): straight lines radiating to a glowing
// core, drawn one by one, then gently pulsing forever.
// ---------------------------------------------------------------------------
// Reassigned below if the canvas exists — let the page drive the heart.
let replayHeart = function () {};
let heartExcite = function () {};
let heartCalm = function () {};
let heartSkip = function () {};
let heartBloom = function () {};

const heartCanvas = document.getElementById("heartCanvas");
if (heartCanvas) {
  const ctx = heartCanvas.getContext("2d");
  const TOTAL = 260; // number of radiating strings
  const DRAW_MS = 2800; // time for the heart to finish drawing

  // Classic heart curve, sampled once (scale-independent).
  const points = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < TOTAL; i++) {
    const t = (i / TOTAL) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    points.push({ x, y });
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const curveW = maxX - minX;
  const curveH = maxY - minY;
  const curveCX = (minX + maxX) / 2;
  const curveCY = (minY + maxY) / 2;

  let size = 0;
  let scale = 1;

  function resize() {
    // Respect height too, so the heart never dominates short / landscape screens.
    size = Math.min(window.innerWidth * 0.82, window.innerHeight * 0.5, 440);
    const dpr = window.devicePixelRatio || 1;
    heartCanvas.width = size * dpr;
    heartCanvas.height = size * dpr;
    heartCanvas.style.width = size + "px";
    heartCanvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = (size * 0.84) / Math.max(curveW, curveH);
  }
  resize();
  window.addEventListener("resize", resize);

  let startTs = null;
  let lastTs = null;

  // Interactive state — the heart reacts to the buttons.
  let excitement = 0;       // 0 calm → 1 smitten (faster beat, brighter)
  let excitementTarget = 0;
  let beatScale = 0;        // transient thump on every beat
  let skip = 0;             // transient contraction when "No" runs away
  let lastBeat = 0;
  let bloomStart = null;    // set on "Yes" — the heart blooms open
  let bloomRequested = false;
  const rings = [];         // pulse rings emanating on each beat

  // Embers that drift up from the glowing core once the heart is drawn.
  const sparks = [];
  function spawnSpark() {
    sparks.push({
      x: (Math.random() - 0.5) * size * 0.06,
      y: 0,
      vx: (Math.random() - 0.5) * 0.7,
      vy: -0.8 - Math.random() * 1.3,
      life: 0,
      ttl: 50 + Math.random() * 70,
      r: 0.8 + Math.random() * 1.8,
    });
  }

  // Trace the heart outline at a given scale around the centre.
  function heartPath(cx, cy, s) {
    ctx.beginPath();
    for (let i = 0; i <= TOTAL; i++) {
      const p = points[i % TOTAL];
      const x = cx + (p.x - curveCX) * s;
      const y = cy - (p.y - curveCY) * s;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function draw(ts) {
    if (startTs === null) {
      startTs = ts;
      lastTs = ts;
      lastBeat = ts;
    }
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;

    const progress = Math.min(1, (ts - startTs) / DRAW_MS);

    // Ease excitement; decay the transient thump/skip.
    excitement += (excitementTarget - excitement) * Math.min(1, dt * 4);
    beatScale += (0 - beatScale) * Math.min(1, dt * 7);
    skip += (0 - skip) * Math.min(1, dt * 6);

    // Heartbeat — quicker the more excited it is.
    const beatPeriod = 980 - excitement * 470;
    if (progress > 0.8 && ts - lastBeat >= beatPeriod) {
      lastBeat = ts;
      beatScale = 0.1 + excitement * 0.13;
      rings.push({ t: ts });
    }

    // Bloom on "Yes".
    if (bloomRequested && bloomStart === null) {
      bloomStart = ts;
      bloomRequested = false;
    }
    let bloomScale = 1;
    let flash = 0;
    if (bloomStart !== null) {
      const bt = Math.min(1, (ts - bloomStart) / 850);
      bloomScale = 1 + 0.32 * Math.sin(bt * Math.PI * 0.5);
      flash = Math.sin(bt * Math.PI) * 0.95;
    }

    const breath = 1 + 0.05 * Math.sin(ts / 360);
    const flicker = 0.82 + 0.18 * Math.sin(ts / 90) * Math.sin(ts / 47);
    const bright = (1 - skip * 0.45) * (1 + excitement * 0.25 + flash);

    const cx = size / 2;
    const cy = size / 2;
    const s = scale * breath * (1 + beatScale - skip * 0.16) * bloomScale;
    const fx = cx + (0 - curveCX) * s;
    const fy = cy - (0 - curveCY) * s;
    const px = (p) => cx + (p.x - curveCX) * s;
    const py = (p) => cy - (p.y - curveCY) * s;

    ctx.clearRect(0, 0, size, size);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // --- Inner radiating strings ---
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    const stringProg = Math.min(1, Math.max(0, progress - 0.2) / 0.8);
    const drawn = Math.floor(stringProg * TOTAL);
    for (let i = 0; i < drawn; i++) {
      const bx = px(points[i]);
      const by = py(points[i]);
      const shimmer = (0.85 + 0.15 * Math.sin(ts / 280 + i * 0.4)) * bright;
      const grad = ctx.createLinearGradient(fx, fy, bx, by);
      grad.addColorStop(0, `rgba(255, 250, 235, ${0.95 * shimmer})`);
      grad.addColorStop(0.2, `rgba(255, 150, 70, ${0.85 * shimmer})`);
      grad.addColorStop(0.6, `rgba(255, 75, 115, ${0.55 * shimmer})`);
      grad.addColorStop(1, `rgba(255, 55, 105, ${0.38 * shimmer})`);
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // --- Glowing outline ---
    const outCount = Math.floor(Math.min(1, progress / 0.5) * TOTAL);
    if (outCount > 1) {
      ctx.beginPath();
      ctx.moveTo(px(points[0]), py(points[0]));
      for (let i = 1; i < outCount; i++) ctx.lineTo(px(points[i]), py(points[i]));
      if (progress >= 0.5) ctx.lineTo(px(points[0]), py(points[0]));
      ctx.shadowColor = "rgba(255, 60, 110, 0.95)";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = `rgba(255, 80, 130, ${Math.min(1, 0.9 * bright)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(255, 240, 248, ${Math.min(1, 0.95 * bright)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // --- Pulse rings rippling outward on each beat ---
    for (let i = rings.length - 1; i >= 0; i--) {
      const age = (ts - rings[i].t) / 1150;
      if (age >= 1) {
        rings.splice(i, 1);
        continue;
      }
      const rs = scale * breath * (1 + age * 0.9);
      ctx.globalAlpha = (1 - age) * 0.4;
      ctx.strokeStyle = "rgba(255, 90, 140, 1)";
      ctx.lineWidth = 2;
      heartPath(cx, cy, rs);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // --- Drifting embers (more when excited) ---
    if (progress > 0.55 && Math.random() < 0.6 + excitement * 0.6) spawnSpark();
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.life++;
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy *= 0.99;
      if (sp.life > sp.ttl) {
        sparks.splice(i, 1);
        continue;
      }
      const a = 1 - sp.life / sp.ttl;
      ctx.fillStyle = `rgba(255, ${200 + Math.floor(40 * a)}, 150, ${a})`;
      ctx.beginPath();
      ctx.arc(fx + sp.x, fy + sp.y, sp.r * a + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Glowing hot core ---
    const coreR =
      size * 0.17 * breath * flicker * (1 + excitement * 0.3 + beatScale * 0.6) * bloomScale;
    const core = ctx.createRadialGradient(fx, fy, 0, fx, fy, coreR);
    core.addColorStop(0, "rgba(255, 252, 240, 0.98)");
    core.addColorStop(0.3, `rgba(255, 180, 70, ${Math.min(1, 0.75 * flicker + flash)})`);
    core.addColorStop(0.65, "rgba(255, 95, 60, 0.34)");
    core.addColorStop(1, "rgba(255, 60, 40, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(fx, fy, coreR, 0, Math.PI * 2);
    ctx.fill();

    // --- White flash overlay during the bloom ---
    if (flash > 0.01) {
      const fr = size * 0.5 * bloomScale;
      const fl = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fl.addColorStop(0, `rgba(255, 255, 255, ${flash})`);
      fl.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  replayHeart = function () {
    startTs = null;
    sparks.length = 0;
    rings.length = 0;
    bloomStart = null;
    bloomRequested = false;
    excitement = 0;
    excitementTarget = 0;
  };
  heartExcite = function () {
    excitementTarget = 1;
  };
  heartCalm = function () {
    excitementTarget = 0;
  };
  heartSkip = function () {
    skip = 1;
  };
  heartBloom = function () {
    bloomRequested = true;
  };

  requestAnimationFrame(draw);
}

// ---------------------------------------------------------------------------
// Index page: the proposal with the un-clickable "No"
// ---------------------------------------------------------------------------
const proposalForm = document.getElementById("proposalForm");

if (proposalForm) {
  const heading = document.getElementById("proposalHeading");
  const usernameField = document.getElementById("username");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");

  // Custom in-page name prompt (no native prompt() dialog)
  const nameModal = document.getElementById("nameModal");
  const nameCard = document.getElementById("nameCard");
  const nameInput = document.getElementById("nameInput");

  nameInput.focus();

  nameCard.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = nameInput.value.trim();

    if (name === "") {
      // Nudge the empty field instead of letting them through.
      nameInput.classList.remove("shake");
      void nameInput.offsetWidth; // restart the animation
      nameInput.classList.add("shake");
      nameInput.focus();
      return;
    }

    usernameField.value = name;
    heading.innerText = `${name}, do you want to go out with me?`;
    nameModal.classList.add("hidden");
    replayHeart(); // replay the draw-in once the heart is actually visible
    // Unlock audio on this click gesture so later heartbeats can play.
    ensureAudio();
    if (heartAudioCtx) heartAudioCtx.resume();
  });

  // Escalating pleas. We walk through these once and STAY on the last one —
  // no looping back to the start (that was the repeating-text bug).
  const pleas = [
    "Are you sure? 🥺",
    "Really, really sure??",
    "Think about it again!",
    "You might regret this...",
    "Give me one chance? 🌹",
    "My heart can't take a no 💔",
    "Pretty please? 🙏",
    "I'll cry, I swear 😭",
    "The 'No' button is broken anyway 😏",
    "Just say yes already! ❤️",
  ];

  let yesScale = 1;
  let noScale = 1;
  let pleaIndex = 0;

  // Grow "Yes", shrink + teleport "No", and advance the plea (clamped).
  function dodge() {
    // Cap the "Yes" growth tighter on small screens so a runaway 2.4× button
    // can't spill past the viewport (it was a source of stray scrollbars).
    const yesCap = window.innerWidth < 480 ? 1.7 : 2.4;
    yesScale = Math.min(yesCap, yesScale + 0.12);
    yesBtn.style.transform = `scale(${yesScale})`;

    noScale = Math.max(0.5, noScale - 0.07);

    // Clamp to the last plea so the text never repeats from the top.
    heading.innerText = pleas[Math.min(pleaIndex, pleas.length - 1)];
    pleaIndex++;

    // Pin "No" to the viewport, then drop it somewhere fully inside. We measure
    // its already-scaled box (transform-origin is top-left via CSS) and keep a
    // margin, so it can never poke past an edge and create a scrollbar — even
    // on mobile, where visualViewport gives the true visible size.
    noBtn.style.position = "fixed";
    noBtn.style.transform = `scale(${noScale})`;

    const vw = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const rect = noBtn.getBoundingClientRect();
    const margin = 10;
    const maxX = Math.max(margin, vw - rect.width - margin);
    const maxY = Math.max(margin, vh - rect.height - margin);
    noBtn.style.left = `${margin + Math.random() * (maxX - margin)}px`;
    noBtn.style.top = `${margin + Math.random() * (maxY - margin)}px`;

    heartSkip(); // the heart skips a beat when "No" runs away
  }

  noBtn.addEventListener("mouseover", dodge);
  noBtn.addEventListener("click", dodge);
  // Touch devices can't hover, so flee on the first touch instead.
  noBtn.addEventListener("touchstart", function (event) {
    event.preventDefault();
    dodge();
  });

  // --- Soft heartbeat audio (Web Audio) ---
  let heartAudioCtx = null;
  let heartMaster = null;
  let heartbeatTimer = null;
  function ensureAudio() {
    if (heartAudioCtx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      heartAudioCtx = new AC();
      heartMaster = heartAudioCtx.createGain();
      heartMaster.gain.value = 0;
      heartMaster.connect(heartAudioCtx.destination);
    } catch (e) {
      heartAudioCtx = null;
    }
  }
  function thump(freq, t, dur, vol) {
    const o = heartAudioCtx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = heartAudioCtx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(heartMaster);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function startHeartAudio() {
    ensureAudio();
    if (!heartAudioCtx || heartbeatTimer) return;
    heartMaster.gain.setTargetAtTime(0.06, heartAudioCtx.currentTime, 0.1);
    const beat = () => {
      const t = heartAudioCtx.currentTime;
      thump(68, t, 0.18, 0.9); // lub
      thump(54, t + 0.16, 0.22, 0.7); // dub
    };
    beat();
    heartbeatTimer = setInterval(beat, 520);
  }
  function stopHeartAudio() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (heartMaster) heartMaster.gain.setTargetAtTime(0, heartAudioCtx.currentTime, 0.15);
  }
  function playBloomChime() {
    ensureAudio();
    if (!heartAudioCtx) return;
    heartMaster.gain.setTargetAtTime(0.08, heartAudioCtx.currentTime, 0.05);
    [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => {
      const o = heartAudioCtx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const g = heartAudioCtx.createGain();
      const t = heartAudioCtx.currentTime + i * 0.08;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.45, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g);
      g.connect(heartMaster);
      o.start(t);
      o.stop(t + 0.55);
    });
  }

  // The heart reacts to the buttons: smitten near "Yes".
  yesBtn.addEventListener("mouseenter", () => {
    heartExcite();
    startHeartAudio();
  });
  yesBtn.addEventListener("mouseleave", () => {
    heartCalm();
    stopHeartAudio();
  });

  // Burst of hearts on "Yes", then continue to the plan page.
  function burstHearts() {
    const emojis = ["❤️", "💕", "💖", "💗", "💞", "💘"];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "burst-heart";
      el.textContent = emojis[i % emojis.length];
      const angle = (i / count) * Math.PI * 2;
      const dist = 140 + Math.random() * 200;
      el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      el.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      el.style.fontSize = `${1.8 + Math.random() * 2}rem`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    }
  }

  proposalForm.addEventListener("submit", function (event) {
    // Only "Yes" can submit (No is type="button"). Bloom, then go.
    event.preventDefault();
    heartBloom();
    stopHeartAudio();
    playBloomChime();
    burstHearts();
    setTimeout(() => proposalForm.submit(), 900); // let the bloom play
  });
}

// ---------------------------------------------------------------------------
// Yes page: don't let them pick a date in the past
// ---------------------------------------------------------------------------
const dateInput = document.getElementById("dateInput");
if (dateInput) {
  dateInput.min = new Date().toISOString().split("T")[0];
}

// Activity field grows downward onto new ruled lines instead of scrolling.
const activityInput = document.getElementById("activityInput");
if (activityInput) {
  const grow = () => {
    activityInput.style.height = "auto";
    activityInput.style.height = `${activityInput.scrollHeight}px`;
  };
  activityInput.addEventListener("input", grow);
  grow();
}

// ---------------------------------------------------------------------------
// Cinematic send-off journey — the whole world is painted on a <canvas>
// (sky, stars, moon, shooting star, parallax mountains/hills/trees/sea,
//  petal & heart particles, and a camera zoom-out on arrival).
// ---------------------------------------------------------------------------
function createJourneyScene(canvas) {
  const ctx = canvas.getContext("2d");
  const DURATION = 7000;

  let W = 0, H = 0;
  let stars = [];
  let petals = [];
  let layers = [];
  let raf = null;
  let t0 = null, lastTs = null;
  let progress = 0, arrived = false;
  let zoom = 1;
  let shootStart = null;

  function buildLayers() {
    layers = [
      { type: "mtn", base: H * 0.66, color: "#43285c", amp: H * 0.12, period: 280, speed: 14, off: 0 },
      { type: "mtn", base: H * 0.74, color: "#5a2a4e", amp: H * 0.16, period: 210, speed: 24, off: 0 },
      { type: "hill", base: H * 0.82, color: "#3a2240", amp: H * 0.09, period: 150, speed: 40, off: 0 },
      { type: "tree", base: H * 0.88, color: "#1f3320", amp: 0, period: 46, speed: 75, off: 0 },
      { type: "sea", base: H * 0.93, color: "#26407a", amp: 9, period: 70, speed: 130, off: 0 },
    ];
  }

  function seedStars() {
    stars = [];
    const n = Math.round(W / 11);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.55,
        r: Math.random() * 1.4 + 0.3,
        ph: Math.random() * 6.28,
        sp: 1 + Math.random() * 2,
      });
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLayers();
    seedStars();
  }

  // colour helpers (top→bottom gradient stops for each time of day)
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
  const DUSK = [[58, 17, 64], [122, 35, 71], [194, 91, 110], [255, 202, 160]];
  const NIGHT = [[7, 4, 22], [26, 11, 51], [61, 22, 64], [94, 42, 68]];
  const DAWN = [[42, 17, 69], [138, 58, 94], [255, 154, 118], [255, 217, 160]];
  const bell = (x) => Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, x))));

  function skyColor(stop, nAmt, dAmt) {
    let c = mix(DUSK[stop], NIGHT[stop], nAmt);
    c = mix(c, DAWN[stop], dAmt);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function drawSky(p) {
    const nAmt = bell((p - 0.05) / 0.7);
    const dAmt = Math.max(0, (p - 0.72) / 0.28);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, skyColor(0, nAmt, dAmt));
    g.addColorStop(0.45, skyColor(1, nAmt, dAmt));
    g.addColorStop(0.72, skyColor(2, nAmt, dAmt));
    g.addColorStop(1, skyColor(3, nAmt, dAmt));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return nAmt;
  }

  function drawStars(ts, nAmt) {
    if (nAmt <= 0.02) return;
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(ts * 0.001 * s.sp + s.ph);
      ctx.globalAlpha = nAmt * tw * 0.9;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMoon(p, nAmt) {
    if (nAmt <= 0.02) return;
    const x = W * 0.82;
    const y = H * 0.18 - bell(p) * H * 0.04;
    const r = Math.min(W, H) * 0.05;
    ctx.save();
    ctx.globalAlpha = nAmt;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    gg.addColorStop(0, "rgba(255,235,190,0.55)");
    gg.addColorStop(1, "rgba(255,235,190,0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = "#ffe9b0";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x + r * 0.5, y - r * 0.3, r * 0.95, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  function drawShooting(ts, p) {
    if (!shootStart && p > 0.3 && p < 0.55) shootStart = ts;
    if (!shootStart) return;
    const e = (ts - shootStart) / 1100;
    if (e > 1) return;
    const sx = W * 0.05 + e * W * 0.82;
    const sy = H * 0.12 + e * H * 0.22;
    const len = 150;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - e) * (e < 0.1 ? e / 0.1 : 1);
    const grad = ctx.createLinearGradient(sx - len, sy - len * 0.3, sx, sy);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx - len, sy - len * 0.3);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.restore();
  }

  function drawLayer(L, dt) {
    if (!arrived) L.off = (L.off + L.speed * dt) % L.period;
    ctx.fillStyle = L.color;
    if (L.type === "sea") {
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, L.base);
      for (let x = 0; x <= W; x += 6) {
        ctx.lineTo(x, L.base + Math.sin((x + L.off) / L.period * 6.2832) * L.amp);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    } else if (L.type === "tree") {
      ctx.fillRect(0, L.base, W, H - L.base);
      ctx.beginPath();
      for (let x = -L.period; x < W + L.period; x += L.period) {
        const tx = x - L.off;
        const tw = L.period * 0.55;
        const th = L.period * 0.75;
        ctx.moveTo(tx, L.base);
        ctx.lineTo(tx + tw / 2, L.base - th);
        ctx.lineTo(tx + tw, L.base);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, L.base);
      for (let x = -L.period; x <= W + L.period; x += L.period) {
        const px = x - L.off;
        ctx.lineTo(px + L.period / 2, L.base - L.amp);
        ctx.lineTo(px + L.period, L.base);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawHeart(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(s * 0.5, -s * 0.3, s, s * 0.3, 0, s);
    ctx.bezierCurveTo(-s, s * 0.3, -s * 0.5, -s * 0.3, 0, s * 0.3);
    ctx.fill();
  }

  function spawnPetal() {
    petals.push({
      x: Math.random() * W,
      y: -20,
      vx: (Math.random() - 0.3) * 24,
      vy: 22 + Math.random() * 34,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 3,
      size: 6 + Math.random() * 8,
      heart: Math.random() < 0.45,
    });
  }

  function drawPetals(dt) {
    if (!arrived && Math.random() < dt * 9) spawnPetal();
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vx += Math.sin(p.y * 0.01) * 5 * dt;
      if (p.y > H + 24) {
        petals.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.85;
      if (p.heart) {
        ctx.fillStyle = "#ff5c8a";
        drawHeart(p.size);
      } else {
        ctx.fillStyle = "#ffb6d5";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    if (t0 === null) {
      t0 = ts;
      lastTs = ts;
    }
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;

    progress = arrived ? 1 : Math.min(1, (ts - t0) / DURATION);
    // Pull back from 1.1 → 1.0 on arrival. Staying >= 1.0 means the scene
    // always overfills the viewport, so the zoom never reveals empty edges.
    const zoomTarget = arrived ? 1.0 : 1.1;
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 2.2);

    const nAmt = drawSky(progress);
    drawStars(ts, nAmt);
    drawMoon(progress, nAmt);
    drawShooting(ts, progress);

    // Camera: scenery + particles pull back on arrival
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    for (const L of layers) drawLayer(L, dt);
    drawPetals(dt);
    ctx.restore();

    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();

  return {
    start() {
      t0 = null;
      lastTs = null;
      arrived = false;
      zoom = 1.1; // start slightly pushed in...
      shootStart = null;
      petals = [];
      if (!raf) raf = requestAnimationFrame(frame);
    },
    arrive() {
      arrived = true;
    },
    stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    },
  };
}

// Soft ambient melody (Web Audio) — only after the click, so autoplay is allowed.
let journeyAudio = null;
function startJourneyMusic() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 1.2);

    // a warm pad drone
    const pad = ctx.createOscillator();
    pad.type = "sine";
    pad.frequency.value = 130.81; // C3
    const padGain = ctx.createGain();
    padGain.gain.value = 0.4;
    pad.connect(padGain);
    padGain.connect(master);
    pad.start();

    // a gentle repeating arpeggio
    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880.0, 783.99];
    let step = 0;
    const arp = setInterval(() => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = notes[step % notes.length];
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(master);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.6, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.start(t);
      o.stop(t + 0.75);
      step++;
    }, 600);

    journeyAudio = { ctx, master, pad, arp };
  } catch (e) {
    journeyAudio = null;
  }
}
function stopJourneyMusic() {
  if (!journeyAudio) return;
  const { ctx, master, arp } = journeyAudio;
  clearInterval(arp);
  try {
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 700);
  } catch (e) {
    /* ignore */
  }
  journeyAudio = null;
}

const sentBtn = document.getElementById("sentBtn");
const sealed = document.querySelector(".sealed-letter");
const journey = document.getElementById("journey");

if (sentBtn && sealed && journey) {
  const statusEl = document.getElementById("journeyStatus");
  const openBtn = document.getElementById("openBtn");
  const canvas = document.getElementById("journeyCanvas");
  const scene = canvas ? createJourneyScene(canvas) : null;

  const stages = [
    "Folding the letter…",
    "Sealing the envelope…",
    "A dove takes flight…",
    "Over the mountains…",
    "Through the forests…",
    "Across the wide seas…",
    "Carrying it home to you…",
  ];

  const FOLD_MS = 1100; // fold the letter, then cut to the journey
  const JOURNEY_MS = 7000;
  let timers = [];

  const setStatus = (text) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("cap");
    void statusEl.offsetWidth; // restart the fade
    statusEl.classList.add("cap");
  };

  sentBtn.addEventListener("click", () => {
    sentBtn.disabled = true;
    sealed.classList.remove("reopen");
    sealed.classList.add("folding"); // fold the letter, then flap shuts

    timers.push(
      setTimeout(() => {
        journey.classList.add("show");
        if (scene) scene.start();
        startJourneyMusic();
      }, FOLD_MS)
    );

    let i = 0;
    const tick = () => {
      setStatus(stages[Math.min(i, stages.length - 1)]);
      i++;
    };
    tick();
    const statusTimer = setInterval(tick, 1100);
    timers.push(statusTimer);

    timers.push(
      setTimeout(() => {
        clearInterval(statusTimer);
        journey.classList.add("arrived"); // camera pulls back, dove lands
        if (scene) scene.arrive();
        setStatus("Your letter made it back to you 💕");
        if (openBtn) openBtn.classList.add("show");
      }, FOLD_MS + JOURNEY_MS)
    );
  });

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
      timers = [];
      journey.classList.remove("show", "arrived");
      openBtn.classList.remove("show");
      sealed.classList.remove("folding");
      sealed.classList.add("reopen");
      if (scene) scene.stop();
      stopJourneyMusic();
      sentBtn.disabled = false;
    });
  }
}
