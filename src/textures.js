/* ============================================================
 * textures.js — 全程序化贴图（Canvas 生成，零外部资源）
 * 依赖全局 THREE（vendor/three.min.js）
 * ============================================================ */
(function () {
  'use strict';
  const T = {};

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function toTex(c, opt) {
    opt = opt || {};
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (opt.repeat) t.repeat.set(opt.repeat[0], opt.repeat[1]);
    if (opt.clamp) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    if (opt.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true;
    return t;
  }

  /* ---------- 木墙板（横向壁板） ---------- */
  T.woodWall = function (seed) {
    const R = rng(seed || 7);
    const W = 512, H = 512, rows = 8, hh = H / rows;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#6b5236'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < rows; i++) {
      const y = i * hh;
      const tone = 0.86 + R() * 0.26;
      g.fillStyle = 'rgb(' + Math.round(126 * tone) + ',' + Math.round(96 * tone) + ',' + Math.round(63 * tone) + ')';
      g.fillRect(0, y, W, hh - 1);
      // 木纹
      for (let k = 0; k < 46; k++) {
        const yy = y + 3 + R() * (hh - 7);
        g.strokeStyle = 'rgba(' + (52 + R() * 26 | 0) + ',' + (36 + R() * 18 | 0) + ',' + (20 + R() * 12 | 0) + ',' + (0.05 + R() * 0.12).toFixed(3) + ')';
        g.lineWidth = 0.5 + R() * 1.4;
        g.beginPath();
        g.moveTo(0, yy);
        const amp = 0.6 + R() * 2.2, ph = R() * 6.28;
        for (let x = 0; x <= W; x += 24) g.lineTo(x, yy + Math.sin(x * 0.015 + ph) * amp);
        g.stroke();
      }
      // 顶部受光 / 底部阴影
      const grad = g.createLinearGradient(0, y, 0, y + hh);
      grad.addColorStop(0, 'rgba(255,230,190,0.18)');
      grad.addColorStop(0.12, 'rgba(255,230,190,0.02)');
      grad.addColorStop(0.85, 'rgba(30,18,8,0.05)');
      grad.addColorStop(1, 'rgba(20,12,5,0.35)');
      g.fillStyle = grad; g.fillRect(0, y, W, hh - 1);
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* ---------- 屋顶瓦片 ---------- */
  T.roofShingles = function (seed) {
    const R = rng(seed || 21);
    const W = 512, H = 512, rows = 11, rh = H / rows, sw = 74;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#2f3436'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      const off = (r % 2) * sw * 0.5;
      for (let x = -sw; x < W + sw; x += sw) {
        const px = x + off + R() * 3;
        const tone = 0.78 + R() * 0.5;
        const base = [64, 70, 72].map(v => Math.min(255, Math.round(v * tone)));
        g.fillStyle = 'rgb(' + base.join(',') + ')';
        g.beginPath();
        const rr = 3;
        g.moveTo(px + rr, y + 1);
        g.lineTo(px + sw - rr, y + 1);
        g.quadraticCurveTo(px + sw, y + 1, px + sw, y + 1 + rr);
        g.lineTo(px + sw, y + rh - 4);
        g.quadraticCurveTo(px + sw, y + rh, px + sw - rr, y + rh);
        g.lineTo(px + rr, y + rh);
        g.quadraticCurveTo(px, y + rh, px, y + rh - 4);
        g.lineTo(px, y + 1 + rr);
        g.quadraticCurveTo(px, y + 1, px + rr, y + 1);
        g.closePath();
        g.fill();
        // 瓦片下缘高光
        g.fillStyle = 'rgba(180,192,196,' + (0.05 + R() * 0.10).toFixed(3) + ')';
        g.fillRect(px + 2, y + 2, sw - 4, 2);
        g.fillStyle = 'rgba(8,10,10,0.35)';
        g.fillRect(px, y + rh - 3, sw, 3);
        // 苔痕
        if (R() < 0.18) {
          g.fillStyle = 'rgba(74,84,52,' + (0.10 + R() * 0.16).toFixed(3) + ')';
          g.beginPath();
          g.ellipse(px + R() * sw, y + rh * (0.3 + R() * 0.5), 6 + R() * 12, 2 + R() * 4, R() * 3, 0, 6.28);
          g.fill();
        }
      }
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* ---------- 石板路铺装 ---------- */
  T.flagstones = function (seed) {
    const R = rng(seed || 1234);
    const W = 512, H = 512, grid = 5, cell = W / grid;
    const c = canvas(W, H), g = c.getContext('2d');
    // 石缝底色
    g.fillStyle = '#33322a'; g.fillRect(0, 0, W, H);
    const pts = [];
    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        pts.push({
          x: gx * cell + cell * 0.5 + (R() - 0.5) * cell * 0.62,
          y: gy * cell + cell * 0.5 + (R() - 0.5) * cell * 0.62,
        });
      }
    }
    for (const p of pts) {
      const n = 6 + ((R() * 3) | 0);
      const baseR = cell * (0.36 + R() * 0.16);
      const shade = 0.66 + R() * 0.55;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + R() * 0.25;
        const r = baseR * (0.82 + R() * 0.36);
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r * 0.92;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.fillStyle = 'rgb(' + Math.round(120 * shade) + ',' + Math.round(116 * shade) + ',' + Math.round(104 * shade) + ')';
      g.fill();
      // 石面颗粒
      for (let k = 0; k < 26; k++) {
        const x = p.x + (R() - 0.5) * baseR * 1.4;
        const y = p.y + (R() - 0.5) * baseR * 1.3;
        const t = 0.7 + R() * 0.7;
        g.fillStyle = 'rgba(' + Math.round(120 * t) + ',' + Math.round(116 * t) + ',' + Math.round(104 * t) + ',' + (0.12 + R() * 0.2).toFixed(2) + ')';
        g.beginPath();
        g.ellipse(x, y, 1 + R() * 5, 1 + R() * 4, R() * 3, 0, 6.28);
        g.fill();
      }
      // 苔藓
      if (R() < 0.55) {
        g.fillStyle = 'rgba(64,82,44,' + (0.10 + R() * 0.22).toFixed(2) + ')';
        g.beginPath();
        g.ellipse(p.x + (R() - 0.5) * baseR, p.y + (R() - 0.5) * baseR, 8 + R() * 22, 5 + R() * 14, R() * 3, 0, 6.28);
        g.fill();
      }
      // 高光边
      g.strokeStyle = 'rgba(160,155,138,0.16)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* ---------- 石材（地基 / 台阶） ---------- */
  T.stone = function (seed) {
    const R = rng(seed || 33);
    const W = 512, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#4a4a44'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const x = R() * W, y = R() * H;
      const w = 18 + R() * 54, h = 12 + R() * 30;
      const tone = 0.7 + R() * 0.55;
      g.fillStyle = 'rgb(' + Math.round(112 * tone) + ',' + Math.round(110 * tone) + ',' + Math.round(100 * tone) + ')';
      g.beginPath();
      g.ellipse(x, y, w * 0.5, h * 0.5, R() * 3, 0, 6.28);
      g.fill();
      g.strokeStyle = 'rgba(24,24,20,' + (0.25 + R() * 0.3).toFixed(2) + ')';
      g.lineWidth = 1 + R() * 1.5;
      g.stroke();
      if (R() < 0.5) {
        g.fillStyle = 'rgba(80,96,56,' + (0.12 + R() * 0.2).toFixed(2) + ')';
        g.beginPath();
        g.ellipse(x + (R() - 0.5) * w * 0.5, y + (R() - 0.5) * h * 0.5, w * 0.28, h * 0.22, R() * 3, 0, 6.28);
        g.fill();
      }
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* ---------- 地面苔藓泥土 ---------- */
  T.ground = function (seed) {
    const R = rng(seed || 55);
    const W = 512, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#232a17'; g.fillRect(0, 0, W, H);
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 900; i++) {
        const x = R() * W, y = R() * H, r = 2 + R() * 16;
        const greens = [[38, 50, 24], [48, 62, 30], [30, 40, 20], [58, 70, 34], [66, 62, 40]];
        const col = greens[(R() * greens.length) | 0];
        g.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.10 + R() * 0.22).toFixed(3) + ')';
        g.beginPath();
        g.ellipse(x, y, r, r * (0.4 + R() * 0.7), R() * 3, 0, 6.28);
        g.fill();
      }
    }
    // 细碎草叶
    for (let i = 0; i < 2600; i++) {
      const x = R() * W, y = R() * H;
      const col = 70 + R() * 70;
      g.strokeStyle = 'rgba(' + Math.round(col * 0.7) + ',' + Math.round(col) + ',' + Math.round(col * 0.45) + ',' + (0.10 + R() * 0.22).toFixed(2) + ')';
      g.lineWidth = 0.7 + R() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 6, y - 2 - R() * 6);
      g.stroke();
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* ---------- 树皮 ---------- */
  T.bark = function (seed) {
    const R = rng(seed || 71);
    const W = 256, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#3d3226'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
      const x = R() * W;
      const w = 1 + R() * 6;
      const tone = 0.6 + R() * 0.8;
      g.fillStyle = 'rgba(' + Math.round(74 * tone) + ',' + Math.round(60 * tone) + ',' + Math.round(44 * tone) + ',' + (0.25 + R() * 0.4).toFixed(2) + ')';
      g.fillRect(x, -10, w, H + 20);
    }
    for (let i = 0; i < 420; i++) {
      const x = R() * W, y = R() * H;
      g.strokeStyle = 'rgba(18,14,10,' + (0.15 + R() * 0.35).toFixed(2) + ')';
      g.lineWidth = 0.6 + R() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 12, y + 6 + R() * 40);
      g.stroke();
    }
    // 苔藓
    for (let i = 0; i < 120; i++) {
      g.fillStyle = 'rgba(74,92,50,' + (0.08 + R() * 0.18).toFixed(2) + ')';
      g.beginPath();
      g.ellipse(R() * W, R() * H, 4 + R() * 16, 3 + R() * 12, R() * 3, 0, 6.28);
      g.fill();
    }
    return toTex(c, { repeat: [1, 1] });
  };

  /* ---------- 树叶团（透明贴图，用于树冠面片） ---------- */
  T.leafCluster = function (seed) {
    const R = rng(seed || 99);
    const W = 512, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    const cx = W / 2, cy = H / 2;
    // 先画一些枝
    g.strokeStyle = 'rgba(46,38,26,0.9)';
    for (let i = 0; i < 9; i++) {
      const a = R() * 6.28, l = 120 + R() * 120;
      g.lineWidth = 2 + R() * 4;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a) * l * 0.5, cy + Math.sin(a) * l * 0.5, cx + Math.cos(a) * l, cy + Math.sin(a) * l);
      g.stroke();
    }
    // 叶片
    for (let i = 0; i < 2600; i++) {
      const a = R() * 6.28;
      const rad = Math.pow(R(), 0.62) * 240;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.92;
      const edge = rad / 238;
      const shade = 0.55 + R() * 0.6;
      const r = Math.round((52 + 58 * shade) * (1 - edge * 0.25));
      const gr = Math.round((74 + 66 * shade) * (1 - edge * 0.2));
      const b = Math.round((34 + 30 * shade) * (1 - edge * 0.15));
      g.save();
      g.translate(x, y);
      g.rotate(R() * 6.28);
      g.fillStyle = 'rgba(' + r + ',' + gr + ',' + b + ',' + (0.85 + R() * 0.15).toFixed(2) + ')';
      g.beginPath();
      g.ellipse(0, 0, 3.4 + R() * 5.6, 1.8 + R() * 3.0, 0, 0, 6.28);
      g.fill();
      g.restore();
    }
    // 边缘柔和淡出：叠一点透明
    const t = toTex(c, { clamp: true });
    return t;
  };

  /* ---------- 草丛卡片 ---------- */
  T.grassTuft = function (seed) {
    const R = rng(seed || 123);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const baseX = 128, baseY = 252;
    for (let i = 0; i < 42; i++) {
      const lean = (R() - 0.5) * 200;
      const h = 60 + R() * 180;
      const tipX = baseX + lean, tipY = baseY - h;
      const ctrlX = baseX + lean * 0.35 + (R() - 0.5) * 20;
      const ctrlY = baseY - h * 0.55;
      const shade = 0.5 + R() * 0.7;
      const col = 'rgb(' + Math.round(46 + 62 * shade) + ',' + Math.round(64 + 78 * shade) + ',' + Math.round(30 + 34 * shade) + ')';
      g.strokeStyle = col;
      g.lineWidth = 1.2 + R() * 3.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(baseX + (R() - 0.5) * 26, baseY);
      g.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      g.stroke();
      // 叶尖发亮
      g.strokeStyle = 'rgba(150,178,92,' + (0.15 + R() * 0.3).toFixed(2) + ')';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(tipX - lean * 0.02, tipY + 6);
      g.lineTo(tipX, tipY);
      g.stroke();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 野花卡片 ---------- */
  T.flowerTuft = function (seed) {
    const R = rng(seed || 321);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const bx = 40 + R() * 176, by = 250 - R() * 16;
      const h = 70 + R() * 130;
      const tx = bx + (R() - 0.5) * 60, ty = by - h;
      g.strokeStyle = 'rgba(64,88,40,0.9)';
      g.lineWidth = 1.4 + R() * 1.5;
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + (R() - 0.5) * 20, by - h * 0.5, tx, ty);
      g.stroke();
      const white = R() < 0.72;
      const petal = white ? [236, 240, 220] : [240, 214, 120];
      const n = 5;
      for (let p = 0; p < n; p++) {
        const a = p / n * 6.28;
        g.fillStyle = 'rgba(' + petal[0] + ',' + petal[1] + ',' + petal[2] + ',' + (0.85 + R() * 0.15).toFixed(2) + ')';
        g.beginPath();
        g.ellipse(tx + Math.cos(a) * 3.4, ty + Math.sin(a) * 3.4, 2.8, 1.9, a, 0, 6.28);
        g.fill();
      }
      g.fillStyle = 'rgba(228,190,90,1)';
      g.beginPath(); g.arc(tx, ty, 1.6, 0, 6.28); g.fill();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 蕨类 ---------- */
  T.fern = function (seed) {
    const R = rng(seed || 456);
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let f = 0; f < 7; f++) {
      const a0 = -1.9 + f * 0.34 + (R() - 0.5) * 0.2;
      const len = 80 + R() * 90;
      const bx = 128, by = 250;
      const ex = bx + Math.cos(a0) * len, ey = by + Math.sin(a0) * len;
      const shade = 0.55 + R() * 0.5;
      g.strokeStyle = 'rgb(' + Math.round(56 + 40 * shade) + ',' + Math.round(84 + 52 * shade) + ',' + Math.round(40 + 24 * shade) + ')';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + Math.cos(a0) * len * 0.5, by + Math.sin(a0) * len * 0.4, ex, ey);
      g.stroke();
      for (let i = 1; i < 12; i++) {
        const t = i / 12;
        const x = bx + Math.cos(a0) * len * t, y = by + Math.sin(a0) * len * t;
        const l = (1 - t) * 20 + 4;
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x - l * 0.7, y - l * 0.5); g.stroke();
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x + l * 0.7, y - l * 0.5); g.stroke();
      }
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 发光窗体（暖光窗户） ---------- */
  T.windowGlow = function () {
    const W = 256, H = 256;
    const c = canvas(W, H), g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 140, 10, 128, 128, 190);
    grad.addColorStop(0, '#fff3cf');
    grad.addColorStop(0.45, '#ffcf87');
    grad.addColorStop(0.8, '#e8893c');
    grad.addColorStop(1, '#7d431d');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // 室内剪影：窗帘/家具
    g.fillStyle = 'rgba(120,58,20,0.42)';
    g.beginPath(); g.moveTo(0, 256); g.lineTo(0, 90); g.quadraticCurveTo(46, 150, 34, 256); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(256, 256); g.lineTo(256, 84); g.quadraticCurveTo(206, 140, 220, 256); g.closePath(); g.fill();
    g.fillStyle = 'rgba(70,32,10,0.55)';
    g.fillRect(0, 214, 256, 42);
    // 窗棂
    g.strokeStyle = '#4a3220'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
    g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
    g.strokeStyle = 'rgba(255,236,190,0.35)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 120); g.lineTo(256, 120); g.stroke();
    // 外框
    g.strokeStyle = '#2b1c10'; g.lineWidth = 18; g.strokeRect(0, 0, W, H);
    return toTex(c, { clamp: true });
  };

  /* ---------- 光晕贴图 ---------- */
  T.glow = function (softness) {
    const W = 128, H = 128;
    const c = canvas(W, H), g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    const k = softness || 0.5;
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(k * 0.5, 'rgba(255,240,210,0.65)');
    grad.addColorStop(k, 'rgba(255,215,160,0.22)');
    grad.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    return toTex(c, { clamp: true });
  };

  /* ---------- 烟雾 ---------- */
  T.smoke = function (seed) {
    const R = rng(seed || 888);
    const W = 128, H = 128;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const x = 64 + (R() - 0.5) * 54, y = 64 + (R() - 0.5) * 54;
      const r = 14 + R() * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(220,220,214,0.20)');
      grad.addColorStop(1, 'rgba(220,220,214,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 地面横向雾 ---------- */
  T.mist = function (seed) {
    const R = rng(seed || 654);
    const W = 512, H = 128;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      const x = R() * W, y = 40 + R() * 70, r = 40 + R() * 110;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(226,228,208,0.13)');
      grad.addColorStop(1, 'rgba(226,228,208,0)');
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(x, y, r, r * 0.32, 0, 0, 6.28); g.fill();
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 体积光柱 ---------- */
  T.shaft = function () {
    const W = 128, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,238,200,0.0)');
    grad.addColorStop(0.35, 'rgba(255,238,200,0.20)');
    grad.addColorStop(0.75, 'rgba(255,232,190,0.10)');
    grad.addColorStop(1, 'rgba(255,232,190,0.0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(W * 0.30, 0); g.lineTo(W * 0.70, 0); g.lineTo(W * 0.98, H); g.lineTo(W * 0.02, H); g.closePath();
    g.fill();
    // 柔化横向边缘
    const fade = g.createLinearGradient(0, 0, W, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.25, 'rgba(0,0,0,0)');
    fade.addColorStop(0.75, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = fade; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    return toTex(c, { clamp: true });
  };

  /* ---------- 远景树林剪影 ---------- */
  T.treeline = function (seed) {
    const R = rng(seed || 2024);
    const W = 2048, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    for (let layer = 0; layer < 3; layer++) {
      const alpha = [0.35, 0.6, 0.85][layer];
      const shade = [0.62, 0.5, 0.38][layer];
      for (let i = 0; i < 46; i++) {
        const x = R() * W;
        const h = 110 + R() * (320 - layer * 60);
        const w = 26 + R() * 70;
        const baseY = H - 20 - R() * 40;
        const col = 'rgba(' + Math.round(64 * shade) + ',' + Math.round(80 * shade) + ',' + Math.round(52 * shade) + ',' + alpha.toFixed(2) + ')';
        g.fillStyle = col;
        // 树干
        g.fillRect(x - w * 0.08, baseY - h, w * 0.16, h);
        // 树冠（几团椭圆）
        for (let k = 0; k < 5; k++) {
          const cy = baseY - h + R() * h * 0.5;
          const cr = w * (0.4 + R() * 0.7);
          g.beginPath();
          g.ellipse(x + (R() - 0.5) * w * 0.8, cy, cr, cr * 0.8, 0, 0, 6.28);
          g.fill();
        }
      }
    }
    return toTex(c, { clamp: true });
  };

  /* ---------- 木门 ---------- */
  T.door = function (seed) {
    const R = rng(seed || 777);
    const W = 256, H = 512;
    const c = canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#4a3826'; g.fillRect(0, 0, W, H);
    const planks = 5, pw = W / planks;
    for (let i = 0; i < planks; i++) {
      const tone = 0.82 + R() * 0.3;
      g.fillStyle = 'rgb(' + Math.round(96 * tone) + ',' + Math.round(72 * tone) + ',' + Math.round(48 * tone) + ')';
      g.fillRect(i * pw + 1, 0, pw - 2, H);
      for (let k = 0; k < 24; k++) {
        g.strokeStyle = 'rgba(40,28,16,' + (0.08 + R() * 0.16).toFixed(2) + ')';
        g.lineWidth = 0.6 + R();
        const yy = R() * H;
        g.beginPath(); g.moveTo(i * pw + 3, yy); g.lineTo(i * pw + pw - 3, yy + (R() - 0.5) * 10); g.stroke();
      }
      g.fillStyle = 'rgba(20,12,6,0.5)';
      g.fillRect(i * pw, 0, 2, H);
    }
    // 横向加固木条
    for (const y of [110, 330]) {
      g.fillStyle = 'rgba(52,38,24,0.95)';
      g.fillRect(8, y, W - 16, 26);
      g.fillStyle = 'rgba(140,110,74,0.35)';
      g.fillRect(8, y, W - 16, 3);
    }
    // 铁艺铰链
    for (const y of [120, 340]) {
      g.fillStyle = '#26221d';
      g.fillRect(16, y - 6, 66, 12);
      g.beginPath(); g.arc(20, y, 7, 0, 6.28); g.fill();
    }
    // 门把手
    g.fillStyle = '#8c7a52';
    g.beginPath(); g.arc(W - 34, H * 0.5 + 20, 9, 0, 6.28); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.5)';
    g.beginPath(); g.arc(W - 37, H * 0.5 + 16, 3, 0, 6.28); g.fill();
    return toTex(c, { clamp: true });
  };

  window.FOREST_TEX = T;
})();
