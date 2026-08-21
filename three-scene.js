/*
 * Optional cinematic 3D layer (hero + final CTA house model).
 * Progressive enhancement only: if WebGL/Three.js is unavailable or slow,
 * this silently no-ops and the CSS backdrop already in the page is the
 * finished look — it never leaves an empty/broken area behind.
 */
(() => {
  "use strict";

  const heroCanvas = document.getElementById("hero3d");
  const finalCanvas = document.getElementById("final3d");
  if (!heroCanvas && !finalCanvas) return;

  const mobile = window.matchMedia("(max-width: 780px)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dead = { value: false };
  window.addEventListener("beforeunload", () => { dead.value = true; });

  function hasWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch (e) {
      return false;
    }
  }
  if (!hasWebGL()) return;

  function waitThree(timeoutMs) {
    return new Promise((resolve) => {
      if (window.THREE) return resolve(window.THREE);
      const t0 = Date.now();
      let retried = false;
      const check = () => {
        if (window.THREE) return resolve(window.THREE);
        if (!retried && Date.now() - t0 > 4000) {
          retried = true;
          const s = document.createElement("script");
          s.src = "https://unpkg.com/three@0.150.1/build/three.min.js";
          s.onerror = () => resolve(null);
          document.head.appendChild(s);
        }
        if (Date.now() - t0 > timeoutMs) return resolve(null);
        setTimeout(check, 90);
      };
      check();
    });
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
    const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
    const b = Math.min(255, (n & 255) * f) | 0;
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function shingleTex(THREE, base, alt) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = base;
    x.fillRect(0, 0, 512, 512);
    const rows = 12,
      rh = 512 / rows,
      tw = 512 / 8;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (tw / 2);
      for (let i = -1; i < 9; i++) {
        const v = 0.82 + Math.random() * 0.36;
        x.fillStyle = i % 2 ? shade(base, v) : shade(alt, v);
        x.fillRect(i * tw + off + 1, r * rh + 1, tw - 2, rh - 3);
      }
      x.fillStyle = "rgba(0,0,0,0.5)";
      x.fillRect(0, r * rh + rh - 3, 512, 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function buildHouse(THREE, tex) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: 0x3a352f, roughness: 0.9, metalness: 0.02 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x22201d, roughness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xffc98a, emissive: 0xff9d4d, emissiveIntensity: 1.1, roughness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.06, color: 0xffffff });
    tex.repeat.set(3, 2);

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 3.1), wall);
    body.position.y = 1.05;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const a = 0.56,
      half = 2.1,
      len = half / Math.cos(a) + 0.42;
    for (const s of [1, -1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(len, 0.17, 3.5), roofMat);
      slab.position.set(s * (half / 2 + 0.06), 2.1 + (Math.tan(a) * half) / 2, 0);
      slab.rotation.z = -s * a;
      slab.castShadow = true;
      slab.receiveShadow = true;
      g.add(slab);
    }
    const gable = new THREE.Shape();
    gable.moveTo(-half, 0);
    gable.lineTo(half, 0);
    gable.lineTo(0, Math.tan(a) * half);
    gable.lineTo(-half, 0);
    for (const z of [1.54, -1.54]) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.06, bevelEnabled: false }), wall);
      m.position.set(0, 2.1, z - (z > 0 ? 0 : 0.06));
      g.add(m);
    }

    const garage = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.45, 1.9), wall);
    garage.position.set(2.6, 0.72, 0.8);
    garage.castShadow = true;
    g.add(garage);
    const gr = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 2.2), roofMat);
    gr.position.set(2.6, 1.5, 0.8);
    gr.rotation.z = -0.14;
    gr.castShadow = true;
    g.add(gr);
    const gdoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.06), trim);
    gdoor.position.set(2.6, 0.52, 1.78);
    g.add(gdoor);

    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.5, 0.44), trim);
    chim.position.set(-1.1, 3.0, 0.5);
    chim.castShadow = true;
    g.add(chim);

    const winPos = [
      [-1.2, 1.25, 1.57],
      [0.0, 1.25, 1.57],
      [1.2, 1.25, 1.57],
      [-2.12, 1.2, 0.5],
      [-2.12, 1.2, -0.6],
    ];
    winPos.forEach((p, i) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(i > 2 ? 0.06 : 0.62, 0.78, i > 2 ? 0.62 : 0.06), glass);
      w.position.set(p[0], p[1], p[2]);
      g.add(w);
    });
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 1.26, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x8a4a24, roughness: 0.55 })
    );
    door.position.set(0.62, 0.63, 1.57);
    g.add(door);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.receiveShadow = true;
    g.add(ground);
    return g;
  }

  function addLights(THREE, scene, warm) {
    scene.add(new THREE.HemisphereLight(warm ? 0x4a3a2c : 0x2a3340, 0x080808, warm ? 0.9 : 0.6));
    const key = new THREE.DirectionalLight(warm ? 0xffb877 : 0xfff0dd, warm ? 2.1 : 1.7);
    key.position.set(6, 9, 5);
    if (!mobile) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 40;
      key.shadow.camera.left = -12;
      key.shadow.camera.right = 12;
      key.shadow.camera.top = 12;
      key.shadow.camera.bottom = -12;
      key.shadow.bias = -0.0012;
    }
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc0703c, 1.25);
    rim.position.set(-7, 4, -6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x6c7d94, 0.5);
    fill.position.set(-3, 2, 7);
    scene.add(fill);
  }

  function makeRenderer(THREE, canvas, shadows) {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !mobile, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1));
    if (shadows && !mobile) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
    };
    fit();
    window.addEventListener("resize", fit, { passive: true });
    return { renderer: renderer, scene: scene, cam: cam, fit: fit };
  }

  function loop(el, fn) {
    const rec = { visible: true, id: 0 };
    const tick = () => {
      if (dead.value) return;
      if (rec.visible) fn();
      rec.id = requestAnimationFrame(tick);
    };
    rec.id = requestAnimationFrame(tick);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { rec.visible = entries[0].isIntersecting; }, { rootMargin: "120px" }).observe(el);
    }
    return rec;
  }

  function initHero(THREE) {
    const ctx = makeRenderer(THREE, heroCanvas, true);
    addLights(THREE, ctx.scene, false);
    ctx.cam.position.set(6.4, 3.4, 8.6);
    ctx.cam.lookAt(0, 0.4, 0);
    ctx.scene.fog = new THREE.Fog(0x0a0a0b, 14, 34);

    const tex = shingleTex(THREE, "#4a4340", "#332e2b");
    const house = buildHouse(THREE, tex);
    const pivot = new THREE.Group();
    pivot.add(house);
    house.position.y = -1.1;
    ctx.scene.add(pivot);

    const floaters = new THREE.Group();
    const n = mobile ? 5 : 11;
    const shTex = shingleTex(THREE, "#5a4f47", "#3a332e");
    const metal = new THREE.MeshStandardMaterial({ color: 0xbcc2c8, metalness: 1, roughness: 0.28 });
    const blue = new THREE.MeshBasicMaterial({ color: 0x4b6f92, transparent: true, opacity: 0.34, side: THREE.DoubleSide });
    for (let i = 0; i < n; i++) {
      let m;
      const k = i % 3;
      if (k === 0) {
        m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.55), new THREE.MeshStandardMaterial({ map: shTex, roughness: 0.8 }));
      } else if (k === 1) {
        m = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.6, 10), metal);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 12), metal);
        head.position.y = 0.3;
        m.add(shaft);
        m.add(head);
      } else {
        m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62), blue);
      }
      m.position.set((Math.random() - 0.5) * 13, 0.6 + Math.random() * 5.6, (Math.random() - 0.5) * 8 + 1);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      m.userData = { s: 0.25 + Math.random() * 0.7, p: Math.random() * 6.28, y0: m.position.y, rx: (Math.random() - 0.5) * 0.006, ry: (Math.random() - 0.5) * 0.008 };
      floaters.add(m);
    }
    ctx.scene.add(floaters);

    let t = 0;
    let firstFrame = true;
    loop(heroCanvas, () => {
      t += 0.0125;
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      pivot.rotation.y = -0.42 + mouse.x * 0.42 + (reduced ? 0 : t * 0.035);
      pivot.rotation.x = mouse.y * 0.06;
      floaters.children.forEach((m) => {
        const u = m.userData;
        m.position.y = u.y0 + Math.sin(t * u.s + u.p) * 0.42;
        m.rotation.x += u.rx;
        m.rotation.y += u.ry;
      });
      floaters.position.x = -mouse.x * 1.1;
      floaters.position.y = -mouse.y * 0.6;
      ctx.renderer.render(ctx.scene, ctx.cam);
      if (firstFrame) {
        firstFrame = false;
        heroCanvas.classList.add("is-ready");
      }
    });
  }

  function initFinal(THREE) {
    const ctx = makeRenderer(THREE, finalCanvas, true);
    const tex = shingleTex(THREE, "#57483d", "#3a2f28");
    const house = buildHouse(THREE, tex);
    house.position.set(1.6, -1.6, 0);
    const pivot = new THREE.Group();
    pivot.add(house);
    ctx.scene.add(pivot);
    ctx.scene.fog = new THREE.Fog(0x0a0a0b, 10, 26);
    addLights(THREE, ctx.scene, true);
    ctx.cam.position.set(4.0, 2.0, 5.6);
    ctx.cam.lookAt(1.2, 1.2, 0);

    let t = 0;
    let firstFrame = true;
    loop(finalCanvas, () => {
      t += 0.006;
      pivot.rotation.y = -0.7 + (reduced ? 0 : Math.sin(t) * 0.13) + mouse.x * 0.13;
      ctx.cam.position.y = 2.0 + (reduced ? 0 : Math.sin(t * 1.4) * 0.12) - mouse.y * 0.25;
      ctx.cam.lookAt(1.2, 1.2, 0);
      ctx.renderer.render(ctx.scene, ctx.cam);
      if (firstFrame) {
        firstFrame = false;
        finalCanvas.classList.add("is-ready");
      }
    });
  }

  waitThree(20000).then((THREE) => {
    if (!THREE || dead.value) return;
    if (heroCanvas) initHero(THREE);
    if (finalCanvas) initFinal(THREE);
  });
})();
