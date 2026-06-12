/* ═══════════════════════════════════════════════
   app.js — GayGPT v2 Main Controller
═══════════════════════════════════════════════ */

/* ── Inject SVG gradient defs for rings ─────────── */
(function injectSVGDefs() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  svg.innerHTML = `
    <defs>
      <linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#ff2777"/>
        <stop offset="50%"  stop-color="#b44bff"/>
        <stop offset="100%" stop-color="#00e5ff"/>
      </linearGradient>
      <linearGradient id="gradRingBig" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#ff2777"/>
        <stop offset="50%"  stop-color="#b44bff"/>
        <stop offset="100%" stop-color="#00e5ff"/>
      </linearGradient>
    </defs>
  `;
  document.body.insertBefore(svg, document.body.firstChild);
})();

/* ── Screen routing ─────────────────────────────── */
function showScreen(id) {
  const current = document.querySelector('.screen.active');
  const target  = document.getElementById(id);
  if (!target || target === current) return;

  if (current) {
    current.classList.add('exit');
    setTimeout(() => { current.classList.remove('active', 'exit'); }, 320);
  }

  // Small delay so exit animation starts before enter
  setTimeout(() => {
    target.classList.add('active');
    target.scrollTop = 0;
  }, current ? 80 : 0);
}

/* ── Loading screen messages ────────────────────── */
const LOADING_MSGS = [
  'Consulting the rainbow database…',
  'Cross-referencing brunch preferences…',
  'Analysing Lana Del Rey appreciation index…',
  'Calibrating cheekbone authority scores…',
  'Scanning for main character syndrome…',
  'Evaluating Taylor Swift album rankings…',
  'Measuring dramatic pause frequency…',
  'Indexing Beyoncé recognition patterns…',
  'Processing RuPaul cultural fluency…',
  'Calculating overall charisma coefficient…',
  'Reviewing vocal fry biometrics…',
  'Final calibration in progress…',
];

function runLoadingScreen(onComplete) {
  showScreen('screen-loading');
  const bar   = document.getElementById('loading-bar');
  const msgEl = document.getElementById('loading-msg');
  let pct = 0, msgIdx = 0;

  const interval = setInterval(() => {
    pct += 100 / (3200 / 60);
    if (bar) bar.style.width = Math.min(pct, 100) + '%';

    if (pct % 18 < 2 && msgIdx < LOADING_MSGS.length) {
      if (msgEl) {
        msgEl.style.opacity = '0';
        setTimeout(() => {
          if (msgEl) {
            msgEl.textContent = LOADING_MSGS[msgIdx % LOADING_MSGS.length];
            msgEl.style.opacity = '1';
          }
          msgIdx++;
        }, 200);
      }
    }
    if (pct >= 100) { clearInterval(interval); setTimeout(onComplete, 400); }
  }, 60);
}

/* ── App state ───────────────────────────────────── */
const AppState = {
  faceScore:  0,
  voiceScore: 0,
  perfScore:  0,
};

/* ── App Controller (called by sub-modules) ─────── */
window.AppController = {
  voiceDone() {
    AppState.voiceScore = VoiceScanner.getVoiceScore();
    showScreen('screen-perf');
    PerfScanner.start();
  },
  perfDone() {
    AppState.perfScore = PerfScanner.getPerfScore();
    runLoadingScreen(() => {
      showScreen('screen-results');
      ResultsDisplay.render(AppState.faceScore, AppState.voiceScore, AppState.perfScore);
    });
  },
};

/* ── Landing ─────────────────────────────────────── */
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('screen-face');
  FaceScanner.start();
});

/* ── Face screen ─────────────────────────────────── */
document.getElementById('btn-lock-face').addEventListener('click', () => {
  AppState.faceScore = FaceScanner.getFaceScore();
  FaceScanner.stop();
  showScreen('screen-voice');
});

/* ── Voice screen ────────────────────────────────── */
document.getElementById('btn-record').addEventListener('click', () => {
  VoiceScanner.start();
});

/* ── Performance screen ──────────────────────────── */
document.getElementById('btn-perf-start').addEventListener('click', () => {
  PerfScanner.triggerChallenge();
});

/* ── Scan again ──────────────────────────────────── */
document.getElementById('btn-again').addEventListener('click', () => {
  AppState.faceScore = AppState.voiceScore = AppState.perfScore = 0;
  setTimeout(() => { window.location.reload(); }, 100);
});
