/* ============================================================
 * main.js — 程序化「雾林小屋」Three.js 场景
 * 所有几何体 / 贴图 / 粒子均由代码生成，无外部资源
 * ============================================================ */
(function () {
  'use strict';

  const T = window.FOREST_TEX;
  const Q = new URLSearchParams(location.search);
  const UI = Q.get('ui') !== '0';

  const errors = [];
  window.__errors = errors;
  function showError(msg) {
    errors.push(String(msg));
    const box = document.getElementById('err');
    if (box) { box.style.display = 'block'; box.textContent = '场景错误：\n' + errors.join('\n'); }
  }
  window.addEventListener('error', (e) => showError(e.message));
  window.addEventListener('unhandledrejection', (e) => showError((e.reason && e.reason.message) || e.reason));

  /* ---------------- 基础工具 ---------------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20261018);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputEncoding = THREE.LinearEncoding;

  const FOG_COLOR = new THREE.Color(0x8b8a6b);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR.getHex(), 0.016);
  scene.background = FOG_COLOR.clone();

  const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 600);

  /* ---------------- 天空 ---------------- */
  (function sky() {
    const geo = new THREE.SphereGeometry(260, 24, 16);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cTop = new THREE.Color(0xc6c1a0);
    const cMid = new THREE.Color(0xb4b08f);
    const cBot = FOG_COLOR;
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = clamp(pos.getY(i) / 260, -0.2, 1);
      if (y > 0.22) tmp.copy(cMid).lerp(cTop, clamp((y - 0.22) / 0.55, 0, 1));
      else tmp.copy(cBot).lerp(cMid, clamp((y + 0.05) / 0.27, 0, 1));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -10;
    scene.add(mesh);
    // 太阳光晕
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.glow(0.4), color: 0xffdfae, blending: THREE.AdditiveBlending,
      transparent: true, opacity: 0.75, depthWrite: false, fog: false,
    }));
    glow.position.set(-88, 62, -195);
    glow.scale.set(240, 240, 1);
    scene.add(glow);
  })();

  /* ---------------- 灯光 ---------------- */
  const hemi = new THREE.HemisphereLight(0xbfc6a6, 0x10150d, 0.40);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd8a2, 1.8);
  sun.position.set(-18, 26, -26);
  sun.target.position.set(0, 3.0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x93a68c, 0.16);
  fill.position.set(10, 8, 22);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffc78a, 0.18);
  rim.position.set(4, 6, -18);
  scene.add(rim);

  /* ---------------- 地面 ---------------- */
  (function ground() {
    const tex = T.ground();
    tex.repeat.set(70, 70);
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0x59634a, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.receiveShadow = true;
    scene.add(mesh);
    // 近处落叶/泥土色斑
    const patchTex = T.ground(77);
    patchTex.repeat.set(6, 6);
    const patch = new THREE.Mesh(new THREE.CircleGeometry(26, 40), new THREE.MeshStandardMaterial({
      map: patchTex, color: 0x7f7a5d, roughness: 1, transparent: true, opacity: 0.34, depthWrite: false,
    }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0, 0.005, 6);
    patch.receiveShadow = true;
    scene.add(patch);
  })();

  /* ---------------- 共享材质 ---------------- */
  const wallTex = T.woodWall(7); wallTex.repeat.set(2.6, 1.1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xa8947a, roughness: 0.92 });
  const trimTex = T.woodWall(13); trimTex.repeat.set(0.8, 0.8);
  const trimMat = new THREE.MeshStandardMaterial({ map: trimTex, color: 0x6b563a, roughness: 0.9 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ map: trimTex, color: 0x4f3a26, roughness: 0.9 });
  const roofTex = T.roofShingles(21); roofTex.repeat.set(3.2, 1.6);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, color: 0x8b9498, roughness: 0.95, metalness: 0.02 });
  const stoneTex = T.stone(33); stoneTex.repeat.set(2, 1);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xa8a696, roughness: 1 });
  const doorTex = T.door(777);
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, color: 0xc7b08a, roughness: 0.9 });
  const windowTex = T.windowGlow();
  const windowMat = new THREE.MeshStandardMaterial({
    map: windowTex, emissiveMap: windowTex, emissive: 0xffa855, emissiveIntensity: 0.75, roughness: 0.6,
  });
  const glowTex = T.glow(0.5);
  const leafTex = T.leafCluster(99);
  const leafMats = [
    new THREE.MeshStandardMaterial({ map: leafTex, color: 0xa8b98d, roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: leafTex, color: 0x8fa077, roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ map: leafTex, color: 0x6f835c, roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide }),
  ];
  const leafBlobMats = [0x2c3a26, 0x35432c, 0x283522].map(function (c) {
    return new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
  });
  const leafBlobGeo = new THREE.IcosahedronGeometry(1, 1);
  const barkTex = T.bark(71);

  const smokeTex = T.smoke(888);
  const mistTex = T.mist(654);
  const shaftTex = T.shaft();

  function addGlowSprite(x, y, z, scale, color, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: color, blending: THREE.AdditiveBlending,
      transparent: true, opacity: opacity == null ? 0.55 : opacity, depthWrite: false, fog: false,
    }));
    s.position.set(x, y, z);
    s.scale.set(scale, scale, 1);
    scene.add(s);
    return s;
  }

  /* ---------------- 小木屋 ---------------- */
  const cabin = new THREE.Group();
  scene.add(cabin);

  function box(w, h, d, mat, x, y, z, cast, recv) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast !== false;
    m.receiveShadow = recv !== false;
    cabin.add(m);
    return m;
  }

  (function buildCabin() {
    // 地基
    box(7.5, 0.55, 5.3, stoneMat, 0, 0.275, 0);
    // 主体
    box(7.0, 3.1, 4.8, wallMat, 0, 2.05, 0);
    // 山墙三角
    const gableMat = new THREE.MeshStandardMaterial({ map: trimTex, color: 0xb59a76, roughness: 0.92, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      const v = new Float32Array([
        sx * 3.5, 3.6, -2.4,
        sx * 3.5, 3.6, 2.4,
        sx * 3.5, 5.5, 0,
      ]);
      g.setAttribute('position', new THREE.BufferAttribute(v, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, gableMat);
      m.castShadow = true; m.receiveShadow = true;
      cabin.add(m);
    }
    // 屋顶：前坡 / 后坡
    const slopeLen = Math.hypot(3.05, 1.85);
    const slopeAngle = Math.atan2(1.85, 3.05);
    for (const dir of [1, -1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.16, slopeLen + 0.35), roofMat);
      roof.position.set(0, 4.575, dir * 1.525);
      roof.rotation.x = dir * slopeAngle;
      roof.castShadow = true; roof.receiveShadow = true;
      cabin.add(roof);
    }
    // 屋脊
    box(8.1, 0.22, 0.32, darkWoodMat, 0, 5.5, 0);
    // 屋檐木板
    box(8.0, 0.14, 0.5, trimMat, 0, 3.62, 2.95);
    box(8.0, 0.14, 0.5, trimMat, 0, 3.62, -2.95);

    // 前坡天窗（老虎窗）
    const dormer = new THREE.Group();
    const dw = 1.5, dh = 1.0;
    const dBox = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 1.0), wallMat);
    dBox.position.set(0, dh / 2, 0);
    dBox.castShadow = true; dBox.receiveShadow = true;
    dormer.add(dBox);
    // 小双坡：屋脊沿 z 方向
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.09, 1.18), roofMat);
      r.position.set(s * 0.43, dh + 0.15, 0);
      r.rotation.z = -s * 0.35;
      r.castShadow = true;
      dormer.add(r);
    }
    // 山墙三角
    for (const s of [-1, 1]) {
      const gGeo = new THREE.BufferGeometry();
      gGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -0.76, dh, 0, 0.76, dh, 0, 0, dh + 0.31, 0,
      ]), 3));
      gGeo.computeVertexNormals();
      const gm = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({
        map: trimTex, color: 0x6b5539, roughness: 0.9, side: THREE.DoubleSide,
      }));
      gm.position.z = s * 0.505;
      dormer.add(gm);
    }
    const dWin = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), windowMat);
    dWin.position.set(0, 0.55, 0.505);
    dormer.add(dWin);
    const dFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.08), trimMat);
    dFrame.position.set(0, 0.55, 0.47);
    dormer.add(dFrame);
    dormer.position.set(0.62, 4.15, 1.62);
    cabin.add(dormer);
    addGlowSprite(0.62, 4.7, 2.2, 0.8, 0xffb066, 0.35);

    // 烟囱
    box(0.9, 2.3, 0.9, stoneMat, -2.35, 5.35, -0.95);
    box(1.06, 0.16, 1.06, new THREE.MeshStandardMaterial({ color: 0x6d6a5c, roughness: 1 }), -2.35, 6.55, -0.95);

    // 门廊地板
    box(7.9, 0.24, 2.35, trimMat, 0, 0.5, 3.35);
    // 门廊顶
    const porchLen = Math.hypot(2.15, 0.5);
    const porchAngle = Math.atan2(0.5, 2.15);
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.12, porchLen), roofMat);
    porchRoof.position.set(0, 3.27, 3.53);
    porchRoof.rotation.x = porchAngle;
    porchRoof.castShadow = true; porchRoof.receiveShadow = true;
    cabin.add(porchRoof);
    // 门廊柱
    for (const x of [-3.55, -1.2, 1.2, 3.55]) {
      box(0.17, 2.55, 0.17, trimMat, x, 1.77, 4.35);
    }
    // 栏杆横杆 + 立柱
    const railMat = trimMat;
    for (const sx of [-1, 1]) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.14), railMat);
      seg.position.set(sx * 2.375, 1.42, 4.35);
      seg.castShadow = true;
      cabin.add(seg);
      for (let i = 0; i < 13; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.07), railMat);
        b.position.set(sx * 2.375 - 1.06 + i * 0.176, 0.99, 4.35);
        b.castShadow = true;
        cabin.add(b);
      }
    }
    // 台阶
    box(2.1, 0.21, 0.55, stoneMat, 0, 0.305, 4.85);
    box(2.3, 0.21, 0.6, stoneMat, 0, 0.105, 5.25);

    // 门
    box(1.02, 2.02, 0.1, doorMat, 0, 1.62, 2.46);
    box(1.2, 2.18, 0.06, trimMat, 0, 1.63, 2.43);
    // 门框
    for (const [w, h, x, y] of [[0.1, 2.2, -0.62, 1.65], [0.1, 2.2, 0.62, 1.65], [1.34, 0.1, 0, 2.72], [1.34, 0.1, 0, 0.6]]) {
      box(w, h, 0.12, trimMat, x, y, 2.47);
    }
    // 花环
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x3e5a2c, roughness: 0.95 }));
    wreath.position.set(0, 1.95, 2.56);
    wreath.castShadow = true;
    cabin.add(wreath);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5),
        new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0xc2452c : 0x4c6b33, roughness: 0.8 }));
      berry.position.set(Math.cos(a) * 0.28, 1.95 + Math.sin(a) * 0.28, 2.6);
      cabin.add(berry);
    }

    // 前窗
    const winPositions = [[-2.3, 1.9], [2.3, 1.9]];
    for (const [wx, wy] of winPositions) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.2), windowMat);
      win.position.set(wx, wy, 2.425);
      cabin.add(win);
      // 窗框
      box(1.3, 0.1, 0.14, trimMat, wx, wy + 0.65, 2.44);
      box(1.3, 0.1, 0.14, trimMat, wx, wy - 0.65, 2.44);
      box(0.1, 1.34, 0.14, trimMat, wx - 0.63, wy, 2.44);
      box(0.1, 1.34, 0.14, trimMat, wx + 0.63, wy, 2.44);
      // 百叶窗
      const shutterMat = new THREE.MeshStandardMaterial({ color: 0x5b6a56, roughness: 0.9 });
      box(0.34, 1.24, 0.06, shutterMat, wx - 0.86, wy, 2.42);
      box(0.34, 1.24, 0.06, shutterMat, wx + 0.86, wy, 2.42);
      // 窗台花箱
      box(1.15, 0.2, 0.3, darkWoodMat, wx, wy - 0.78, 2.52);
      addGlowSprite(wx, wy + 0.05, 2.62, 1.5, 0xffb066, 0.4);
      const pl = new THREE.PointLight(0xffb15c, 1.15, 7, 2);
      pl.position.set(wx, wy + 0.1, 3.2);
      cabin.add(pl);
    }
    // 门廊整体暖光（把门前石板路也照亮）
    const porchLight = new THREE.PointLight(0xff9f52, 1.2, 10, 2);
    porchLight.position.set(0, 2.35, 3.9);
    cabin.add(porchLight);

    // 门廊吊灯
    for (const sx of [-2.75, 2.75]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4),
        new THREE.MeshStandardMaterial({ color: 0x1f1c17, roughness: 0.6, metalness: 0.5 }));
      rod.position.set(sx, 3.02, 4.0);
      cabin.add(rod);
      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.26, 0.19),
        new THREE.MeshStandardMaterial({ color: 0x24211b, roughness: 0.55, metalness: 0.35 }));
      cage.position.set(sx, 2.78, 4.0);
      cabin.add(cage);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb050, emissiveIntensity: 2.6 }));
      bulb.position.set(sx, 2.78, 4.0);
      cabin.add(bulb);
      addGlowSprite(sx, 2.78, 4.02, 1.1, 0xffc078, 0.55);
      const pl = new THREE.PointLight(0xffb866, 1.15, 6, 2);
      pl.position.set(sx, 2.75, 4.05);
      cabin.add(pl);
    }

    // 窗台花
    const flowerTex = T.flowerTuft(321);
    for (const [wx, wy] of winPositions) {
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.5),
          new THREE.MeshStandardMaterial({ map: flowerTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }));
        f.position.set(wx - 0.35 + i * 0.35, wy - 0.62, 2.54);
        cabin.add(f);
      }
    }

    // 门廊杂物：小木箱、南瓜灯
    box(0.5, 0.42, 0.4, darkWoodMat, 3.05, 0.75, 3.6);
    box(0.42, 0.34, 0.36, trimMat, -3.05, 0.72, 3.55);
    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xc9752c, roughness: 0.8, emissive: 0x743505, emissiveIntensity: 0.4 }));
    pumpkin.position.set(-3.05, 0.98, 3.55);
    pumpkin.scale.y = 0.8;
    pumpkin.castShadow = true;
    cabin.add(pumpkin);
  })();

  /* ---------------- 石板路 ---------------- */
  (function path() {
    const R = rng(404);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.05, 0, 18.2),
      new THREE.Vector3(0.8, 0, 14.4),
      new THREE.Vector3(0.4, 0, 11.4),
      new THREE.Vector3(0.14, 0, 8.7),
      new THREE.Vector3(0.0, 0, 6.9),
      new THREE.Vector3(0.0, 0, 4.9),
    ]);
    // 连续石板条带
    const flagTex = T.flagstones(404);
    const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, color: 0x9b917a, roughness: 0.95 });
    flagMat.polygonOffset = true;
    flagMat.polygonOffsetFactor = -2;
    flagMat.polygonOffsetUnits = -2;
    const STEPS = 72;
    const positions = [], uvs = [], indices = [];
    const totalLen = curve.getLength();
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const nx = -tan.z, nz = tan.x;
      const half = 0.84 + 0.09 * Math.sin(t * 9.3) - 0.09 * t;
      const y = 0.028;
      positions.push(p.x + nx * half, y, p.z + nz * half);
      positions.push(p.x - nx * half, y, p.z - nz * half);
      const v = (t * totalLen) / 1.45;
      uvs.push(0, v, 1, v);
    }
    for (let i = 0; i < STEPS; i++) {
      const a = i * 2, b = a + 1, c2 = a + 2, d2 = a + 3;
      indices.push(a, c2, b, b, c2, d2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const ribbon = new THREE.Mesh(geo, flagMat);
    ribbon.receiveShadow = true;
    scene.add(ribbon);

    // 路两侧碎石与青苔石
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const rockMats = [
      new THREE.MeshStandardMaterial({ color: 0x3a392f, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x454335, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x2e2d25, roughness: 1, flatShading: true }),
    ];
    for (let i = 0; i < 64; i++) {
      const t = R();
      const p = curve.getPointAt(t);
      const s = new THREE.Mesh(rockGeo, rockMats[(R() * 3) | 0]);
      const sc = 0.08 + R() * 0.16;
      s.scale.set(sc, sc * 0.5, sc);
      const side = R() < 0.5 ? -1 : 1;
      s.position.set(p.x + side * (0.95 + R() * 0.5), 0.02, p.z + (R() - 0.5) * 1.0);
      s.castShadow = true; s.receiveShadow = true;
      scene.add(s);
    }
  })();

  /* ---------------- 植被：草丛 / 野花 / 蕨类 ---------------- */
  function scatterPlaneInstances(tex, count, area, opts) {
    opts = opts || {};
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, alphaTest: opts.alphaTest || 0.4, side: THREE.DoubleSide,
      roughness: 1, color: opts.color || 0xffffff, depthWrite: true,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count * 2);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const R = rng(opts.seed || 1234);
    let n = 0;
    for (let i = 0; i < count; i++) {
      let x, z, ok = false, tries = 0;
      while (!ok && tries < 24) {
        tries++;
        x = (R() - 0.5) * area.w + area.cx;
        z = (R() - 0.5) * area.h + area.cz;
        ok = opts.filter ? opts.filter(x, z, R) : true;
      }
      if (!ok) continue;
      const s = (opts.min || 0.4) + R() * ((opts.max || 1.0) - (opts.min || 0.4));
      const rot = R() * Math.PI * 2;
      const bright = 0.82 + R() * 0.34;
      col.setRGB(bright, bright * (0.94 + R() * 0.1), bright * 0.9);
      for (let k = 0; k < 2; k++) {
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, rot + k * Math.PI / 2, 0);
        dummy.scale.set(s, s * (0.85 + R() * 0.3), 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        mesh.setColorAt(n, col);
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }

  // 路径中心线近似（用于避让）
  function pathCenterX(z) {
    if (z > 17.5 || z < 5.2) return 999;
    const t = clamp((17.5 - z) / 12.3, 0, 1);
    return lerp(1.0, 0.0, t);
  }

  const grassTuftTex = T.grassTuft(123);
  const flowerTuftTex = T.flowerTuft(77);
  const fernTex = T.fern(456);

  scatterPlaneInstances(grassTuftTex, 3400, { cx: 0, cz: 6, w: 56, h: 46 }, {
    seed: 5150, min: 0.26, max: 0.86, alphaTest: 0.45, color: 0x7a875e,
    filter: (x, z) => {
      if (Math.abs(x) < 4.9 && z > -3.6 && z < 4.0) return false; // 屋子
      if (Math.abs(x - pathCenterX(z)) < 0.95 && z > 5 && z < 18) return false; // 路
      return true;
    },
  });
  // 路两侧的高草（取景框感）
  scatterPlaneInstances(grassTuftTex, 300, { cx: 0, cz: 9, w: 26, h: 22 }, {
    seed: 9999, min: 0.5, max: 0.95, alphaTest: 0.45, color: 0x6a7850,
    filter: (x, z) => {
      if (z < 4.6 || z > 19) return false;
      const d = Math.abs(x - pathCenterX(z));
      if (d < 1.2) return false;
      if (d > 4.2) return false;
      return true;
    },
  });
  scatterPlaneInstances(flowerTuftTex, 330, { cx: 0, cz: 8, w: 26, h: 26 }, {
    seed: 818, min: 0.22, max: 0.5, alphaTest: 0.4, color: 0xdfe3c4,
    filter: (x, z) => {
      if (Math.abs(x) < 4.7 && z > -3.4 && z < 4.2) return false;
      if (Math.abs(x - pathCenterX(z)) < 0.8 && z > 5 && z < 18) return false;
      return true;
    },
  });
  scatterPlaneInstances(fernTex, 160, { cx: 0, cz: 4, w: 34, h: 30 }, {
    seed: 2222, min: 0.4, max: 0.95, alphaTest: 0.4, color: 0x9fb083,
    filter: (x, z) => {
      if (Math.abs(x) < 5.2 && z > -3.8 && z < 4.4) return false;
      if (Math.abs(x - pathCenterX(z)) < 1.0 && z > 4.6 && z < 18) return false;
      return true;
    },
  });

  /* ---------------- 树 ---------------- */
  const treeLeafPlanes = [];
  function makeTree(x, z, s, seed) {
    const R = rng(seed);
    const g = new THREE.Group();
    const h = (7.0 + R() * 4.5) * s;
    const trunkGeo = new THREE.CylinderGeometry(0.18 * s, 0.42 * s, h, 8, 3);
    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, color: 0x6f6453, roughness: 1 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = (R() - 0.5) * 0.1;
    trunk.castShadow = true; trunk.receiveShadow = true;
    g.add(trunk);
    // 树根
    for (let i = 0; i < 4; i++) {
      const a = R() * Math.PI * 2;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.2 * s, 1.1 * s, 5), trunkMat);
      root.position.set(Math.cos(a) * 0.35 * s, 0.25 * s, Math.sin(a) * 0.35 * s);
      root.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      root.castShadow = true;
      g.add(root);
    }
    // 枝干
    for (let i = 0; i < 4; i++) {
      const bh = h * (0.5 + R() * 0.32);
      const a = R() * Math.PI * 2;
      const len = (1.8 + R() * 2.2) * s;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.11 * s, len, 5), trunkMat);
      br.position.set(Math.cos(a) * len * 0.4, bh, Math.sin(a) * len * 0.4);
      br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      br.castShadow = true;
      g.add(br);
    }
    // 树冠面片
    const canopyY = h * 0.86;
    const nPlanes = 22 + ((R() * 8) | 0);
    for (let i = 0; i < nPlanes; i++) {
      const a = R() * Math.PI * 2;
      const rad = (0.2 + R() * 3.3) * s;
      const size = (1.7 + R() * 1.9) * s;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
        leafMats[(R() * leafMats.length) | 0]);
      leaf.position.set(
        Math.cos(a) * rad,
        canopyY + (R() - 0.4) * 3.2 * s,
        Math.sin(a) * rad * 0.9
      );
      leaf.rotation.set((R() - 0.5) * 1.1, R() * Math.PI, (R() - 0.5) * 1.1);
      leaf.receiveShadow = true;
      g.add(leaf);
      treeLeafPlanes.push(leaf);
    }
    // 底部散叶（让树冠更“厚”）
    for (let i = 0; i < 5; i++) {
      const a = R() * Math.PI * 2;
      const rad = (1.6 + R() * 2.2) * s;
      const size = (1.4 + R() * 1.5) * s;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
        leafMats[(R() * leafMats.length) | 0]);
      leaf.position.set(Math.cos(a) * rad, canopyY - (1.2 + R() * 2.0) * s, Math.sin(a) * rad * 0.9);
      leaf.rotation.set((R() - 0.5) * 1.2, R() * Math.PI, (R() - 0.5) * 1.2);
      g.add(leaf);
      treeLeafPlanes.push(leaf);
    }
    g.position.set(x, 0, z);
    g.rotation.y = R() * Math.PI * 2;
    scene.add(g);
    return g;
  }

  // 前景大树（取景框）
  makeTree(-7.6, 8.2, 1.55, 101);
  makeTree(8.4, 7.2, 1.62, 102);
  makeTree(-11.5, 12.5, 1.3, 103);
  makeTree(12.5, 12.0, 1.35, 104);
  makeTree(-8.6, 15.0, 1.2, 105);
  makeTree(9.4, 16.0, 1.25, 106);
  makeTree(-6.9, 13.6, 1.5, 107);
  makeTree(7.8, 13.2, 1.45, 108);
  makeTree(-4.9, 18.5, 1.15, 109);
  makeTree(5.4, 18.0, 1.2, 110);
  makeTree(-4.7, 15.4, 1.3, 111);
  makeTree(5.0, 15.8, 1.32, 112);
  // 小屋后方与两侧
  const treeSpots = [
    [-14, -4], [-10, -9], [-5, -12], [0, -14], [5, -12], [10, -9], [15, -4],
    [-16, 3], [16, 3], [-13, -16], [-4, -20], [4, -21], [12, -17],
    [-20, 10], [20, 9], [-18, 17], [18, 18], [-22, -8], [22, -6],
  ];
  treeSpots.forEach((p, i) => makeTree(p[0], p[1], 0.75 + rand() * 0.55, 200 + i));

  /* ---------------- 头顶树冠 / 前景草框 ---------------- */
  (function overheadCanopy() {
    const R = rng(3131);
    const mat = new THREE.MeshStandardMaterial({
      map: leafTex, color: 0x566b4a, roughness: 1, alphaTest: 0.42, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 16; i++) {
      const size = 4 + R() * 5;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      const side = i % 2 === 0 ? -1 : 1;
      leaf.position.set(side * (3.2 + R() * 6.5), 7.2 + R() * 4.5, 7.5 + R() * 9);
      leaf.rotation.set(-0.55 + R() * 0.7, R() * Math.PI, (R() - 0.5) * 1.2);
      scene.add(leaf);
    }
  })();
  (function foregroundGrass() {
    const R = rng(4242);
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      map: grassTuftTex, color: 0x525f40, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1,
    });
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (3.1 + R() * 4.2);
      const z = 12.2 + R() * 3.4;
      const s = 0.85 + R() * 0.65;
      for (let k = 0; k < 2; k++) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, 0, z);
        m.rotation.y = R() * Math.PI;
        m.scale.set(s, s * (1 + R() * 0.45), 1);
        m.receiveShadow = true;
        scene.add(m);
      }
    }
  })();

  /* ---------------- 远景树林 ---------------- */
  (function treeline() {
    const tex = T.treeline(2024);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, fog: true,
        color: new THREE.Color(0x8c8f76).lerp(new THREE.Color(0x4f5b44), i * 0.18),
        opacity: 0.55,
      });
      const w = 220 - i * 30, h = 44;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set((i % 2 ? -1 : 1) * 10, h / 2 - 2, -34 - i * 16);
      scene.add(m);
    }
    const side = new THREE.Mesh(new THREE.PlaneGeometry(180, 40), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, fog: true, color: 0x77836a, opacity: 0.45,
    }));
    side.position.set(-70, 18, -5);
    side.rotation.y = Math.PI / 2.6;
    scene.add(side);
    const side2 = side.clone();
    side2.position.set(70, 18, -5);
    side2.rotation.y = -Math.PI / 2.6;
    scene.add(side2);
  })();

  /* ---------------- 篱笆 / 鸟屋 / 蘑菇 ---------------- */
  (function gardenProps() {
    const R = rng(909);
    const postMat = new THREE.MeshStandardMaterial({ map: trimTex, color: 0x7a6547, roughness: 0.95 });
    // 左篱笆
    const fence = new THREE.Group();
    const zStart = 6.6, zEnd = 12.8, x = -4.9;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const z = lerp(zStart, zEnd, i / (n - 1));
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 0.1), postMat);
      post.position.set(x, 0.52, z);
      post.castShadow = true;
      fence.add(post);
    }
    for (const y of [0.35, 0.82]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, zEnd - zStart + 0.2), postMat);
      rail.position.set(x, y, (zStart + zEnd) / 2);
      rail.castShadow = true;
      fence.add(rail);
    }
    scene.add(fence);
    // 右侧篱笆
    const fence2 = fence.clone();
    fence2.position.set(2 * 4.95, 0, 1.2);
    scene.add(fence2);

    // 鸟屋
    const bh = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.3, 6), postMat);
    pole.position.y = 1.15;
    pole.castShadow = true;
    bh.add(pole);
    const house = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.34), postMat);
    house.position.y = 2.4;
    house.castShadow = true;
    bh.add(house);
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.42), trimMat);
      r.position.set(s * 0.12, 2.68, 0);
      r.rotation.z = -s * 0.5;
      r.castShadow = true;
      bh.add(r);
    }
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 1 }));
    hole.position.set(0, 2.42, 0.176);
    bh.add(hole);
    bh.position.set(-7.1, 0, 8.6);
    scene.add(bh);

    // 蘑菇
    function mushroomCluster(cx, cz, count, glow) {
      for (let i = 0; i < count; i++) {
        const x = cx + (R() - 0.5) * 1.3, z = cz + (R() - 0.5) * 1.2;
        const s = 0.6 + R() * 0.9;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.25 * s, 6),
          new THREE.MeshStandardMaterial({ color: 0xa89878, roughness: 0.9 }));
        stem.position.set(x, 0.125 * s, z);
        scene.add(stem);
        const capMat = glow
          ? new THREE.MeshStandardMaterial({ color: 0xd97a35, roughness: 0.7, emissive: 0x7a3208, emissiveIntensity: 0.9 })
          : new THREE.MeshStandardMaterial({ color: 0xc5b48c, roughness: 0.85 });
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
        cap.position.set(x, 0.25 * s, z);
        cap.scale.y = 0.72;
        cap.castShadow = true;
        scene.add(cap);
      }
    }
    mushroomCluster(-4.2, 8.4, 6, true);
    mushroomCluster(4.4, 7.6, 5, false);
    mushroomCluster(-2.2, 12.4, 4, true);
  })();

  /* ---------------- 光柱 / 雾 ---------------- */
  const mistSprites = [];
  (function atmosphere() {
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: shaftTex, transparent: true, opacity: 0.15 + rand() * 0.08,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 26), mat);
      m.position.set(-11 + i * 1.6, 10.5, -3 - i * 2.4);
      m.rotation.set(0.05, -0.45, 0.2);
      scene.add(m);
    }
    // 地面薄雾
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTex, color: 0xd9dcc6, transparent: true, opacity: 0.16,
        depthWrite: false, blending: THREE.NormalBlending, fog: false,
      }));
      s.position.set(-10 + i * 4.2, 0.7 + i % 2 * 0.5, 3 + i * 3.5);
      s.scale.set(18, 3.4, 1);
      scene.add(s);
      s.userData.drift = (rand() - 0.5) * 0.12;
      mistSprites.push(s);
    }
  })();

  /* ---------------- 炊烟 ---------------- */
  const smokeGroup = (function () {
    const N = 70;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const data = [];
    for (let i = 0; i < N; i++) {
      const p = { x: 0, y: 0, z: 0, vy: 0, phase: rand() * 10, life: rand() };
      data.push(p);
      pos[i * 3] = 0; pos[i * 3 + 1] = -100; pos[i * 3 + 2] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: smokeTex, color: 0xd8d7ca, size: 0.95, transparent: true, opacity: 0.3,
      depthWrite: false, sizeAttenuation: true, blending: THREE.NormalBlending, fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData = { data, pos, base: new THREE.Vector3(-2.35, 6.7, -0.95) };
    scene.add(pts);
    return pts;
  })();
  function updateSmoke(dt, time) {
    const ud = smokeGroup.userData;
    const data = ud.data, pos = ud.pos;
    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      p.life += dt * (0.1 + 0.05 * ((i * 37) % 10) / 10);
      const life = p.life % 1;
      const t = life;
      p.x = ud.base.x + Math.sin(time * 0.5 + p.phase + t * 3) * (0.15 + t * 0.9) + t * 0.25;
      p.y = ud.base.y + t * 4.6;
      p.z = ud.base.z + Math.cos(time * 0.4 + p.phase * 1.3 + t * 2) * (0.1 + t * 0.6) + t * 0.3;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    }
    smokeGroup.geometry.attributes.position.needsUpdate = true;
    smokeGroup.material.opacity = 0.3;
  }

  /* ---------------- 萤火虫 / 尘埃 ---------------- */
  function makePoints(count, spread, yMin, yMax, size, color, opacity, seed) {
    const R = rng(seed);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const base = [];
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = (R() - 0.5) * spread.w + spread.cx;
      const y = yMin + R() * (yMax - yMin);
      const z = (R() - 0.5) * spread.h + spread.cz;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base.push({ x, y, z, ph: R() * 10, sp: 0.3 + R() * 0.8 });
      c.set(color);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: size, map: glowTex, vertexColors: true, transparent: true, opacity: opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.base = base;
    scene.add(pts);
    return pts;
  }
  const fireflies = makePoints(110, { cx: 0, cz: 8.5, w: 20, h: 16 }, 0.25, 2.4, 0.09, 0xffd88a, 0.7, 606);
  const dust = makePoints(420, { cx: 0, cz: 9, w: 30, h: 24 }, 0.6, 7.5, 0.035, 0xfff4d8, 0.45, 707);

  function updatePoints(pts, time, isFirefly) {
    const base = pts.userData.base;
    const pos = pts.geometry.attributes.position;
    const col = pts.geometry.attributes.color;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = time * b.sp + b.ph;
      let x = b.x + Math.sin(t * 0.6) * (isFirefly ? 0.9 : 0.5) + Math.sin(t * 1.7) * 0.15;
      let y = b.y + Math.sin(t * 0.9 + 1.7) * (isFirefly ? 0.5 : 0.3);
      let z = b.z + Math.cos(t * 0.5) * (isFirefly ? 0.9 : 0.5);
      pos.setXYZ(i, x, y, z);
      if (isFirefly) {
        const blink = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(time * 2.2 + b.ph * 3.1), 3);
        col.setXYZ(i, blink, blink * 0.82, blink * 0.45);
      }
    }
    pos.needsUpdate = true;
    if (isFirefly) col.needsUpdate = true;
  }

  /* ---------------- 相机控制 ---------------- */
  const PRESETS = [
    { name: '远景', pos: [0.7, 1.9, 16.2], look: [0.2, 2.9, 0.4], fov: 43 },
    { name: '林间', pos: [-3.4, 1.75, 11.6], look: [0.5, 2.7, 0.6], fov: 46 },
    { name: '门前', pos: [0.25, 1.75, 10.4], look: [0.1, 2.6, 0.3], fov: 47 },
    { name: '斜侧', pos: [4.8, 2.2, 13.2], look: [0.0, 2.7, 0.2], fov: 44 },
  ];
  const camState = {
    mode: 'auto',
    yaw: 0, pitch: 0,
    vel: new THREE.Vector3(),
    keys: {},
    dragging: false,
    targetLook: new THREE.Vector3(0.1, 2.6, 0.4),
    trans: null,
  };

  function applyPreset(i, instant) {
    const p = PRESETS[i % PRESETS.length];
    const pos = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
    const look = new THREE.Vector3(p.look[0], p.look[1], p.look[2]);
    camera.fov = p.fov;
    camera.updateProjectionMatrix();
    if (instant) {
      camera.position.copy(pos);
      camera.lookAt(look);
      camState.targetLook.copy(look);
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      camState.yaw = e.y; camState.pitch = e.x;
      camState.trans = null;
    } else {
      camState.trans = { pos: camera.position.clone(), look: camState.targetLook.clone(), toPos: pos, toLook: look, t: 0, dur: 1.4 };
    }
  }

  function updateCamera(dt, time) {
    if (camState.mode === 'auto') {
      const u = (time * 0.011) % 1;
      const tri = u < 0.5 ? u * 2 : 2 - u * 2;
      const e = tri * tri * (3 - 2 * tri);
      const curve = autoCurve;
      const p = curve.getPointAt(clamp(e, 0.0005, 0.9995));
      camera.position.set(
        p.x + Math.sin(time * 0.23) * 0.05,
        p.y + Math.sin(time * 0.31 + 1) * 0.035,
        p.z
      );
      const look = new THREE.Vector3(
        0.15 + Math.sin(time * 0.17) * 0.1,
        2.55 + Math.sin(time * 0.21) * 0.06,
        0.4
      );
      camera.lookAt(look);
      camState.targetLook.copy(look);
      camera.fov = lerp(43, 46, e);
      camera.updateProjectionMatrix();
      return;
    }
    // 过渡
    if (camState.trans) {
      const tr = camState.trans;
      tr.t += dt;
      const k = clamp(tr.t / tr.dur, 0, 1);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(tr.pos, tr.toPos, e);
      camState.targetLook.lerpVectors(tr.look, tr.toLook, e);
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, camState.targetLook, new THREE.Vector3(0, 1, 0)));
      camera.quaternion.slerp(q, 0.18);
      if (k >= 1) camState.trans = null;
      const e2 = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      camState.yaw = e2.y; camState.pitch = e2.x;
      return;
    }
    // 自由视角
    const speed = (camState.keys['shift'] ? 7.5 : 3.4) * dt;
    const fwd = new THREE.Vector3(-Math.sin(camState.yaw), 0, -Math.cos(camState.yaw));
    const right = new THREE.Vector3(Math.cos(camState.yaw), 0, -Math.sin(camState.yaw));
    const move = new THREE.Vector3();
    if (camState.keys['w']) move.add(fwd);
    if (camState.keys['s']) move.sub(fwd);
    if (camState.keys['d']) move.add(right);
    if (camState.keys['a']) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
    camState.vel.lerp(move, 1 - Math.pow(0.001, dt));
    camera.position.add(camState.vel);
    camera.position.x = clamp(camera.position.x, -26, 26);
    camera.position.z = clamp(camera.position.z, -20, 26);
    camera.position.y = clamp(camera.position.y, 0.8, 7.5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(camState.pitch, camState.yaw, 0, 'YXZ'));
    camera.quaternion.copy(q);
  }
  const autoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.7, 2.0, 22.5),
    new THREE.Vector3(1.15, 1.9, 18.5),
    new THREE.Vector3(0.7, 1.8, 15.0),
    new THREE.Vector3(0.35, 1.74, 12.0),
    new THREE.Vector3(0.3, 1.7, 9.4),
  ]);

  /* ---------------- 鼠标 / 键盘 ---------------- */
  (function input() {
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (camState.mode === 'auto') setMode('free');
      dragging = true; camState.dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      camState.yaw -= dx * 0.0032;
      camState.pitch = clamp(camState.pitch - dy * 0.0028, -1.15, 1.1);
    });
    window.addEventListener('pointerup', () => { dragging = false; camState.dragging = false; });
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      camState.keys[k] = true;
      if (['w', 'a', 's', 'd'].includes(k) && camState.mode === 'auto') setMode('free');
    });
    window.addEventListener('keyup', (e) => { camState.keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('wheel', (e) => {
      if (camState.mode === 'auto') return;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      camera.position.addScaledVector(dir, e.deltaY * 0.004);
      e.preventDefault();
    }, { passive: false });
  })();

  /* ---------------- 后处理（自制 Bloom + 调色 + 暗角） ---------------- */
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  postScene.add(postQuad);

  const FS_VERT = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;
  const brightMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.72 } },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uThreshold;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float k = smoothstep(uThreshold, uThreshold + 0.55, l);
        gl_FragColor = vec4(c * k, 1.0);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) } },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        vec2 o = uDir * uTexel;
        vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270;
        c += texture2D(tDiffuse, vUv + o * 1.0).rgb * 0.1945;
        c += texture2D(tDiffuse, vUv - o * 1.0).rgb * 0.1945;
        c += texture2D(tDiffuse, vUv + o * 2.0).rgb * 0.1216;
        c += texture2D(tDiffuse, vUv - o * 2.0).rgb * 0.1216;
        c += texture2D(tDiffuse, vUv + o * 3.0).rgb * 0.0540;
        c += texture2D(tDiffuse, vUv - o * 3.0).rgb * 0.0540;
        c += texture2D(tDiffuse, vUv + o * 4.0).rgb * 0.0162;
        c += texture2D(tDiffuse, vUv - o * 4.0).rgb * 0.0162;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  const compositeMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tBloom: { value: null }, tBlur: { value: null },
      uBloom: { value: 0.45 }, uExposure: { value: 0.95 }, uDof: { value: 0.85 },
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
      uVignette: { value: 0.55 }, uGrain: { value: 0.024 },
    },
    vertexShader: FS_VERT,
    fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tBlur;
      uniform float uBloom; uniform float uExposure; uniform float uTime; uniform float uDof;
      uniform vec2 uRes; uniform float uVignette; uniform float uGrain;
      varying vec2 vUv;
      vec3 aces(vec3 x) {
        return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = vUv;
        // 伪景深：下沿前景 + 顶部远景 + 左右边缘轻微虚化
        vec3 sharp = texture2D(tScene, uv).rgb;
        vec3 soft = texture2D(tBlur, uv).rgb;
        float m = 0.0;
        m = max(m, smoothstep(0.04, 0.34, 0.50 - uv.y));
        m = max(m, smoothstep(0.03, 0.16, uv.y - 0.87) * 0.8);
        m = max(m, smoothstep(0.34, 0.64, abs(uv.x - 0.5)) * 0.45);
        vec3 col = mix(sharp, soft, clamp(m, 0.0, 0.86) * uDof);
        vec3 bloom = texture2D(tBloom, uv).rgb;
        col += bloom * uBloom;
        // 暗角
        vec2 q = uv - 0.5;
        float vig = smoothstep(1.05, 0.18, length(q * vec2(1.02, 0.92)));
        col *= mix(1.0 - uVignette, 1.0, vig);
        // 曝光 + 色调映射
        col = aces(col * uExposure);
        // 对比度
        col = clamp((col - 0.5) * 1.14 + 0.5, 0.0, 1.0);
        // 分级：暗部偏青、亮部偏暖
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col * vec3(0.90, 1.015, 0.96), col, smoothstep(0.0, 0.55, l));
        col = mix(col, col * vec3(1.05, 0.995, 0.92), smoothstep(0.5, 1.0, l) * 0.7);
        // sRGB
        col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
        // 颗粒
        float g = hash(uv * uRes + fract(uTime) * 100.0) - 0.5;
        col += g * uGrain;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthTest: false, depthWrite: false,
  });

  let rtScene = null, rtA = null, rtB = null, rtC = null, rtD = null;
  function makeRT(w, h, depth) {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      depthBuffer: !!depth, stencilBuffer: false,
    });
    rt.texture.generateMipmaps = false;
    return rt;
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const SS = clamp(parseFloat(Q.get('ss') || '1.25'), 1, 2);
    const rw = Math.round(w * PR * SS), rh = Math.round(h * PR * SS);
    if (rtScene) { rtScene.dispose(); rtA.dispose(); rtB.dispose(); rtC.dispose(); rtD.dispose(); }
    rtScene = makeRT(rw, rh, true);
    const bw = Math.max(2, Math.round(rw / 4)), bh = Math.max(2, Math.round(rh / 4));
    rtA = makeRT(bw, bh, false);
    rtB = makeRT(bw, bh, false);
    rtC = makeRT(bw, bh, false);
    rtD = makeRT(bw, bh, false);
    compositeMat.uniforms.uRes.value.set(rw, rh);
    compositeMat.uniforms.tScene.value = rtScene.texture;
    compositeMat.uniforms.tBloom.value = rtA.texture;
    compositeMat.uniforms.tBlur.value = rtD.texture;
    blurMat.uniforms.uTexel.value.set(1 / rtA.width, 1 / rtA.height);
  }
  window.addEventListener('resize', resize);
  resize();

  function renderPost(time) {
    renderer.setRenderTarget(rtScene);
    renderer.render(scene, camera);

    postQuad.material = brightMat;
    brightMat.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);

    postQuad.material = blurMat;
    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(postScene, postCam);

    blurMat.uniforms.tDiffuse.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1);
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);

    // 二次扩散，光晕更柔
    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(1.7, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtB.texture;
    blurMat.uniforms.uDir.value.set(0, 1.7);
    renderer.setRenderTarget(rtA);
    renderer.render(postScene, postCam);

    // 景深用的模糊层
    blurMat.uniforms.tDiffuse.value = rtScene.texture;
    blurMat.uniforms.uDir.value.set(1, 0);
    renderer.setRenderTarget(rtC);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtC.texture;
    blurMat.uniforms.uDir.value.set(0, 1);
    renderer.setRenderTarget(rtD);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtD.texture;
    blurMat.uniforms.uDir.value.set(2.2, 0);
    renderer.setRenderTarget(rtC);
    renderer.render(postScene, postCam);
    blurMat.uniforms.tDiffuse.value = rtC.texture;
    blurMat.uniforms.uDir.value.set(0, 2.2);
    renderer.setRenderTarget(rtD);
    renderer.render(postScene, postCam);

    compositeMat.uniforms.uTime.value = time;
    compositeMat.uniforms.tBloom.value = rtA.texture;
    compositeMat.uniforms.tBlur.value = rtD.texture;
    postQuad.material = compositeMat;
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  /* ---------------- 雾控制 ---------------- */
  const fogSteps = [0.2, 0.5, 0.78];
  let fogIdx = 1;
  function applyFog(idx) {
    fogIdx = ((idx % fogSteps.length) + fogSteps.length) % fogSteps.length;
    const v = fogSteps[fogIdx];
    const density = 0.002 + v * 0.022;
    scene.fog.density = density;
    const labels = ['淡', '中', '浓'];
    const el = document.getElementById('fogLabel');
    if (el) el.textContent = labels[fogIdx];
  }
  const fogParam = parseFloat(Q.get('fog'));
  if (!isNaN(fogParam)) {
    fogSteps[fogSteps.length] = clamp(fogParam, 0, 1);
    applyFog(fogSteps.length - 1);
  } else {
    applyFog(1);
  }

  /* ---------------- 模式 / UI ---------------- */
  function setMode(mode) {
    camState.mode = mode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = mode === 'free' ? '拖动鼠标环视 · WASD 走动 · Shift 加速' : '';
  }
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.mode === 'auto') { setMode('auto'); }
      else { setMode('free'); }
    });
  });
  const fogBtn = document.querySelector('[data-act="fog"]');
  if (fogBtn) fogBtn.addEventListener('click', () => applyFog(fogIdx + 1));
  const camBtn = document.querySelector('[data-act="cam"]');
  let presetIdx = 0;
  if (camBtn) camBtn.addEventListener('click', () => {
    presetIdx = (presetIdx + 1) % PRESETS.length;
    setMode('free');
    applyPreset(presetIdx, false);
    const lbl = document.getElementById('camLabel');
    if (lbl) lbl.textContent = PRESETS[presetIdx].name;
  });
  const shotBtn = document.querySelector('[data-act="shot"]');
  if (shotBtn) shotBtn.addEventListener('click', () => {
    renderPost(performance.now() / 1000);
    const a = document.createElement('a');
    a.download = '森林小屋.png';
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  });
  const fsBtn = document.querySelector('[data-act="fullscreen"]');
  if (fsBtn) fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  });

  /* ---------------- 启动 ---------------- */
  const camParam = Q.get('cam');
  let forcedPreset = null;
  if (camParam != null && camParam !== '' && camParam !== 'auto') {
    if (/^\d+$/.test(camParam)) forcedPreset = parseInt(camParam, 10);
    else forcedPreset = Math.max(0, PRESETS.findIndex((p) => p.name === camParam));
  }
  if (Q.get('ui') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
  applyFog(fogIdx);
  if (forcedPreset != null) {
    camState.mode = 'free';
    presetIdx = forcedPreset;
    applyPreset(forcedPreset, true);
  } else if (camParam === 'auto' || camParam == null) {
    camState.mode = 'auto';
    applyPreset(0, true);
  } else {
    setMode('auto');
  }
  setMode(camState.mode);

  const clock = new THREE.Clock();
  let time = 0;
  let started = false;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    updateCamera(dt, time);
    updateSmoke(dt, time);
    updatePoints(fireflies, time, true);
    updatePoints(dust, time, false);
    for (const s of mistSprites) {
      s.position.x += s.userData.drift * dt;
      if (s.position.x > 18) s.position.x = -18;
      if (s.position.x < -18) s.position.x = 18;
    }
    // 灯光轻微呼吸
    const flick = 0.94 + 0.06 * Math.sin(time * 3.1) + 0.03 * Math.sin(time * 7.3);
    for (const child of cabin.children) {
      if (child.isPointLight) child.intensity = child.userData.baseI ? child.userData.baseI * flick : child.intensity;
    }
    renderPost(time);
    if (!started) {
      started = true;
      const ld = document.getElementById('loading');
      if (ld) { ld.classList.add('done'); }
      setTimeout(() => { if (ld) ld.style.display = 'none'; }, 700);
    }
  }
  // 暴露调试句柄
  window.__dbg = {
    scene: scene, camera: camera, renderer: renderer, THREE: THREE,
    post: { compositeMat: compositeMat, brightMat: brightMat, blurMat: blurMat },
  };
  // 记录灯泡基础亮度
  for (const child of cabin.children) {
    if (child.isPointLight) child.userData.baseI = child.intensity;
  }
  animate();
})();
