/**
 * TushCoin3D — WebGL hero scene.
 * A glossy iridescent Tush coin surrounded by orbiting candy-coloured shapes
 * and sparkles. Tilts toward the pointer, spins with scroll, and flips when
 * clicked. Pauses rendering when off-screen or when the tab is hidden.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import './TushCoin3D.css';

const CANDY = {
  lime: 0xc8ff4d,
  pink: 0xff5cdb,
  blue: 0x4d7cff,
  orange: 0xff8a3d,
  violet: 0x9b6bff,
};

/* Hang-tag mark on the same 64x64 grid as TushLogo / favicon.svg.
   Origin is the tag centre (32, 34); y is flipped for three.js. */
const GRID = 0.044;
const g = (x: number, y: number) => new THREE.Vector2((x - 32) * GRID, (34 - y) * GRID);

function makeTagShape() {
  const s = new THREE.Shape();
  const p = (x: number, y: number) => g(x, y);
  s.moveTo(p(18, 22).x, p(18, 22).y);
  s.lineTo(p(27, 11).x, p(27, 11).y);
  s.lineTo(p(37, 11).x, p(37, 11).y);
  s.lineTo(p(46, 22).x, p(46, 22).y);
  s.lineTo(p(46, 54).x, p(46, 54).y);
  s.quadraticCurveTo(p(46, 58).x, p(46, 58).y, p(42, 58).x, p(42, 58).y);
  s.lineTo(p(22, 58).x, p(22, 58).y);
  s.quadraticCurveTo(p(18, 58).x, p(18, 58).y, p(18, 54).x, p(18, 54).y);
  s.closePath();

  // The punched-through "T"
  const hole = new THREE.Path();
  const pts: [number, number][] = [
    [23, 19], [41, 19], [41, 26], [35.5, 26], [35.5, 44], [28.5, 44], [28.5, 26], [23, 26],
  ];
  pts.forEach(([x, y], i) => (i === 0 ? hole.moveTo(g(x, y).x, g(x, y).y) : hole.lineTo(g(x, y).x, g(x, y).y)));
  hole.closePath();
  s.holes.push(hole);
  return s;
}

function makeStringCurve() {
  const v = (x: number, y: number, z: number) => {
    const q = g(x, y);
    return new THREE.Vector3(q.x, q.y, z);
  };
  return new THREE.CubicBezierCurve3(v(29, 20.5, 0.1), v(27.5, 8, 0.16), v(15, 2.5, 0.16), v(6, 9, 0.1));
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface Props {
  /** Element whose clicks can flip the coin (usually the hero section). */
  interactionTarget?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export default function TushCoin3D({ interactionTarget, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(() => !supportsWebGL());

  useEffect(() => {
    const host = hostRef.current;
    if (!host || failed) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      // Context creation can still fail (e.g. GPU blocklisted) — fall back next frame.
      const id = requestAnimationFrame(() => setFailed(true));
      return () => cancelAnimationFrame(id);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    // ---------- Lights: coloured rims make the metal sing ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 5);
    scene.add(key);
    const pinkLight = new THREE.PointLight(CANDY.pink, 40, 12);
    const limeLight = new THREE.PointLight(CANDY.lime, 30, 12);
    const blueLight = new THREE.PointLight(CANDY.blue, 40, 12);
    scene.add(pinkLight, limeLight, blueLight);

    // ---------- Root group (positioned per viewport) ----------
    const root = new THREE.Group();
    scene.add(root);

    // ---------- Coin ----------
    const coin = new THREE.Group();
    root.add(coin);

    const faceMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a2470,
      metalness: 0.95,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 1,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [200, 900],
    });
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xd9c8ff,
      metalness: 1,
      roughness: 0.15,
      iridescence: 1,
      iridescenceIOR: 2.0,
      clearcoat: 1,
    });
    const emblemMat = new THREE.MeshPhysicalMaterial({
      color: CANDY.lime,
      metalness: 0.6,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: CANDY.lime,
      emissiveIntensity: 0.12,
    });
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: CANDY.pink,
      metalness: 0.7,
      roughness: 0.18,
      clearcoat: 1,
      emissive: CANDY.pink,
      emissiveIntensity: 0.15,
    });

    const R = 1.45;
    const H = 0.32;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 128, 1), [rimMat, faceMat, faceMat]);
    body.rotation.x = Math.PI / 2;
    coin.add(body);

    // Reeded edge
    const ridges = new THREE.Group();
    const ridgeGeo = new THREE.BoxGeometry(0.03, H * 0.82, 0.03);
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const m = new THREE.Mesh(ridgeGeo, rimMat);
      m.position.set(Math.cos(a) * (R + 0.008), 0, Math.sin(a) * (R + 0.008));
      m.rotation.y = -a;
      ridges.add(m);
    }
    ridges.rotation.x = Math.PI / 2;
    coin.add(ridges);

    // Raised rings + emblem on both faces
    const ringGeo = new THREE.TorusGeometry(R - 0.16, 0.055, 24, 160);
    const tagGeo = new THREE.ExtrudeGeometry(makeTagShape(), {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.022,
      bevelSegments: 4,
      curveSegments: 8,
    });
    const stringGeo = new THREE.TubeGeometry(makeStringCurve(), 48, 0.045, 12, false);
    const stringMat = new THREE.MeshPhysicalMaterial({
      color: CANDY.pink,
      roughness: 0.35,
      clearcoat: 1,
      emissive: CANDY.pink,
      emissiveIntensity: 0.2,
    });
    const knotGeo = new THREE.SphereGeometry(0.06, 16, 16);

    for (const side of [1, -1]) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = (H / 2) * side;
      coin.add(ring);

      const emblem = new THREE.Group();
      emblem.position.z = (H / 2 + 0.01) * side;
      if (side === -1) emblem.rotation.y = Math.PI;
      emblem.scale.setScalar(0.9);

      const tag = new THREE.Mesh(tagGeo, emblemMat);
      tag.rotation.z = THREE.MathUtils.degToRad(12);
      emblem.add(tag);

      const string = new THREE.Mesh(stringGeo, stringMat);
      emblem.add(string);
      const knot = new THREE.Mesh(knotGeo, stringMat);
      const start = makeStringCurve().getPoint(0);
      knot.position.copy(start);
      emblem.add(knot);

      coin.add(emblem);
    }

    // ---------- Orbiting candy shapes ----------
    const glossy = (color: number) =>
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });

    type Floater = { mesh: THREE.Mesh; base: THREE.Vector3; speed: number; phase: number; spin: THREE.Vector3 };
    const floaters: Floater[] = [];
    const addFloater = (geo: THREE.BufferGeometry, color: number, pos: [number, number, number], scale = 1) => {
      const mesh = new THREE.Mesh(geo, glossy(color));
      mesh.position.set(...pos);
      mesh.scale.setScalar(scale);
      root.add(mesh);
      floaters.push({
        mesh,
        base: new THREE.Vector3(...pos),
        speed: 0.5 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.8),
      });
    };
    addFloater(new THREE.TorusGeometry(0.32, 0.13, 32, 64), CANDY.lime, [-2.1, 1.25, -0.6]);
    addFloater(new THREE.SphereGeometry(0.28, 48, 48), CANDY.pink, [2.0, 1.45, 0.3]);
    addFloater(new THREE.CapsuleGeometry(0.16, 0.5, 12, 24), CANDY.blue, [2.25, -1.15, -0.4]);
    addFloater(new THREE.IcosahedronGeometry(0.3, 0), CANDY.orange, [-2.0, -1.35, 0.4]);
    addFloater(new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.1), CANDY.violet, [0.2, 2.15, -1.0]);
    addFloater(new THREE.SphereGeometry(0.14, 32, 32), CANDY.lime, [1.1, -2.0, 0.6]);
    addFloater(new THREE.TorusKnotGeometry(0.18, 0.06, 96, 12), CANDY.pink, [-0.9, -2.05, -0.5]);

    // ---------- Sparkles ----------
    const COUNT = 260;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = Object.values(CANDY).map((c) => new THREE.Color(c));
    for (let i = 0; i < COUNT; i++) {
      const r = 2.4 + Math.random() * 3.2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
      positions[i * 3 + 2] = r * Math.cos(ph) - 1.5;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sparkles = new THREE.Points(sparkGeo, sparkMat);
    root.add(sparkles);

    // ---------- Layout ----------
    const layout = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visW = visH * camera.aspect;
      if (camera.aspect < 0.95) {
        // Portrait: coin sits in the lower part of the hero
        root.position.set(0, -visH * 0.24, 0);
        root.scale.setScalar(Math.min(0.78, visW / 5.4));
      } else if (camera.aspect < 1.4) {
        // Tablet / narrow landscape: smaller coin tucked to the right
        root.position.set(visW * 0.3, 0.1, 0);
        root.scale.setScalar(visW / 12);
      } else {
        root.position.set(visW * 0.24, -0.05, 0);
        root.scale.setScalar(Math.min(0.95, visW / 9.5));
      }
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(host);

    // ---------- Interaction ----------
    const pointer = new THREE.Vector2(0, 0);
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    let flipVelocity = 0;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onClick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.intersectObject(coin, true).length) {
        flipVelocity += 0.55;
        host.classList.add('is-flipped');
        window.setTimeout(() => host.classList.remove('is-flipped'), 500);
      }
    };
    const clickTarget = interactionTarget?.current ?? host;
    clickTarget.addEventListener('pointerdown', onClick);

    let scrollY = window.scrollY;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ---------- Loop ----------
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    let running = false;
    let spin = 0;
    const tilt = new THREE.Vector2(0, 0);

    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Idle spin + click flips (with friction) + scroll coupling
      flipVelocity *= 0.95;
      spin += dt * 0.45 + flipVelocity;
      const scrollSpin = scrollY * 0.003;
      coin.rotation.y = spin + scrollSpin;
      coin.position.y = Math.sin(t * 1.1) * 0.08 - scrollY * 0.0015;

      // Pointer tilt (eased)
      tilt.x += (pointer.y * 0.35 - tilt.x) * 0.06;
      tilt.y += (pointer.x * 0.45 - tilt.y) * 0.06;
      root.rotation.x = tilt.x;
      root.rotation.z = -tilt.y * 0.15;
      coin.rotation.x = tilt.x * 0.4;

      for (const f of floaters) {
        f.mesh.position.y = f.base.y + Math.sin(t * f.speed + f.phase) * 0.18;
        f.mesh.position.x = f.base.x + Math.cos(t * f.speed * 0.7 + f.phase) * 0.1 + tilt.y * 0.25;
        f.mesh.rotation.x += f.spin.x * dt;
        f.mesh.rotation.y += f.spin.y * dt;
        f.mesh.rotation.z += f.spin.z * dt;
      }
      sparkles.rotation.y = t * 0.03;

      // Orbit coloured lights so reflections keep moving
      pinkLight.position.set(Math.cos(t * 0.6) * 4, 2, Math.sin(t * 0.6) * 4);
      limeLight.position.set(Math.cos(t * 0.6 + 2.1) * 4, -2, Math.sin(t * 0.6 + 2.1) * 4);
      blueLight.position.set(Math.cos(t * 0.6 + 4.2) * 4, 0.5, Math.sin(t * 0.6 + 4.2) * 4);

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!visible || document.hidden) {
        running = false;
        return;
      }
      renderFrame();
      raf = requestAnimationFrame(loop);
    };
    function start() {
      if (running || reduceMotion) return;
      running = true;
      clock.getDelta();
      raf = requestAnimationFrame(loop);
    }
    const onVis = () => {
      if (!document.hidden) start();
    };
    document.addEventListener('visibilitychange', onVis);

    if (reduceMotion) {
      coin.rotation.y = -0.5;
      renderer.render(scene, camera);
    } else {
      start();
    }
    host.classList.add('is-ready');

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      clickTarget.removeEventListener('pointerdown', onClick);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [interactionTarget, failed]);

  if (failed) {
    return (
      <div className={`coin3d coin3d--fallback ${className ?? ''}`} aria-hidden="true">
        <div className="coin3d__css-coin">T</div>
      </div>
    );
  }
  return <div ref={hostRef} className={`coin3d ${className ?? ''}`} aria-hidden="true" />;
}
