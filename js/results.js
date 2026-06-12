/* ═══════════════════════════════════════════════
   js/results.js — Results screen rendering
   v5: Face 45%, Voice 20%, Perf 35%
       + share link, wider score notes
═══════════════════════════════════════════════ */

const ResultsDisplay = (() => {
  const SITE_URL = 'https://gay-gpt-drab.vercel.app/';

  function getVerdict(score) {
    if (score <= 15) return { emoji: '🏈', text: 'Certified Straight Energy' };
    if (score <= 35) return { emoji: '🤔', text: 'Mostly Straight' };
    if (score <= 55) return { emoji: '🌀', text: 'Questioning Arc Detected' };
    if (score <= 75) return { emoji: '🌈', text: 'Suspicious Levels Detected' };
    return { emoji: '✨', text: 'Rainbow Energy Maximum' };
  }

  function faceNote(s) {
    if (s >= 70) return 'Exceptional facial energy recorded.';
    if (s >= 50) return 'Above-average facial harmony.';
    if (s >= 30) return 'Moderate face energy detected.';
    return 'Low facial vibe energy recorded.';
  }
  function voiceNote(s) {
    if (s >= 65) return 'Highly expressive vocal delivery.';
    if (s >= 40) return 'Above-average voice energy.';
    if (s >= 20) return 'Moderate vocal expression detected.';
    return 'Monotone delivery — more drama needed.';
  }
  function perfNote(s) {
    if (s >= 70) return 'Exceptional performance commitment.';
    if (s >= 45) return 'Strong performance energy logged.';
    if (s >= 25) return 'Moderate performance detected.';
    return 'Low performance — banana energy critically low.';
  }

  function animateCount(el, target, duration) {
    duration = duration || 1200;
    let start = 0;
    const step = Math.ceil(target / (duration / 30));
    const interval = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = start + '%';
      if (start >= target) clearInterval(interval);
    }, 30);
  }

  function animateBar(el, target, delay) {
    setTimeout(() => { el.style.width = target + '%'; }, delay || 0);
  }

  function animateRing(ringEl, score, circumference) {
    const offset = circumference * (1 - score / 100);
    setTimeout(() => { ringEl.style.strokeDashoffset = offset.toString(); }, 300);
  }

  function launchConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#ff2777','#b44bff','#00e5ff','#ffe556','#39ff9a','#ff9900'];
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width  = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      const duration = 2.5 + Math.random() * 2;
      const delay = Math.random() * 1.5;
      piece.style.animation = `confettiFall ${duration}s ${delay}s linear forwards`;
      container.appendChild(piece);
      setTimeout(() => piece.remove(), (duration + delay + 0.2) * 1000);
    }
  }

  function renderInsights(containerId, insights) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    insights.forEach(text => {
      const el = document.createElement('div');
      el.className = 'insight-item';
      el.textContent = text;
      container.appendChild(el);
    });
  }

  /* ── Share card via Canvas ──────────────────── */
  function buildShareCard(total, faceScore, voiceScore, perfScore, verdict) {
    const canvas = document.getElementById('share-canvas');
    if (!canvas) return null;

    const W = 560, H = 340;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, 'rgba(255,39,119,0.12)');
    bg.addColorStop(0.5, 'rgba(180,75,255,0.08)');
    bg.addColorStop(1, 'rgba(0,229,255,0.10)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W-2, H-2);

    // Logo
    const logoGrad = ctx.createLinearGradient(0, 0, 200, 0);
    logoGrad.addColorStop(0, '#ff2777');
    logoGrad.addColorStop(0.5, '#b44bff');
    logoGrad.addColorStop(1, '#00e5ff');
    ctx.fillStyle = logoGrad;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('GayGPT™', 30, 48);

    ctx.fillStyle = 'rgba(240,238,255,0.4)';
    ctx.font = '12px monospace';
    ctx.fillText('ADVANCED GAYDAR SCANNER', 30, 66);

    // Big score
    const scoreGrad = ctx.createLinearGradient(300, 20, 530, 100);
    scoreGrad.addColorStop(0, '#ff2777');
    scoreGrad.addColorStop(1, '#b44bff');
    ctx.fillStyle = scoreGrad;
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(total + '%', W - 30, 90);
    ctx.fillStyle = 'rgba(240,238,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText('GAYGPT SCORE', W - 30, 108);
    ctx.textAlign = 'left';

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 120); ctx.lineTo(W-30, 120); ctx.stroke();

    // Sub scores
    const subs = [
      { label: 'Face Energy',   val: faceScore  + '%', color: '#ff2777' },
      { label: 'Voice Energy',  val: voiceScore + '%', color: '#b44bff' },
      { label: 'Performance',   val: perfScore  + '%', color: '#00e5ff' },
    ];
    subs.forEach((s, i) => {
      const x = 30 + i * 170;
      ctx.fillStyle = s.color;
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(s.val, x, 160);
      ctx.fillStyle = 'rgba(240,238,255,0.45)';
      ctx.font = '11px monospace';
      ctx.fillText(s.label.toUpperCase(), x, 178);
    });

    // Verdict
    ctx.fillStyle = '#ffe556';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('"' + verdict.text + '"', 30, 218);

    ctx.font = '24px serif';
    ctx.fillText(verdict.emoji, W - 70, 218);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(30, 236); ctx.lineTo(W-30, 236); ctx.stroke();

    // URL branding
    ctx.fillStyle = 'rgba(180,75,255,0.80)';
    ctx.font = '13px monospace';
    ctx.fillText(SITE_URL, 30, 260);

    // Footer
    ctx.fillStyle = 'rgba(240,238,255,0.30)';
    ctx.font = '11px monospace';
    ctx.fillText('Entertainment only. Not a real classifier.', 30, 280);

    return canvas;
  }

  /* ── Main render ────────────────────────────── */
  function render(faceScore, voiceScore, perfScore) {
    // Weights: Face 45%, Voice 20%, Performance 35%
    let total = faceScore * 0.45 + voiceScore * 0.20 + perfScore * 0.35;

    // Apply penalty if performance effort was extremely low
    const effort = window.PerfScanner ? PerfScanner.getPerformanceEffort() : 1;
    if (effort < 0.20) {
      total -= 8;
    }

    // Bonus if all three are strong
    if (faceScore > 70 && voiceScore > 70 && perfScore > 70) {
      total += 5 + Math.random() * 5;
    }

    total = Math.max(0, Math.min(100, Math.round(total)));

    // Ring + score counter
    const ringEl = document.getElementById('ring-fill-big');
    const pctEl  = document.getElementById('results-pct');
    if (ringEl) animateRing(ringEl, total, 552.9);
    if (pctEl)  setTimeout(() => animateCount(pctEl, total), 400);

    // Breakdown bars + scores
    [
      ['res-face-bar',  faceScore,  500],
      ['res-voice-bar', voiceScore, 650],
      ['res-perf-bar',  perfScore,  800],
    ].forEach(([id, val, delay]) => animateBar(document.getElementById(id), val, delay));

    const faceScoreEl  = document.getElementById('res-face-score');
    const voiceScoreEl = document.getElementById('res-voice-score');
    const perfScoreEl  = document.getElementById('res-perf-score');
    if (faceScoreEl)  { faceScoreEl.textContent  = faceScore  + '%'; faceScoreEl.style.color  = 'var(--pink)'; }
    if (voiceScoreEl) { voiceScoreEl.textContent = voiceScore + '%'; voiceScoreEl.style.color = 'var(--purple)'; }
    if (perfScoreEl)  { perfScoreEl.textContent  = perfScore  + '%'; perfScoreEl.style.color  = 'var(--blue)'; }

    // Insights
    const faceInsights  = window.FaceScanner  ? FaceScanner.getTopInsights()  : ['Strong facial harmony detected','Above-average cheekbone energy','Suspicious eyebrow confidence'];
    const voiceInsights = window.VoiceScanner ? VoiceScanner.getTopInsights() : ['High vocal energy detected','Strong dramatic emphasis','Above-average storytelling delivery'];
    const perfInsights  = window.PerfScanner  ? PerfScanner.getTopInsights()  : ['Strong performance commitment detected','Exceptional eyebrow activity','Dramatic mouth movement contributed heavily'];

    renderInsights('res-face-insights',  faceInsights);
    renderInsights('res-voice-insights', voiceInsights);
    renderInsights('res-perf-insights',  perfInsights);

    // Verdict
    const verdict = getVerdict(total);
    const emojiEl = document.getElementById('verdict-emoji');
    const textEl  = document.getElementById('verdict-text');
    if (emojiEl) emojiEl.textContent = verdict.emoji;
    if (textEl)  textEl.textContent  = verdict.text;

    if (total > 75) setTimeout(launchConfetti, 800);

    // Roasts
    const roastList = document.getElementById('roast-list');
    if (roastList) {
      roastList.innerHTML = '';
      pickRoasts(total, 6).forEach((r, i) => {
        const el = document.createElement('div');
        el.className = 'roast-item';
        el.style.animationDelay = (0.3 + i * 0.08) + 's';
        el.textContent = '· ' + r;
        roastList.appendChild(el);
      });
    }

    // Build share card (hidden canvas)
    const shareCanvas = buildShareCard(total, faceScore, voiceScore, perfScore, verdict);

    // Share text (used for all share methods)
    const shareText =
`🏳️‍🌈 GayGPT Scanner Results

I scored ${total}% on GayGPT Scanner 💅

Face Energy:        ${faceScore}%
Voice Energy:       ${voiceScore}%
Performance Energy: ${perfScore}%

Verdict: "${verdict.text}"

Try yours:
${SITE_URL}`;

    // Native Share button (Web Share API)
    const nativeShareBtn = document.getElementById('btn-native-share');
    if (nativeShareBtn) {
      if (navigator.share) {
        nativeShareBtn.style.display = '';
        nativeShareBtn.addEventListener('click', () => {
          navigator.share({
            title: 'GayGPT Scanner',
            text: `I scored ${total}% on GayGPT Scanner 💅\n\nTry yours:`,
            url: SITE_URL,
          }).catch(() => {});
        });
      } else {
        nativeShareBtn.style.display = 'none';
      }
    }

    // Download card button
    const dlBtn = document.getElementById('btn-download-card');
    if (dlBtn && shareCanvas) {
      dlBtn.addEventListener('click', () => {
        shareCanvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'gaygpt-result.png'; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      });
    }

    // Copy results
    const copyBtn = document.getElementById('btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(shareText).then(() => {
          const orig = copyBtn.textContent;
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = orig; }, 2000);
        }).catch(() => { alert(shareText); });
      });
    }

    return total;
  }

  return { render };
})();
