/**
 * blob.js — Full blob generator engine
 * Features: smooth catmull-rom paths, animated morphing, color theming,
 *           complexity/growth sliders, SVG copy, PNG export, dark/light toggle,
 *           mobile drawer, header orb animation.
 */
(function () {

  // ── DOM ───────────────────────────────────────────────────────────────────
  const blobPath        = document.getElementById('blobPath');
  const canvasFrame     = document.getElementById('canvasFrame');
  const canvasWrapper   = document.getElementById('canvasWrapper');
  const colorPicker     = document.getElementById('colorPicker');
  const colorDot        = document.getElementById('colorDot');
  const hexDisplay      = document.getElementById('hexDisplay');
  const complexitySlider= document.getElementById('complexitySlider');
  const growthSlider    = document.getElementById('growthSlider');
  const complexityVal   = document.getElementById('complexityVal');
  const growthVal       = document.getElementById('growthVal');
  const animateBtn      = document.getElementById('animateBtn');
  const animIcon        = document.getElementById('animIcon');
  const randomBtn       = document.getElementById('randomBtn');
  const svgBtn          = document.getElementById('svgBtn');
  const pngBtn          = document.getElementById('pngBtn');
  const shareBtn        = document.getElementById('shareBtn');
  const headerExport    = document.getElementById('headerExport');
  const themeToggle     = document.getElementById('themeToggle');
  const toast           = document.getElementById('toast');
  const menuToggle      = document.getElementById('menuToggle');
  const drawer          = document.getElementById('drawer');
  const drawerOverlay   = document.getElementById('drawerOverlay');
  const drawerClose     = document.getElementById('drawerClose');
  const drawerShare     = document.getElementById('drawerShare');
  const drawerExport    = document.getElementById('drawerExport');
  const drawerSvg       = document.getElementById('drawerSvg');
  const drawerTheme     = document.getElementById('drawerTheme');
  const statColor       = document.getElementById('statColor');
  const statPoints      = document.getElementById('statPoints');
  const statGrowth      = document.getElementById('statGrowth');
  const orbPath         = document.getElementById('orbPath');

  // ── State ─────────────────────────────────────────────────────────────────
  let color        = '#FF0066';
  let animating    = false;
  let animId       = null;
  let morphProg    = 1;
  let currentPts   = null;
  let targetPts    = null;
  let lastMorphAt  = 0;
  const MORPH_MS   = 2400;
  const CX = 250, CY = 250, BASE_R = 185;

  // ── Blob math ─────────────────────────────────────────────────────────────
  function getComplexity() { return parseInt(complexitySlider.value); }
  function getGrowth()     { return parseInt(growthSlider.value) / 100; }

  function genPoints(n, grow) {
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const minR  = BASE_R * (0.50 - grow * 0.18);
      const maxR  = BASE_R * (0.92 + grow * 0.32);
      return { angle, r: minR + Math.random() * (maxR - minR) };
    });
  }

  function lerpPts(a, b, t) {
    return a.map((pa, i) => ({ angle: pa.angle, r: pa.r + (b[i].r - pa.r) * t }));
  }

  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  function toPath(pts) {
    const n  = pts.length;
    const c  = pts.map(p => ({ x: CX + p.r*Math.cos(p.angle), y: CY + p.r*Math.sin(p.angle) }));
    const T  = 0.36;
    let d    = '';
    for (let i = 0; i < n; i++) {
      const cur  = c[i];
      const nxt  = c[(i+1)%n];
      const prv  = c[(i-1+n)%n];
      const nxt2 = c[(i+2)%n];
      if (i === 0) d += `M${cur.x.toFixed(2)},${cur.y.toFixed(2)} `;
      const cp1x = cur.x + (nxt.x - prv.x)  * T;
      const cp1y = cur.y + (nxt.y - prv.y)  * T;
      const cp2x = nxt.x - (nxt2.x - cur.x) * T;
      const cp2y = nxt.y - (nxt2.y - cur.y) * T;
      d += `C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${nxt.x.toFixed(2)},${nxt.y.toFixed(2)} `;
    }
    return d + 'Z';
  }

  function renderBlob(pts) {
    blobPath.setAttribute('d', toPath(pts));
    blobPath.setAttribute('fill', color);
  }

  // ── Header orb animation ──────────────────────────────────────────────────
  let orbPts = null, orbTarget = null, orbProg = 1, orbLast = 0;
  const ORB_CX = 22, ORB_CY = 22, ORB_R = 17;

  function genOrbPts() {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const r = ORB_R * (0.72 + Math.random() * 0.28);
      return { angle, r };
    });
  }

  function toOrbPath(pts) {
    const n = pts.length;
    const c = pts.map(p => ({ x: ORB_CX + p.r*Math.cos(p.angle), y: ORB_CY + p.r*Math.sin(p.angle) }));
    const T = 0.38;
    let d = '';
    for (let i = 0; i < n; i++) {
      const cur = c[i], nxt = c[(i+1)%n], prv = c[(i-1+n)%n], nxt2 = c[(i+2)%n];
      if (i === 0) d += `M${cur.x.toFixed(2)},${cur.y.toFixed(2)} `;
      const cp1x = cur.x + (nxt.x-prv.x)*T, cp1y = cur.y+(nxt.y-prv.y)*T;
      const cp2x = nxt.x - (nxt2.x-cur.x)*T, cp2y = nxt.y-(nxt2.y-cur.y)*T;
      d += `C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${nxt.x.toFixed(2)},${nxt.y.toFixed(2)} `;
    }
    return d + 'Z';
  }

  function animateOrb(ts) {
    if (ts - orbLast > 2000) {
      orbLast   = ts;
      orbTarget = genOrbPts();
      if (!orbPts) orbPts = genOrbPts();
      orbProg = 0;
    }
    if (orbPts && orbTarget && orbProg < 1) {
      orbProg = Math.min(1, orbProg + 0.008);
      const interp = orbPts.map((p,i) => ({ angle: p.angle, r: p.r + (orbTarget[i].r - p.r) * ease(orbProg) }));
      if (orbPath) orbPath.setAttribute('d', toOrbPath(interp));
      if (orbProg >= 1) orbPts = orbTarget;
    }
  }

  // ── Main animation loop ───────────────────────────────────────────────────
  function animLoop(ts) {
    if (!animating) return;
    if (ts - lastMorphAt > MORPH_MS) {
      lastMorphAt = ts;
      targetPts   = genPoints(getComplexity(), getGrowth());
      if (!currentPts || currentPts.length !== targetPts.length) currentPts = [...targetPts];
      morphProg = 0;
    }
    if (morphProg < 1) {
      morphProg = Math.min(1, morphProg + 0.011);
      renderBlob(lerpPts(currentPts, targetPts, ease(morphProg)));
      if (morphProg >= 1) currentPts = targetPts;
    }
    animateOrb(ts);
    animId = requestAnimationFrame(animLoop);
  }

  // Separate orb loop when not animating blob
  function orbLoop(ts) {
    animateOrb(ts);
    if (!animating) requestAnimationFrame(orbLoop);
  }

  function startAnim() {
    animating = true;
    lastMorphAt = performance.now() - MORPH_MS;
    canvasFrame.classList.add('pulsing');
    animateBtn.classList.add('active');
    animIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    animId = requestAnimationFrame(animLoop);
  }

  function stopAnim() {
    animating = false;
    canvasFrame.classList.remove('pulsing');
    animateBtn.classList.remove('active');
    animIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    if (animId) cancelAnimationFrame(animId);
    requestAnimationFrame(orbLoop);
  }

  // ── Randomize ─────────────────────────────────────────────────────────────
  function randomize(spin) {
    if (spin) {
      randomBtn.classList.add('spin');
      setTimeout(() => randomBtn.classList.remove('spin'), 560);
    }
    const n     = getComplexity();
    const grow  = getGrowth();
    targetPts   = genPoints(n, grow);
    if (!currentPts || currentPts.length !== n) {
      currentPts = genPoints(n, grow);
    }
    if (!animating) {
      // Smooth CSS transition via d attribute interpolation approximation
      morphProg = 0;
      const start = currentPts;
      const end   = targetPts;
      let p = 0;
      function step() {
        p = Math.min(1, p + 0.04);
        renderBlob(lerpPts(start, end, ease(p)));
        if (p < 1) requestAnimationFrame(step);
        else currentPts = end;
      }
      requestAnimationFrame(step);
    }
  }

  // ── Color ─────────────────────────────────────────────────────────────────
  function applyColor(hex) {
    color = hex;
    colorPicker.value = hex;
    colorDot.style.background  = hex;
    hexDisplay.textContent     = hex.toUpperCase();
    if (statColor)  statColor.textContent = hex.toUpperCase();
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-dim',  hexToRgba(hex, 0.18));
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.35));
    updateSliders();
    if (currentPts) renderBlob(currentPts);
  }

  function hexToRgba(hex, a) {
    hex = hex.replace('#','');
    if (hex.length===3) hex = hex.split('').map(c=>c+c).join('');
    const n = parseInt(hex,16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }

  function updateSliders() {
    [complexitySlider, growthSlider].forEach(sl => {
      const pct = ((sl.value - sl.min) / (sl.max - sl.min)) * 100;
      sl.style.background = `linear-gradient(to right, ${color} ${pct}%, var(--border2) ${pct}%)`;
    });
  }

  function updateStats() {
    if (statPoints) statPoints.textContent = complexitySlider.value;
    if (statGrowth) statGrowth.textContent = growthSlider.value + '%';
    if (statColor)  statColor.textContent  = color.toUpperCase();
    complexityVal.textContent = complexitySlider.value;
    growthVal.textContent     = growthSlider.value + '%';
  }

  // ── Theme toggle ──────────────────────────────────────────────────────────
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') !== 'light';
    root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function getSvg() {
    return `<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">\n  <path d="${blobPath.getAttribute('d')}" fill="${color}" />\n</svg>`;
  }

  function copySvg() {
    const code = getSvg();
    (navigator.clipboard?.writeText(code) ?? Promise.reject()).then(() => {
      showToast('✓ SVG copied!');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('✓ SVG copied!');
    });
  }

  function downloadPng() {
    const svg  = getSvg();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const cv = Object.assign(document.createElement('canvas'), { width: 800, height: 800 });
      const cx = cv.getContext('2d');
      cx.fillStyle = '#ffffff';
      cx.fillRect(0, 0, 800, 800);
      cx.drawImage(img, 0, 0, 800, 800);
      URL.revokeObjectURL(url);
      Object.assign(document.createElement('a'), { download: 'blob.png', href: cv.toDataURL() }).click();
      showToast('✓ PNG downloaded!');
    };
    img.src = url;
  }

  function shareBlob() {
    if (navigator.share) {
      navigator.share({ title: 'BlobCraft', text: 'Check out my blob!', url: location.href }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(location.href).then(() => showToast('✓ Link copied!'));
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ── Drawer (mobile) ───────────────────────────────────────────────────────
  function openDrawer() {
    drawer.classList.add('open');
    drawerOverlay.classList.add('show');
    menuToggle.classList.add('open');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawerOverlay.classList.remove('show');
    menuToggle.classList.remove('open');
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  colorPicker.addEventListener('input', () => applyColor(colorPicker.value));
  colorDot.parentElement.addEventListener('click', () => colorPicker.click());

  complexitySlider.addEventListener('input', () => { updateSliders(); updateStats(); randomize(false); });
  growthSlider.addEventListener('input',     () => { updateSliders(); updateStats(); randomize(false); });

  animateBtn.addEventListener('click', () => animating ? stopAnim() : startAnim());
  randomBtn.addEventListener('click', () => randomize(true));
  svgBtn.addEventListener('click', copySvg);
  pngBtn.addEventListener('click', downloadPng);
  shareBtn?.addEventListener('click', shareBlob);
  headerExport?.addEventListener('click', downloadPng);
  themeToggle?.addEventListener('click', toggleTheme);

  menuToggle?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);
  drawerShare?.addEventListener('click', () => { shareBlob(); closeDrawer(); });
  drawerExport?.addEventListener('click', () => { downloadPng(); closeDrawer(); });
  drawerSvg?.addEventListener('click', () => { copySvg(); closeDrawer(); });
  drawerTheme?.addEventListener('click', () => { toggleTheme(); closeDrawer(); });

  canvasFrame.addEventListener('click', () => randomize(true));

  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'r') randomize(true);
    if (k === 'a') animating ? stopAnim() : startAnim();
    if (k === 's') copySvg();
    if (k === 'd') downloadPng();
    if (k === 't') toggleTheme();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    updateSliders();
    updateStats();
    currentPts = genPoints(getComplexity(), getGrowth());
    renderBlob(currentPts);
    targetPts  = currentPts;
    orbPts     = genOrbPts();
    if (orbPath) orbPath.setAttribute('d', toOrbPath(orbPts));
    requestAnimationFrame(orbLoop);
  }

  init();
})();
