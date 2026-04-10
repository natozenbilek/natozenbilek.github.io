// ── Scroll reveal ──
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

// ── Correlation network: normal ↔ crisis breathing cycle ──
(function() {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  let W, H;

  // Sektör renkleri (SVG figürdeki palette ile uyumlu)
  const SECTORS = [
    { color: [44, 95, 124],  cx: 0.18, cy: 0.30 },  // mavi — finans
    { color: [139, 58, 58],  cx: 0.50, cy: 0.25 },   // kırmızı — enerji
    { color: [58, 107, 74],  cx: 0.80, cy: 0.35 },   // yeşil — teknoloji
    { color: [100, 80, 120], cx: 0.35, cy: 0.72 },   // mor — sağlık
    { color: [85, 85, 85],   cx: 0.68, cy: 0.75 },   // gri — sanayi
  ];
  const CRISIS_COL = [60, 40, 40];

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t)]; }

  // Düğümler — sektör kümeleri etrafında dağılım
  const nodes = [];
  const NODES_PER_SECTOR = 7;
  SECTORS.forEach((sec, si) => {
    for (let j = 0; j < NODES_PER_SECTOR; j++) {
      const angle = (j / NODES_PER_SECTOR) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 0.06 + Math.random() * 0.08;
      nodes.push({
        sector: si,
        nx: sec.cx + Math.cos(angle) * dist,
        ny: sec.cy + Math.sin(angle) * dist * 0.7,
        baseX: 0, baseY: 0, x: 0, y: 0,
        r: 2.5 + Math.random() * 1.5,
        ph: Math.random() * Math.PI * 2,
        sp: 0.0004 + Math.random() * 0.0008,
        ax: 1.0 + Math.random() * 1.5,
        ay: 0.8 + Math.random() * 1.2,
        highlight: 0,
      });
    }
  });

  // Kenarlar: intra-cluster (güçlü) + inter-cluster (zayıf)
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].nx - nodes[j].nx, dy = nodes[i].ny - nodes[j].ny;
      const d = Math.sqrt(dx * dx + dy * dy);
      const sameSector = nodes[i].sector === nodes[j].sector;
      if (sameSector && d < 0.20) {
        edges.push({ a: i, b: j, intra: true, baseW: 0.6 + Math.random() * 0.4 });
      } else if (!sameSector && d < 0.22 && Math.random() < 0.15) {
        edges.push({ a: i, b: j, intra: false, baseW: 0.3 + Math.random() * 0.3 });
      }
    }
  }
  // Adjacency
  const adj = Array.from({ length: nodes.length }, () => []);
  edges.forEach((e, i) => { adj[e.a].push({ node: e.b, edge: i }); adj[e.b].push({ node: e.a, edge: i }); });

  // Kriz döngüsü
  let crisisPhase = 0;  // 0 = normal, ramps up to 1 during crisis
  let crisisTimer = 0;
  const NORMAL_DUR = 480;   // ~8s normal
  const RAMP_UP = 180;      // ~3s kriz geliyor
  const PEAK_DUR = 120;     // ~2s kriz tepesi
  const RAMP_DOWN = 240;    // ~4s normale dönüş
  const CYCLE = NORMAL_DUR + RAMP_UP + PEAK_DUR + RAMP_DOWN;
  let hubNode = -1;

  // Şok dalgası
  let shockOrigin = { x: 0, y: 0 };
  let shockAge = -1;
  const SHOCK_SPEED = 3.5;
  const SHOCK_MAX = 600;

  function pickHub() {
    hubNode = Math.floor(Math.random() * nodes.length);
    shockOrigin = { x: nodes[hubNode].x, y: nodes[hubNode].y };
    shockAge = 0;
  }

  // Fare
  let mouse = { x: -1e3, y: -1e3 };
  let nearestNode = -1;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes.forEach(n => { n.baseX = n.nx * W; n.baseY = n.ny * H; });
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / r.width);
    mouse.y = (e.clientY - r.top) * (H / r.height);
  });
  canvas.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1e3; });

  const NET_SCALE = 0.9;

  let t = 0;
  (function draw() {
    t++;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.scale(NET_SCALE, NET_SCALE);
    ctx.translate(-W * 0.5, -H * 0.5);

    // Kriz döngüsü fazı
    crisisTimer = (crisisTimer + 1) % CYCLE;
    if (crisisTimer < NORMAL_DUR) {
      crisisPhase = Math.max(0, crisisPhase - 0.006);
    } else if (crisisTimer === NORMAL_DUR) {
      pickHub();
    }
    if (crisisTimer >= NORMAL_DUR && crisisTimer < NORMAL_DUR + RAMP_UP) {
      crisisPhase = Math.min(1, crisisPhase + 1 / RAMP_UP);
    } else if (crisisTimer >= NORMAL_DUR + RAMP_UP && crisisTimer < NORMAL_DUR + RAMP_UP + PEAK_DUR) {
      crisisPhase = 1;
    } else if (crisisTimer >= NORMAL_DUR + RAMP_UP + PEAK_DUR) {
      crisisPhase = Math.max(0, crisisPhase - 1 / RAMP_DOWN);
    }
    const cp = crisisPhase;

    // Şok dalgası
    if (shockAge >= 0 && shockAge < SHOCK_MAX) shockAge++;

    // Pozisyonlar — kriz sırasında hafifçe merkeze çekilme
    const centerX = W * 0.5, centerY = H * 0.5;
    nodes.forEach((n, i) => {
      const bx = n.baseX + Math.sin(t * n.sp + n.ph) * n.ax;
      const by = n.baseY + Math.cos(t * n.sp * 0.7 + n.ph) * n.ay;
      const pullX = lerp(bx, centerX, cp * 0.12);
      const pullY = lerp(by, centerY, cp * 0.12);
      n.x = pullX;
      n.y = pullY;
      n.highlight = Math.max(0, n.highlight - 0.03);
    });

    // En yakın düğümü bul (ego-network highlight için)
    nearestNode = -1;
    let minD = 70;
    nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
      if (d < minD) { minD = d; nearestNode = i; }
    });
    if (nearestNode >= 0) {
      nodes[nearestNode].highlight = 1;
      adj[nearestNode].forEach(a => { nodes[a.node].highlight = Math.max(nodes[a.node].highlight, 0.6); });
    }

    // ── Kenarlar ──
    edges.forEach((e, ei) => {
      const na = nodes[e.a], nb = nodes[e.b];
      const secA = SECTORS[na.sector], secB = SECTORS[nb.sector];

      // Hover highlight
      let hov = 0;
      if (nearestNode >= 0 && (e.a === nearestNode || e.b === nearestNode)) hov = 1;

      let alpha, width, col;

      if (e.intra) {
        const baseCol = secA.color;
        col = lerp3(baseCol, CRISIS_COL, cp * 0.7);
        alpha = lerp(0.12, 0.30, cp) + hov * 0.2;
        width = lerp(e.baseW * 0.7, e.baseW * 1.4, cp) + hov * 0.4;
      } else {
        col = lerp3([170, 170, 170], CRISIS_COL, cp);
        alpha = lerp(0.0, 0.22, cp) + hov * 0.15;
        width = lerp(0, e.baseW * 1.2, cp) + hov * 0.3;
      }

      if (alpha < 0.005) return;

      // Inter-cluster: dashed in normal, solid in crisis
      if (!e.intra && cp < 0.5) ctx.setLineDash([3, 4]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = rgba(col, alpha);
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Şok dalgası halkası ──
    if (shockAge >= 0 && shockAge < SHOCK_MAX) {
      const radius = shockAge * SHOCK_SPEED;
      const fade = Math.max(0, 1 - shockAge / SHOCK_MAX);
      ctx.beginPath();
      ctx.arc(shockOrigin.x, shockOrigin.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(CRISIS_COL, fade * 0.12);
      ctx.lineWidth = 1.5 * fade;
      ctx.stroke();
      if (radius > 20) {
        ctx.beginPath();
        ctx.arc(shockOrigin.x, shockOrigin.y, radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(CRISIS_COL, fade * 0.06);
        ctx.lineWidth = 0.8 * fade;
        ctx.stroke();
      }
    }

    // ── Düğümler ──
    nodes.forEach((n, i) => {
      const sec = SECTORS[n.sector];
      const col = lerp3(sec.color, CRISIS_COL, cp * 0.6);
      const isHub = (i === hubNode && cp > 0.3);
      const r = isHub ? lerp(n.r, n.r * 2.2, cp) : n.r;
      const hov = n.highlight;

      // Dolgu
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, lerp(0.35, 0.65, cp) + hov * 0.25);
      ctx.fill();

      // Çerçeve
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(col, lerp(0.25, 0.55, cp) + hov * 0.3);
      ctx.lineWidth = 0.7 + hov * 0.5;
      ctx.stroke();

      // Hub glow
      if (isHub) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 6 * cp, 0, Math.PI * 2);
        ctx.fillStyle = rgba(CRISIS_COL, cp * 0.08);
        ctx.fill();
      }
    });

    ctx.restore();
    requestAnimationFrame(draw);
  })();
})();
