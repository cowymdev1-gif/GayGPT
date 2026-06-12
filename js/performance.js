/* ═══════════════════════════════════════════════
   js/performance.js — Banana Challenge
   v5: 80% performance effort, 20% static face/vibe
   Caps applied for low-effort performances
═══════════════════════════════════════════════ */

const PerfScanner = (() => {
  const CHALLENGE_DURATION = 5;

  let pose = null;
  let faceMesh = null;
  let camera = null;
  let camStream = null;
  let running = false;
  let capturing = false;
  let done = false;

  const LM = {
    NOSE:0, L_SHOULDER:11, R_SHOULDER:12,
    L_ELBOW:13, R_ELBOW:14, L_WRIST:15, R_WRIST:16,
    L_HIP:23, R_HIP:24, L_KNEE:25, R_KNEE:26, L_ANKLE:27, R_ANKLE:28,
    L_INDEX:19, R_INDEX:20,
  };

  let allFrames = [];
  let smoothedScore = 0;
  let liveScore = 0;

  const scores = {
    handSpd: 0, armExt: 0, body: 0, head: 0,
    enth: 0, drama: 0, faceExpr: 0, mouthMvmt: 0,
    eyeWide: 0, confidence: 0,
  };
  let perfScore = 0;
  let performanceEffort = 0; // 0–1 global effort tracker

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function norm(val, min, max) { return clamp01((val - min) / (max - min)); }
  function dist2D(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* ── Live feedback ──────────────────────────── */
  const PERF_MSGS = [
    'Strong performance commitment detected',
    'Exceptional eyebrow activity observed',
    'Drama index spiking',
    'Gesture energy captured',
    'AI detected hesitation',
    'Performance energy rising',
    'Movement amplitude logged',
    'Expressive commitment analysed',
    'Maximum theatricality detected',
    'Body language coefficient rising',
  ];
  let lastPerfMsg = -1;
  let perfFeedbackTimer = 0;

  function rotateFeedback() {
    perfFeedbackTimer++;
    if (perfFeedbackTimer % 15 !== 0) return;
    let idx;
    do { idx = Math.floor(Math.random() * PERF_MSGS.length); } while (idx === lastPerfMsg);
    lastPerfMsg = idx;
    const el = document.getElementById('perf-live-feedback');
    if (el) {
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
      el.textContent = PERF_MSGS[idx];
    }
  }

  /* ── Pose-based metrics ─────────────────────── */
  function avgVelocity(frames, lmIdx) {
    if (frames.length < 2) return 0;
    let total = 0, count = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i-1].poseLM;
      const b = frames[i].poseLM;
      if (!a || !b || !a[lmIdx] || !b[lmIdx]) continue;
      if (a[lmIdx].visibility < 0.3 || b[lmIdx].visibility < 0.3) continue;
      total += dist2D(a[lmIdx], b[lmIdx]);
      count++;
    }
    return count ? total / count : 0;
  }

  function maxVelocity(frames, lmIdx) {
    if (frames.length < 2) return 0;
    let max = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i-1].poseLM, b = frames[i].poseLM;
      if (!a || !b || !a[lmIdx] || !b[lmIdx]) continue;
      if (a[lmIdx].visibility < 0.3 || b[lmIdx].visibility < 0.3) continue;
      max = Math.max(max, dist2D(a[lmIdx], b[lmIdx]));
    }
    return max;
  }

  function calcHandSpeed(frames) {
    const lAvg = avgVelocity(frames, LM.L_WRIST);
    const rAvg = avgVelocity(frames, LM.R_WRIST);
    const lMax = maxVelocity(frames, LM.L_WRIST);
    const rMax = maxVelocity(frames, LM.R_WRIST);
    const avg = Math.max(lAvg, rAvg);
    const peak = Math.max(lMax, rMax);
    return norm((avg * 0.5 + peak * 0.5), 0.004, 0.075);
  }

  function calcArmExtension(frames) {
    let maxExt = 0;
    frames.forEach(f => {
      if (!f.poseLM) return;
      const lm = f.poseLM;
      const torsoH = dist2D(lm[LM.L_SHOULDER], lm[LM.L_HIP]);
      if (!torsoH || lm[LM.L_SHOULDER].visibility < 0.4) return;
      const lExt = dist2D(lm[LM.L_SHOULDER], lm[LM.L_WRIST]);
      const rExt = dist2D(lm[LM.R_SHOULDER], lm[LM.R_WRIST]);
      maxExt = Math.max(maxExt, Math.max(lExt, rExt) / torsoH);
    });
    return norm(maxExt, 0.4, 1.9);
  }

  function calcBodyMovement(frames) {
    if (frames.length < 2) return 0;
    let total = 0, count = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i-1].poseLM, b = frames[i].poseLM;
      if (!a || !b) continue;
      const aHip = { x:(a[LM.L_HIP].x+a[LM.R_HIP].x)/2, y:(a[LM.L_HIP].y+a[LM.R_HIP].y)/2 };
      const bHip = { x:(b[LM.L_HIP].x+b[LM.R_HIP].x)/2, y:(b[LM.L_HIP].y+b[LM.R_HIP].y)/2 };
      total += dist2D(aHip, bHip); count++;
    }
    const avg = count ? total / count : 0;
    return norm(avg, 0.0008, 0.038);
  }

  function calcHeadMovement(frames) {
    const avg = avgVelocity(frames, LM.NOSE);
    const max = maxVelocity(frames, LM.NOSE);
    return norm(avg * 0.5 + max * 0.5, 0.002, 0.048);
  }

  function calcEnthusiasm(frames) {
    const keys = [LM.NOSE, LM.L_WRIST, LM.R_WRIST, LM.L_ELBOW, LM.R_ELBOW];
    let total = 0;
    keys.forEach(k => { total += avgVelocity(frames, k); });
    return norm(total / keys.length, 0.002, 0.048);
  }

  function calcDramaIndex(frames) {
    if (frames.length < 3) return 0;
    const lVels = [], rVels = [];
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i-1].poseLM, b = frames[i].poseLM;
      if (!a || !b) continue;
      if (a[LM.L_WRIST] && b[LM.L_WRIST]) lVels.push(dist2D(a[LM.L_WRIST], b[LM.L_WRIST]));
      if (a[LM.R_WRIST] && b[LM.R_WRIST]) rVels.push(dist2D(a[LM.R_WRIST], b[LM.R_WRIST]));
    }
    const all = [...lVels, ...rVels];
    if (!all.length) return 0;
    const peak = Math.max(...all);
    const mean = all.reduce((a,b)=>a+b,0)/all.length;
    return norm(peak / (mean + 0.001), 1, 5);
  }

  /* ── Face mesh metrics during perf ─────────── */
  const L_MOUTH = 61, R_MOUTH = 291;
  const L_EYE_TOP = 159, L_EYE_BOT = 145, L_EYE_L = 33, L_EYE_R = 133;
  const R_EYE_TOP = 386, R_EYE_BOT = 374, R_EYE_L = 362, R_EYE_R = 263;
  const FOREHEAD = 10, CHIN = 152;
  const LIP_TOP_MID = 0, LIP_BOT_MID = 17;
  const L_BROW_INNER = 107, L_BROW_OUTER = 55;
  const R_BROW_INNER = 336, R_BROW_OUTER = 285;

  function calcFaceExpressiveness(frames) {
    if (!frames.length) return 0;
    let smileSum = 0, count = 0;
    frames.forEach(f => {
      if (!f.faceLM) return;
      const lm = f.faceLM;
      const faceH = Math.hypot(lm[FOREHEAD].x - lm[CHIN].x, lm[FOREHEAD].y - lm[CHIN].y);
      if (!faceH) return;
      const mouthW = Math.hypot(lm[L_MOUTH].x - lm[R_MOUTH].x, lm[L_MOUTH].y - lm[R_MOUTH].y);
      smileSum += clamp01((mouthW / faceH - 0.28) / 0.22);
      count++;
    });
    return count ? clamp01(smileSum / count) : 0;
  }

  function calcMouthMovement(frames) {
    if (frames.length < 2) return 0;
    const openings = frames.map(f => {
      if (!f.faceLM) return 0;
      const lm = f.faceLM;
      return Math.hypot(lm[LIP_TOP_MID].x - lm[LIP_BOT_MID].x,
                        lm[LIP_TOP_MID].y - lm[LIP_BOT_MID].y);
    });
    const mean = openings.reduce((a,b)=>a+b,0)/openings.length;
    const maxO = Math.max(...openings);
    // Reward large max mouth opening AND variation
    const stddev = Math.sqrt(openings.reduce((a,b)=>a+(b-mean)**2,0)/openings.length);
    const faceRef = frames.find(f=>f.faceLM);
    if (!faceRef) return 0;
    const faceH = Math.hypot(
      faceRef.faceLM[FOREHEAD].x - faceRef.faceLM[CHIN].x,
      faceRef.faceLM[FOREHEAD].y - faceRef.faceLM[CHIN].y
    ) || 0.001;
    const normMax = norm(maxO / faceH, 0.01, 0.12);
    const normStd = norm(stddev / faceH, 0.001, 0.04);
    return clamp01(normMax * 0.6 + normStd * 0.4);
  }

  function calcEyeWidening(frames) {
    if (!frames.length) return 0;
    let maxRatio = 0;
    frames.forEach(f => {
      if (!f.faceLM) return;
      const lm = f.faceLM;
      const lH = Math.hypot(lm[L_EYE_TOP].x-lm[L_EYE_BOT].x, lm[L_EYE_TOP].y-lm[L_EYE_BOT].y);
      const lW = Math.hypot(lm[L_EYE_L].x-lm[L_EYE_R].x, lm[L_EYE_L].y-lm[L_EYE_R].y);
      const rH = Math.hypot(lm[R_EYE_TOP].x-lm[R_EYE_BOT].x, lm[R_EYE_TOP].y-lm[R_EYE_BOT].y);
      const rW = Math.hypot(lm[R_EYE_L].x-lm[R_EYE_R].x, lm[R_EYE_L].y-lm[R_EYE_R].y);
      if (lW && rW) maxRatio = Math.max(maxRatio, (lH/lW + rH/rW) / 2);
    });
    return norm(maxRatio, 0.18, 0.55);
  }

  function calcBrowMovement(frames) {
    // Variance of brow height across frames = raised eyebrows
    if (frames.length < 2) return 0;
    const gaps = frames.map(f => {
      if (!f.faceLM) return 0;
      const lm = f.faceLM;
      const faceH = Math.hypot(lm[FOREHEAD].x-lm[CHIN].x, lm[FOREHEAD].y-lm[CHIN].y) || 0.001;
      const lBrowY = (lm[L_BROW_INNER].y + lm[L_BROW_OUTER].y) / 2;
      const rBrowY = (lm[R_BROW_INNER].y + lm[R_BROW_OUTER].y) / 2;
      const lEyeY  = (lm[L_EYE_TOP].y  + lm[L_EYE_BOT].y)  / 2;
      const rEyeY  = (lm[R_EYE_TOP].y  + lm[R_EYE_BOT].y)  / 2;
      return ((lEyeY - lBrowY) + (rEyeY - rBrowY)) / 2 / faceH;
    });
    const mean = gaps.reduce((a,b)=>a+b,0)/gaps.length;
    const maxGap = Math.max(...gaps);
    // High mean gap = raised brows, high variance = movement
    return norm(maxGap * 0.6 + mean * 0.4, 0.04, 0.14);
  }

  /* ── Compute aggregate performance score ────── */
  function computeAggregateScore(frames) {
    if (frames.length < 2) return 0;

    scores.handSpd    = calcHandSpeed(frames);
    scores.armExt     = calcArmExtension(frames);
    scores.body       = calcBodyMovement(frames);
    scores.head       = calcHeadMovement(frames);
    scores.enth       = calcEnthusiasm(frames);
    scores.drama      = calcDramaIndex(frames);
    scores.faceExpr   = calcFaceExpressiveness(frames);
    scores.mouthMvmt  = calcMouthMovement(frames);
    scores.eyeWide    = calcEyeWidening(frames);
    scores.browMvmt   = calcBrowMovement(frames);
    scores.confidence = clamp01((scores.body + scores.armExt + scores.enth) / 3);

    // Performance effort: weighted combination of movement metrics
    performanceEffort = clamp01(
      scores.handSpd  * 0.20 +
      scores.armExt   * 0.15 +
      scores.body     * 0.15 +
      scores.head     * 0.10 +
      scores.enth     * 0.15 +
      scores.mouthMvmt * 0.10 +
      scores.eyeWide  * 0.08 +
      scores.browMvmt * 0.07
    );

    // Static face/vibe score (20% weight)
    const staticFace = clamp01(
      scores.faceExpr * 0.50 +
      scores.eyeWide  * 0.30 +
      scores.browMvmt * 0.20
    );

    // Performance/expression score (80% weight)
    const perfRaw =
      scores.handSpd   * 0.18 +
      scores.armExt    * 0.14 +
      scores.body      * 0.14 +
      scores.head      * 0.10 +
      scores.enth      * 0.16 +
      scores.drama     * 0.10 +
      scores.mouthMvmt * 0.10 +
      scores.browMvmt  * 0.08;

    const combined = perfRaw * 0.80 + staticFace * 0.20;

    // Map to wider range
    // Low → 0–20, small effort → 20–45, moderate → 45–70, dramatic → 70–100
    let mapped;
    if (combined < 0.20) {
      mapped = (combined / 0.20) * 20;                        // 0–20
    } else if (combined < 0.45) {
      mapped = ((combined - 0.20) / 0.25) * 25 + 20;         // 20–45
    } else if (combined < 0.70) {
      mapped = ((combined - 0.45) / 0.25) * 25 + 45;         // 45–70
    } else {
      mapped = ((combined - 0.70) / 0.30) * 30 + 70;         // 70–100
    }

    // Apply caps based on effort level (static face CANNOT rescue poor acting)
    if (performanceEffort < 0.15) {
      mapped = Math.min(mapped, 20);
    } else if (performanceEffort < 0.30) {
      mapped = Math.min(mapped, 40);
    } else if (performanceEffort < 0.50) {
      mapped = Math.min(mapped, 65);
    }

    // Tiny noise ±3
    const noise = (Math.random() - 0.5) * 6;
    mapped += noise * 0.5;
    return Math.max(0, Math.min(100, mapped));
  }

  /* ── EMA smooth ─────────────────────────────── */
  function updateSmoothed(raw) {
    // raw is now 0–100
    const prev = smoothedScore;
    let next = prev * 0.8 + raw * 0.2;
    const delta = next - prev;
    next = prev + Math.max(-3, Math.min(3, delta));
    smoothedScore = Math.max(0, Math.min(100, next));
    return smoothedScore;
  }

  /* ── Drawing ────────────────────────────────── */
  function drawPoseOverlay(canvas, lm) {
    if (!lm) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    const connections = [
      [LM.L_SHOULDER, LM.R_SHOULDER],
      [LM.L_SHOULDER, LM.L_ELBOW], [LM.L_ELBOW, LM.L_WRIST],
      [LM.R_SHOULDER, LM.R_ELBOW], [LM.R_ELBOW, LM.R_WRIST],
      [LM.L_SHOULDER, LM.L_HIP],   [LM.R_SHOULDER, LM.R_HIP],
      [LM.L_HIP, LM.R_HIP],
      [LM.L_HIP, LM.L_KNEE],       [LM.L_KNEE, LM.L_ANKLE],
      [LM.R_HIP, LM.R_KNEE],       [LM.R_KNEE, LM.R_ANKLE],
    ];

    const grad = ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,'rgba(255,39,119,0.7)');
    grad.addColorStop(1,'rgba(0,229,255,0.7)');

    connections.forEach(([a, b]) => {
      if (!lm[a] || !lm[b]) return;
      if (lm[a].visibility < 0.4 || lm[b].visibility < 0.4) return;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lm[a].x * W, lm[a].y * H);
      ctx.lineTo(lm[b].x * W, lm[b].y * H);
      ctx.stroke();
    });

    const joints = [LM.L_SHOULDER,LM.R_SHOULDER,LM.L_ELBOW,LM.R_ELBOW,
                    LM.L_WRIST,LM.R_WRIST,LM.L_HIP,LM.R_HIP];
    joints.forEach(idx => {
      if (!lm[idx] || lm[idx].visibility < 0.4) return;
      ctx.beginPath();
      ctx.arc(lm[idx].x * W, lm[idx].y * H, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,229,255,0.8)';
      ctx.fill();
    });
  }

  function updateUI() {
    const pct = Math.round(smoothedScore);
    const liveEl = document.getElementById('perf-score-live');
    if (liveEl) liveEl.textContent = pct + '%';
    const bar = document.getElementById('perf-progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  /* ── Init MediaPipe Pose ──────────────────── */
  async function initPose() {
    const video  = document.getElementById('perf-video');
    const canvas = document.getElementById('perf-canvas');
    const hint   = document.getElementById('perf-hint');

    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      video.srcObject = camStream;
      await video.play();
    } catch (e) {
      if (hint) hint.textContent = '⚠ Camera denied — score estimated';
      return false;
    }

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    if (hint) hint.textContent = 'Loading Pose model…';

    pose = new Pose({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
      modelComplexity: 1, smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
    });

    try {
      faceMesh = new FaceMesh({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      faceMesh.setOptions({
        maxNumFaces: 1, refineLandmarks: false,
        minDetectionConfidence: 0.4, minTrackingConfidence: 0.4,
      });
    } catch(e) { faceMesh = null; }

    let latestFaceLM = null;

    if (faceMesh) {
      faceMesh.onResults(res => {
        if (res.multiFaceLandmarks && res.multiFaceLandmarks.length > 0) {
          latestFaceLM = res.multiFaceLandmarks[0];
        }
      });
    }

    pose.onResults(results => {
      const canvas = document.getElementById('perf-canvas');
      if (!canvas) return;

      if (results.poseLandmarks) {
        if (capturing) {
          allFrames.push({
            poseLM: results.poseLandmarks,
            faceLM: latestFaceLM ? [...latestFaceLM] : null,
            timestamp: Date.now(),
          });

          if (allFrames.length % 5 === 0) {
            const raw = computeAggregateScore(allFrames);
            updateSmoothed(raw);
            updateUI();
            rotateFeedback();
          }
        }
        drawPoseOverlay(canvas, results.poseLandmarks);
      }
    });

    camera = new Camera(video, {
      onFrame: async () => {
        if (pose) await pose.send({ image: video });
        if (faceMesh && capturing) await faceMesh.send({ image: video });
      },
      width: 640, height: 480,
    });

    await camera.start();
    running = true;
    if (hint) hint.textContent = 'Step back — get your full body in frame';
    return true;
  }

  /* ── Challenge flow ─────────────────────────── */
  function startChallenge() {
    if (!running) return;
    const btn = document.getElementById('btn-perf-start');
    const timerOverlay = document.getElementById('perf-timer-overlay');
    const timerNum = document.getElementById('perf-timer-num');
    const hint = document.getElementById('perf-hint');
    const instructions = document.getElementById('perf-instructions');

    if (btn) btn.setAttribute('disabled', true);
    if (instructions) instructions.style.opacity = '0.5';

    let preCount = 3;
    if (timerOverlay) { timerOverlay.style.display = 'flex'; timerNum.textContent = preCount; }

    const preInterval = setInterval(() => {
      preCount--;
      if (timerNum) timerNum.textContent = preCount || 'GO!';
      if (preCount <= 0) {
        clearInterval(preInterval);
        beginCapture();
      }
    }, 1000);
  }

  function beginCapture() {
    const timerNum = document.getElementById('perf-timer-num');
    const hint = document.getElementById('perf-hint');
    if (hint) hint.textContent = 'Maximum drama! React to the banana!';

    const bananaOverlay = document.getElementById('banana-overlay');
    if (bananaOverlay) bananaOverlay.style.display = 'flex';

    capturing = true;
    allFrames = [];
    smoothedScore = 0;
    liveScore = 0;
    performanceEffort = 0;

    let remaining = CHALLENGE_DURATION;
    if (timerNum) timerNum.textContent = remaining;

    const captureInterval = setInterval(() => {
      remaining--;
      if (timerNum) timerNum.textContent = remaining;
      if (remaining <= 0) { clearInterval(captureInterval); finishCapture(); }
    }, 1000);
  }

  function finishCapture() {
    capturing = false;
    done = true;

    const timerOverlay = document.getElementById('perf-timer-overlay');
    if (timerOverlay) timerOverlay.style.display = 'none';

    const bananaOverlay = document.getElementById('banana-overlay');
    if (bananaOverlay) bananaOverlay.style.display = 'none';

    const finalRaw = computeAggregateScore(allFrames);
    smoothedScore = Math.max(0, Math.min(100, finalRaw));
    perfScore = smoothedScore;
    updateUI();

    const hint = document.getElementById('perf-hint');
    if (hint) hint.textContent = `✓ Performance captured — ${Math.round(perfScore)}% energy`;

    if (camera) { try { camera.stop(); } catch(_) {} }
    if (camStream) camStream.getTracks().forEach(t => t.stop());

    setTimeout(() => { if (window.AppController) AppController.perfDone(); }, 600);
  }

  function startFallback() {
    // Fallback: 15–35 range
    done = true;
    scores.handSpd   = 0.08 + Math.random() * 0.25;
    scores.armExt    = 0.10 + Math.random() * 0.25;
    scores.body      = 0.08 + Math.random() * 0.22;
    scores.head      = 0.10 + Math.random() * 0.22;
    scores.enth      = 0.08 + Math.random() * 0.25;
    scores.drama     = 0.08 + Math.random() * 0.25;
    scores.faceExpr  = 0.10 + Math.random() * 0.25;
    scores.mouthMvmt = 0.08 + Math.random() * 0.22;
    scores.eyeWide   = 0.10 + Math.random() * 0.22;
    scores.browMvmt  = 0.08 + Math.random() * 0.20;
    scores.confidence = 0.10 + Math.random() * 0.22;
    performanceEffort = 0.10;
    perfScore = 15 + Math.random() * 20;
    smoothedScore = perfScore;
    updateUI();
    setTimeout(() => { if (window.AppController) AppController.perfDone(); }, 1500);
  }

  async function start() {
    const ok = await initPose();
    if (!ok) startFallback();
  }

  function triggerChallenge() { startChallenge(); }

  function getPerfScore() {
    return Math.max(0, Math.round(perfScore));
  }

  function getPerformanceEffort() {
    return performanceEffort;
  }

  function getTopInsights() {
    if (performanceEffort < 0.15) {
      return [
        'Performance energy remained suspiciously neutral',
        'AI detected hesitation',
        'The acting raised additional questions',
      ];
    }
    if (performanceEffort < 0.30) {
      return [
        'AI detected hesitation',
        'Small performance effort detected',
        'Facial commitment remained low',
      ];
    }
    const insights = [
      { label: 'Strong performance commitment detected',   val: scores.enth      },
      { label: 'Exceptional eyebrow activity observed',    val: scores.browMvmt  },
      { label: 'Dramatic mouth movement contributed heavily', val: scores.mouthMvmt },
      { label: 'Dramatic arm extension detected',          val: scores.armExt    },
      { label: 'Energetic body movement',                  val: scores.body      },
      { label: 'Animated head movement',                   val: scores.head      },
      { label: 'Peak drama index recorded',                val: scores.drama     },
      { label: 'Wide-eyed reaction captured',              val: scores.eyeWide   },
      { label: 'Enthusiastic overall energy',              val: scores.enth      },
    ];
    insights.sort((a, b) => b.val - a.val);
    return insights.slice(0, 3).map(i => i.label);
  }

  function getSubScores() {
    return {
      handSpd:  Math.round(scores.handSpd   * 100),
      armExt:   Math.round(scores.armExt    * 100),
      body:     Math.round(scores.body      * 100),
      head:     Math.round(scores.head      * 100),
      enth:     Math.round(scores.enth      * 100),
      drama:    Math.round(scores.drama     * 100),
    };
  }

  return { start, triggerChallenge, getPerfScore, getPerformanceEffort, getSubScores, getTopInsights };
})();
