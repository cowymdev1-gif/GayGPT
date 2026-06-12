/* ═══════════════════════════════════════════════
   js/face.js — MediaPipe FaceMesh live face analysis
   v5: 75% facial/vibe metrics, 25% expression
═══════════════════════════════════════════════ */

const FaceScanner = (() => {
  const ANALYSIS_DURATION = 5;

  let faceMesh = null;
  let camera = null;
  let camStream = null;
  let locked = false;
  let faceDetectedAt = null;
  let lockCountdownInterval = null;
  let lockCountdownNum = ANALYSIS_DURATION;
  let autoLockTriggered = false;

  const WINDOW = 10;
  const hist = { smile: [], brow: [], eye: [], tilt: [], asym: [], expr: [],
                 symmetry: [], eyeSize: [], lipFull: [], jawSoft: [],
                 cheekProm: [], faceHarmony: [] };

  const scores = { smile: 0, brow: 0, eye: 0, tilt: 0, asym: 0, expr: 0,
                   symmetry: 0, eyeSize: 0, lipFull: 0, jawSoft: 0,
                   cheekProm: 0, faceHarmony: 0 };

  let faceScore = 0;
  let smoothedScore = 0;
  let framesWithFace = 0;
  let frameIndex = 0;

  const subHistory = { smile: [], brow: [], eye: [], tilt: [], expr: [],
                       symmetry: [], eyeSize: [], lipFull: [], jawSoft: [],
                       cheekProm: [], faceHarmony: [] };

  // MediaPipe indices
  const L_MOUTH = 61, R_MOUTH = 291, MOUTH_TOP = 13, MOUTH_BOT = 14;
  const L_BROW_INNER = 107, L_BROW_OUTER = 55;
  const R_BROW_INNER = 336, R_BROW_OUTER = 285;
  const L_EYE_TOP = 159, L_EYE_BOT = 145, L_EYE_L = 33, L_EYE_R = 133;
  const R_EYE_TOP = 386, R_EYE_BOT = 374, R_EYE_L = 362, R_EYE_R = 263;
  const NOSE_TIP = 1, FOREHEAD = 10, CHIN = 152;
  const L_CHEEK = 234, R_CHEEK = 454;
  const LIP_TOP_MID = 0, LIP_BOT_MID = 17;
  const JAW_L = 132, JAW_R = 361;
  // Additional points for cheekbone prominence
  const L_CHEEK_HIGH = 116, R_CHEEK_HIGH = 345;

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function norm(val, min, max) { return clamp01((val - min) / (max - min)); }
  function rollingAvg(arr, val) {
    arr.push(val);
    if (arr.length > WINDOW) arr.shift();
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /* ── FACIAL/VIBE metrics (75% weight) ───────── */

  function calcSymmetry(lm) {
    const faceH = dist(lm[FOREHEAD], lm[CHIN]);
    if (!faceH) return 0.5;
    const mouthDiff = Math.abs(lm[L_MOUTH].y - lm[R_MOUTH].y) / faceH;
    const lBrowY = (lm[L_BROW_INNER].y + lm[L_BROW_OUTER].y) / 2;
    const rBrowY = (lm[R_BROW_INNER].y + lm[R_BROW_OUTER].y) / 2;
    const browDiff = Math.abs(lBrowY - rBrowY) / faceH;
    const asymmetry = (mouthDiff + browDiff * 2);
    return clamp01(1 - asymmetry / 0.06);
  }

  function calcEyeSize(lm) {
    const faceH = dist(lm[FOREHEAD], lm[CHIN]);
    if (!faceH) return 0;
    const lW = dist(lm[L_EYE_L], lm[L_EYE_R]);
    const rW = dist(lm[R_EYE_L], lm[R_EYE_R]);
    const avgEyeW = (lW + rW) / 2;
    return norm(avgEyeW / faceH, 0.07, 0.18);
  }

  function calcLipFullness(lm) {
    const faceH = dist(lm[FOREHEAD], lm[CHIN]);
    if (!faceH) return 0;
    const lipH = dist(lm[LIP_TOP_MID], lm[LIP_BOT_MID]);
    return norm(lipH / faceH, 0.020, 0.075);
  }

  function calcJawSoftness(lm) {
    const jawW   = dist(lm[JAW_L], lm[JAW_R]);
    const cheekW = dist(lm[L_CHEEK], lm[R_CHEEK]);
    if (!cheekW) return 0;
    return norm(1 - (jawW / cheekW), 0.25, 0.72);
  }

  function calcCheekboneProminence(lm) {
    // Cheekbone width vs jaw width: higher ratio = more prominent cheekbones
    const cheekW = dist(lm[L_CHEEK], lm[R_CHEEK]);
    const jawW   = dist(lm[JAW_L], lm[JAW_R]);
    if (!jawW) return 0;
    return norm(cheekW / jawW, 0.9, 1.4);
  }

  function calcFaceHarmony(lm) {
    // Face proportions: golden ratio approximation
    const faceH  = dist(lm[FOREHEAD], lm[CHIN]);
    const faceW  = dist(lm[L_CHEEK], lm[R_CHEEK]);
    if (!faceH || !faceW) return 0.5;
    const ratio = faceH / faceW;
    // Ideal facial ratio ~1.618; score higher when closer to that
    return norm(1 - Math.abs(ratio - 1.5), -0.5, 1.0);
  }

  /* ── EXPRESSION metrics (25% weight) ────────── */

  function calcSmile(lm) {
    const mouthW = dist(lm[L_MOUTH], lm[R_MOUTH]);
    const faceH  = dist(lm[FOREHEAD], lm[CHIN]);
    if (!faceH) return 0;
    return clamp01((mouthW / faceH - 0.30) / 0.20);
  }

  function calcBrow(lm) {
    const faceH = dist(lm[FOREHEAD], lm[CHIN]);
    if (!faceH) return 0;
    const lBrowY = (lm[L_BROW_INNER].y + lm[L_BROW_OUTER].y) / 2;
    const rBrowY = (lm[R_BROW_INNER].y + lm[R_BROW_OUTER].y) / 2;
    const lEyeY  = (lm[L_EYE_TOP].y  + lm[L_EYE_BOT].y)  / 2;
    const rEyeY  = (lm[R_EYE_TOP].y  + lm[R_EYE_BOT].y)  / 2;
    const lGap = (lEyeY - lBrowY) / faceH;
    const rGap = (rEyeY - rBrowY) / faceH;
    return clamp01(((lGap + rGap) / 2 - 0.05) / 0.06);
  }

  function calcEyeOpen(lm) {
    const lH = dist(lm[L_EYE_TOP], lm[L_EYE_BOT]);
    const lW = dist(lm[L_EYE_L],   lm[L_EYE_R]);
    const rH = dist(lm[R_EYE_TOP], lm[R_EYE_BOT]);
    const rW = dist(lm[R_EYE_L],   lm[R_EYE_R]);
    if (!lW || !rW) return 0;
    return clamp01(((lH/lW + rH/rW) / 2 - 0.22) / 0.18);
  }

  function calcHeadTilt(lm) {
    const lEye = { x: (lm[L_EYE_L].x + lm[L_EYE_R].x)/2, y: (lm[L_EYE_L].y + lm[L_EYE_R].y)/2 };
    const rEye = { x: (lm[R_EYE_L].x + lm[R_EYE_R].x)/2, y: (lm[R_EYE_L].y + lm[R_EYE_R].y)/2 };
    const angle = Math.abs(Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x) * 180 / Math.PI);
    return clamp01(angle / 18);
  }

  /* ── Aggregate face score: 75% vibe, 25% expr ── */
  function calcFaceScore(s) {
    // Facial/vibe metrics (75%)
    const vibeScore =
      s.symmetry     * 0.20 +
      s.eyeSize      * 0.18 +
      s.lipFull      * 0.15 +
      s.jawSoft      * 0.13 +
      s.cheekProm    * 0.17 +
      s.faceHarmony  * 0.17;

    // Expression metrics (25%)
    const exprScore =
      s.smile * 0.40 +
      s.brow  * 0.25 +
      s.eye   * 0.20 +
      s.tilt  * 0.15;

    // Weighted combination — no floor, raw distribution
    const combined = vibeScore * 0.75 + exprScore * 0.25;

    // Map raw 0–1 to wider output range
    // Low vibe (< 0.35) → score 5–35
    // Medium vibe → score 30–65
    // High vibe → score 65–95
    let mapped;
    if (combined < 0.35) {
      mapped = norm(combined, 0, 0.35) * 30 + 5;          // 5–35
    } else if (combined < 0.65) {
      mapped = norm(combined, 0.35, 0.65) * 35 + 30;      // 30–65
    } else {
      mapped = norm(combined, 0.65, 1.0) * 30 + 65;       // 65–95
    }

    // Small noise: ±3 normal, ±5 max
    const noise = (Math.random() - 0.5) * 6;
    const clamped = Math.max(0, Math.min(10, Math.abs(noise))) * Math.sign(noise);
    mapped += clamped * 0.5; // effectively ±3

    return Math.max(0, Math.min(100, mapped));
  }

  function updateSmoothedScore(newRaw) {
    // newRaw is now 0–100
    const prev = smoothedScore;
    let next = prev * 0.8 + newRaw * 0.2;
    const delta = next - prev;
    next = prev + Math.max(-3, Math.min(3, delta));
    smoothedScore = Math.max(0, Math.min(100, next));
    return smoothedScore;
  }

  /* ── Live feedback ──────────────────────────── */
  const FACE_MSGS = [
    'Facial harmony being assessed…',
    'Cheekbone energy detected',
    'Symmetry coefficient rising',
    'Eye shape metrics locked',
    'Lip fullness analysed',
    'Jaw geometry profiled',
    'Face proportions logged',
    'Aesthetic vibe index rising',
    'Suspicious eyebrow confidence',
    'Facial structure assessment complete',
  ];
  let lastFeedbackIdx = -1;
  let feedbackTimer = 0;

  function rotateFeedback() {
    feedbackTimer++;
    if (feedbackTimer % 40 !== 0) return;
    let idx;
    do { idx = Math.floor(Math.random() * FACE_MSGS.length); } while (idx === lastFeedbackIdx);
    lastFeedbackIdx = idx;
    const el = document.getElementById('face-live-feedback');
    if (el) {
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
      el.textContent = FACE_MSGS[idx];
    }
  }

  /* ── Drawing helpers ───────────────────────── */
  function drawOverlay(canvas, lm) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!lm || !lm.length) return;
    const W = canvas.width, H = canvas.height;

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 0.7;
    const FACE_OUTLINE = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
    ctx.beginPath();
    FACE_OUTLINE.forEach((i, idx) => {
      if (!lm[i]) return;
      idx === 0 ? ctx.moveTo(lm[i].x * W, lm[i].y * H) : ctx.lineTo(lm[i].x * W, lm[i].y * H);
    });
    ctx.closePath(); ctx.stroke();

    [[L_EYE_L, L_EYE_R, L_EYE_TOP, L_EYE_BOT], [R_EYE_L, R_EYE_R, R_EYE_TOP, R_EYE_BOT]].forEach(pts => {
      ctx.strokeStyle = 'rgba(61, 228, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pts.forEach((i, idx) => {
        idx === 0 ? ctx.moveTo(lm[i].x * W, lm[i].y * H) : ctx.lineTo(lm[i].x * W, lm[i].y * H);
      });
      ctx.closePath(); ctx.stroke();
    });
  }

  function updateUI() {
    const pct = Math.round(smoothedScore);
    const scoreEl = document.getElementById('face-score-live');
    if (scoreEl) scoreEl.textContent = pct + '%';
    const bar = document.getElementById('face-progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  function startLockCountdown() {
    const wrap = document.getElementById('face-lockin-wrap');
    const numEl = document.getElementById('face-lockin-num');
    if (wrap) wrap.style.display = 'flex';

    lockCountdownNum = ANALYSIS_DURATION;
    if (numEl) numEl.textContent = lockCountdownNum;

    const lockBtn = document.getElementById('btn-lock-face');
    if (lockBtn) lockBtn.removeAttribute('disabled');

    lockCountdownInterval = setInterval(() => {
      lockCountdownNum--;
      if (numEl) numEl.textContent = Math.max(0, lockCountdownNum);
      if (lockCountdownNum <= 0) {
        clearInterval(lockCountdownInterval);
        if (!locked && !autoLockTriggered) {
          autoLockTriggered = true;
          AppState.faceScore = getFaceScore();
          stop();
          showScreen('screen-voice');
        }
      }
    }, 1000);
  }

  async function start() {
    const video  = document.getElementById('face-video');
    const canvas = document.getElementById('face-canvas');
    const hint   = document.getElementById('face-hint');

    if (hint) hint.textContent = 'Requesting camera…';

    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      video.srcObject = camStream;
      await video.play();
    } catch (e) {
      if (hint) hint.textContent = '⚠ Camera denied — score estimated';
      startFallback();
      return;
    }

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    if (hint) hint.textContent = 'Loading FaceMesh model…';

    faceMesh = new FaceMesh({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1, refineLandmarks: true,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(results => {
      if (locked) return;
      frameIndex++;

      const canvas = document.getElementById('face-canvas');
      if (!canvas) return;

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        framesWithFace++;
        const lm = results.multiFaceLandmarks[0];

        const smileRaw    = calcSmile(lm);
        const browRaw     = calcBrow(lm);
        const eyeRaw      = calcEyeOpen(lm);
        const tiltRaw     = calcHeadTilt(lm);
        const symRaw      = calcSymmetry(lm);
        const eyeSzRaw    = calcEyeSize(lm);
        const lipRaw      = calcLipFullness(lm);
        const jawRaw      = calcJawSoftness(lm);
        const cheekRaw    = calcCheekboneProminence(lm);
        const harmonyRaw  = calcFaceHarmony(lm);

        scores.smile      = rollingAvg(hist.smile,      smileRaw);
        scores.brow       = rollingAvg(hist.brow,       browRaw);
        scores.eye        = rollingAvg(hist.eye,        eyeRaw);
        scores.tilt       = rollingAvg(hist.tilt,       tiltRaw);
        scores.symmetry   = rollingAvg(hist.symmetry,   symRaw);
        scores.eyeSize    = rollingAvg(hist.eyeSize,    eyeSzRaw);
        scores.lipFull    = rollingAvg(hist.lipFull,    lipRaw);
        scores.jawSoft    = rollingAvg(hist.jawSoft,    jawRaw);
        scores.cheekProm  = rollingAvg(hist.cheekProm,  cheekRaw);
        scores.faceHarmony = rollingAvg(hist.faceHarmony, harmonyRaw);

        ['smile','brow','eye','tilt','symmetry','eyeSize','lipFull','jawSoft','cheekProm','faceHarmony']
          .forEach(k => { subHistory[k].push(scores[k]); });

        faceScore = calcFaceScore(scores);
        updateSmoothedScore(faceScore);
        drawOverlay(canvas, lm);
        rotateFeedback();

        if (framesWithFace === 8 && !faceDetectedAt && !autoLockTriggered) {
          faceDetectedAt = Date.now();
          startLockCountdown();
        }

        if (hint) hint.textContent = `Scanning… ${Math.round(smoothedScore)}% face energy`;
      } else {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (hint) hint.textContent = 'No face detected — centre your face';
      }

      updateUI();
    });

    camera = new Camera(video, {
      onFrame: async () => { if (!locked) await faceMesh.send({ image: video }); },
      width: 640, height: 480,
    });
    camera.start().then(() => {
      if (hint) hint.textContent = 'Scanning… hold still!';
    });
  }

  function startFallback() {
    // Fallback: range 15–35
    let frames = 0;
    const interval = setInterval(() => {
      if (locked) { clearInterval(interval); return; }
      frames++;
      scores.symmetry    = rollingAvg(hist.symmetry,    0.15 + Math.random() * 0.35);
      scores.eyeSize     = rollingAvg(hist.eyeSize,     0.10 + Math.random() * 0.40);
      scores.lipFull     = rollingAvg(hist.lipFull,     0.10 + Math.random() * 0.35);
      scores.jawSoft     = rollingAvg(hist.jawSoft,     0.12 + Math.random() * 0.30);
      scores.cheekProm   = rollingAvg(hist.cheekProm,   0.10 + Math.random() * 0.40);
      scores.faceHarmony = rollingAvg(hist.faceHarmony, 0.15 + Math.random() * 0.35);
      scores.smile = rollingAvg(hist.smile, 0.10 + Math.random() * 0.25);
      scores.brow  = rollingAvg(hist.brow,  0.10 + Math.random() * 0.25);
      scores.eye   = rollingAvg(hist.eye,   0.10 + Math.random() * 0.25);
      scores.tilt  = rollingAvg(hist.tilt,  0.10 + Math.random() * 0.25);
      faceScore = calcFaceScore(scores);
      updateSmoothedScore(faceScore);
      framesWithFace = 10;
      updateUI();
      if (frames === 8) startLockCountdown();
    }, 150);
  }

  function stop() {
    locked = true;
    if (lockCountdownInterval) clearInterval(lockCountdownInterval);
    if (camera)    { try { camera.stop(); }  catch(_) {} }
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); }
    if (faceMesh)  { try { faceMesh.close(); } catch(_) {} }
  }

  function getFaceScore() {
    // No artificial floor — return raw score
    return Math.max(0, Math.round(smoothedScore));
  }

  function getTopInsights() {
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    const insights = [
      { label: 'Strong facial harmony detected',    val: avg(subHistory.faceHarmony) },
      { label: 'Above-average cheekbone energy',    val: avg(subHistory.cheekProm)   },
      { label: 'Suspicious eyebrow confidence',     val: avg(subHistory.brow)        },
      { label: 'Eye contact remained steady',       val: avg(subHistory.eye)         },
      { label: 'Fuller lip proportions detected',   val: avg(subHistory.lipFull)     },
      { label: 'Soft jawline geometry logged',      val: avg(subHistory.jawSoft)     },
      { label: 'High facial symmetry index',        val: avg(subHistory.symmetry)    },
      { label: 'Wide expressive eyes',              val: avg(subHistory.eyeSize)     },
      { label: 'Subtle expression improved score',  val: avg(subHistory.smile)       },
      { label: 'Playful head tilt detected',        val: avg(subHistory.tilt)        },
    ];
    insights.sort((a, b) => b.val - a.val);
    return insights.slice(0, 3).map(i => i.label);
  }

  function getSubScores() {
    return {
      smile:    Math.round(scores.smile    * 100),
      brow:     Math.round(scores.brow     * 100),
      eye:      Math.round(scores.eye      * 100),
      tilt:     Math.round(scores.tilt     * 100),
      symmetry: Math.round(scores.symmetry * 100),
      cheekProm: Math.round(scores.cheekProm * 100),
    };
  }

  return { start, stop, getFaceScore, getSubScores, getTopInsights };
})();
