/**
 * waves.js — Advanced multi-layer animated wave system
 * Supports dark/light theme switching via data-theme attribute.
 */
(function () {
  const canvas = document.getElementById('waveCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, t = 0;
  let mouse = { x: 0.5, y: 0.8 };

  const layers = [
    { amp: 0.055, freq: 1.4, spd: 0.00075, phase: 0,           yBase: 0.70, alpha: [0.09, 0.03] },
    { amp: 0.040, freq: 2.0, spd: 0.00120, phase: Math.PI*0.6, yBase: 0.76, alpha: [0.06, 0.02] },
    { amp: 0.065, freq: 1.1, spd: 0.00055, phase: Math.PI*1.2, yBase: 0.82, alpha: [0.12, 0.04] },
    { amp: 0.032, freq: 2.6, spd: 0.00180, phase: Math.PI*1.8, yBase: 0.87, alpha: [0.07, 0.02] },
    { amp: 0.050, freq: 0.8, spd: 0.00045, phase: Math.PI*0.3, yBase: 0.93, alpha: [0.15, 0.05] },
    { amp: 0.025, freq: 3.0, spd: 0.00220, phase: Math.PI*0.9, yBase: 0.10, alpha: [0.04, 0.01], flip: true },
    { amp: 0.030, freq: 1.6, spd: 0.00100, phase: Math.PI*1.5, yBase: 0.06, alpha: [0.06, 0.02], flip: true },
  ];

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function getAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FF0066';
  }

  function hexToRgb(hex) {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    const n = parseInt(hex, 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }

  function noiseVal(x, y) {
    return Math.sin(x*1.3+y*2.1)*0.4 + Math.sin(x*2.7-y*1.4)*0.3 + Math.sin(x*0.8+y*3.2)*0.3;
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function drawWave(layer, ts) {
    const { amp, freq, spd, phase, yBase, alpha, flip } = layer;
    const yMid    = (yBase + (mouse.y - 0.5) * 0.03) * H;
    const ampPx   = amp * H;
    const mInfluence = (mouse.x - 0.5) * 0.018;
    const steps   = Math.ceil(W / 2) + 2;
    const step    = W / (steps - 1);

    const [r, g, b] = hexToRgb(getAccent());

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x  = i * step;
      const nx = (x / W) * freq * Math.PI * 2;
      const main = Math.sin(nx + ts * spd * 1000 + phase);
      const harm = Math.sin(nx * 2.1 + ts * spd * 750 + phase * 1.3) * 0.35;
      const nz   = noiseVal(nx * 0.5 + ts * 0.0003, ts * 0.0002) * 0.22;
      const mw   = Math.sin(nx + mInfluence * Math.PI) * mInfluence * 0.5;
      const y    = yMid + ampPx * (main + harm + nz + mw);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    flip ? (ctx.lineTo(W,0), ctx.lineTo(0,0)) : (ctx.lineTo(W,H), ctx.lineTo(0,H));
    ctx.closePath();

    const dark = isDark();
    const mult = dark ? 1 : 0.5;
    const grad = ctx.createLinearGradient(0, yMid - ampPx, 0, flip ? 0 : H);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha[0]*mult})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},${alpha[1]*mult})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawOrbs(ts) {
    const [r, g, b] = hexToRgb(getAccent());
    const dark = isDark();
    const defs = [
      { x:0.12, y:0.85, r:0.28, spd:0.00011 },
      { x:0.88, y:0.75, r:0.22, spd:0.00017 },
      { x:0.50, y:0.92, r:0.32, spd:0.00009 },
    ];
    defs.forEach((o, i) => {
      const ox = o.x * W + Math.sin(ts * o.spd + i * 2.1) * W * 0.045;
      const oy = o.y * H + Math.cos(ts * o.spd * 0.7 + i) * H * 0.03;
      const radius = o.r * Math.min(W, H);
      const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
      const a = dark ? 0.07 : 0.05;
      grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(ox - radius, oy - radius, radius*2, radius*2);
    });
  }

  function drawParticles(ts) {
    const [r, g, b] = hexToRgb(getAccent());
    for (let i = 0; i < 14; i++) {
      const seed = i * 137.508;
      const px = ((Math.sin(seed)*0.5+0.5)*W + Math.sin(ts*0.00014+seed)*38) % W;
      const py = (Math.cos(seed*0.7)*0.5+0.5)*H*0.55 + H*0.22 + Math.cos(ts*0.00019+seed*0.5)*22;
      const rad = 1.4 + Math.sin(ts*0.0009+seed)*0.7;
      const a   = 0.07 + Math.sin(ts*0.0007+seed)*0.03;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fill();
    }
  }

  function render(timestamp) {
    t = timestamp;
    ctx.clearRect(0, 0, W, H);
    drawOrbs(t);
    for (let i = layers.length - 1; i >= 0; i--) drawWave(layers[i], t);
    drawParticles(t);
    requestAnimationFrame(render);
  }

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  });
  window.addEventListener('touchmove', e => {
    if (e.touches.length) {
      mouse.x = e.touches[0].clientX / window.innerWidth;
      mouse.y = e.touches[0].clientY / window.innerHeight;
    }
  }, { passive: true });
  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(render);
})();
