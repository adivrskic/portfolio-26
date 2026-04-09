import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getCurrentSeason } from "../../config/defaults";
import { easeOutSoft } from "../../utils/math";
import { sphereVertexShader } from "./shaders/sphereVertex.glsl.js";
import { sphereFragmentShader } from "./shaders/sphereFragment.glsl.js";
import {
  glassVertexShader,
  glassFragmentShader,
} from "./shaders/glass.glsl.js";
import {
  explodeVertexShader,
  explodeFragmentShader,
} from "./shaders/explode.glsl.js";

// Shaders imported from ./shaders/ — see sphereVertexShader, sphereFragmentShader, etc.
const FV = sphereVertexShader;
const FF = sphereFragmentShader;

// Cubic-bezier easing — attempt Newton's method, fall back to bisection
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const d = sampleDx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    t = Math.max(0, Math.min(1, t));
    return sampleY(t);
  };
}

export default function Scene({
  configRef,
  onScrollProgress,
  onBirthProgress,
  gradientCanvas,
  menuOpen,
  chatMode,
  activeSeason,
  onCubeHold,
  onCubeProximity,
  onCardClick,
  onHelixProgress,
}) {
  const containerRef = useRef(null);
  const gradCanvasRef = useRef(null);
  gradCanvasRef.current = gradientCanvas;
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen || false;
  const chatModeRef = useRef(false);
  chatModeRef.current = chatMode || false;
  const activeSeasonRef = useRef(activeSeason || getCurrentSeason());
  activeSeasonRef.current = activeSeason || getCurrentSeason();
  const onCubeHoldRef = useRef(onCubeHold);
  onCubeHoldRef.current = onCubeHold;
  const onCubeProximityRef = useRef(onCubeProximity);
  onCubeProximityRef.current = onCubeProximity;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cfg = configRef,
      W = () => window.innerWidth,
      H = () => window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200);
    camera.position.set(0, 0, 8);

    // ── Mesh ──
    const sphereGeo = new THREE.IcosahedronGeometry(1, 64);
    const fU = {
      uTime: { value: 0 },
      uNoiseFreq: { value: 0.2 },
      uNoiseAmp: { value: 0 },
      uNoiseSpeed: { value: 0 },
      uNoiseOctaves: { value: 2 },
      uNoiseLac: { value: 4 },
      uNoisePers: { value: 0.9 },
      uSpikeSharp: { value: 4 },
      uNoiseWarp: { value: 0 },
      uMouseWorld: { value: new THREE.Vector3(0, 0, 3) },
      uMouseStrength: { value: 0 },
      uMouseRadius: { value: 2 },
      uMouseFalloff: { value: 1.2 },
      uMouseNoiseBoost: { value: 0.4 },
      uMouseNoiseFreq: { value: 2.6 },
      uMouseAttract: { value: -2 },
      uBaseBrightStart: { value: 0.92 },
      uBaseBrightEnd: { value: 0.04 },
      uRoughness: { value: 0.01 },
      uMetallic: { value: 2 },
      uSpecularIntensity: { value: 4 },
      uFresnelPower: { value: 8.6 },
      uFresnelIntensity: { value: 0.15 },
      uIridescence: { value: 0.1 },
      uEnvReflect: { value: 2 },
      uEnvBrightness: { value: 3 },
      uAoStrength: { value: 0 },
      uAoRange: { value: 0.99 },
      uRimStrength: { value: 0 },
      uRimColor: { value: new THREE.Color(0x1a2a4a) },
      uAmbientIntensity: { value: 0 },
      uLight1Pos: { value: new THREE.Vector3(3, 4, 5) },
      uLight1Int: { value: 1.2 },
      uLight2Pos: { value: new THREE.Vector3(-3, -1, 3) },
      uLight2Int: { value: 3 },
      uLight3Pos: { value: new THREE.Vector3(-0.2, -8, 0) },
      uLight3Int: { value: 3 },
      uScrollProgress: { value: 0 },
      uWaveformMix: { value: 0 },
      uWaveTime: { value: 0 },
      uShape: { value: 0 },
      uMeshAlpha: { value: 1 },
      uBounds: { value: 3.0 },
      uTetraScale: { value: 1 },
      uCubeScale: { value: 1 },
      uShapeTiltX: { value: 0 },
      uShapeTiltY: { value: 0 },
      uGC1: { value: new THREE.Color("#1a0a3e") },
      uGC2: { value: new THREE.Color("#d41878") },
      uGC3: { value: new THREE.Color("#08b4a8") },
      uGC4: { value: new THREE.Color("#f5a623") },
    };
    const sphere = new THREE.Mesh(
      sphereGeo,
      new THREE.ShaderMaterial({
        vertexShader: FV,
        fragmentShader: FF,
        uniforms: fU,
        transparent: true,
        depthWrite: true,
      })
    );
    sphere.renderOrder = 0;
    scene.add(sphere);

    // ── Glass cube (two-pass refraction — proven approach) ──
    const sceneRT = new THREE.WebGLRenderTarget(W(), H(), {
      type: THREE.HalfFloatType,
    });
    let bgTex = null;
    const glassUniforms = {
      uSceneTex: { value: null },
      uBgTex: { value: null },
      uRes: { value: new THREE.Vector2(W(), H()) },
      uRefract: { value: 0.15 },
      uBlur: { value: 2.9 },
      uEdgeAlpha: { value: 1.0 },
      uFresnelPow: { value: 0.5 },
      uSpecular: { value: 4.0 },
      uSpecPower: { value: 120.0 },
      uIridescence: { value: 0.0 },
      uOpacity: { value: 0.92 },
      uTint: { value: new THREE.Vector3(0.9, 0.92, 1.0) },
    };
    const glassGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.08);
    const glassMat = new THREE.ShaderMaterial({
      uniforms: glassUniforms,
      vertexShader: glassVertexShader,
      fragmentShader: glassFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const glassCube = new THREE.Mesh(glassGeo, glassMat);
    glassCube.renderOrder = 10;
    scene.add(glassCube);

    const glassEdgeGeo = new THREE.EdgesGeometry(glassGeo);
    const glassEdgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });
    const glassEdges = new THREE.LineSegments(glassEdgeGeo, glassEdgeMat);
    glassEdges.renderOrder = 11;
    glassCube.add(glassEdges);

    let lastCornerR = 0.08;
    // Quaternion-based rotation — spin always matches screen-space mouse direction
    const cubeQuat = new THREE.Quaternion();
    const angVel = new THREE.Vector3(0, 0, 0); // angular velocity in world space

    // ── Exploding cube (Akella-style per-face explosion) ──
    let shatterProgress = 0;
    let wasShattered = false;

    // Build explode geometry: separate every triangle, add per-face attributes
    function buildExplodeGeo(srcGeo) {
      const nonIndexed = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
      const pos = nonIndexed.attributes.position;
      const count = pos.count;
      const triCount = count / 3;
      const aCenter = new Float32Array(count * 3);
      const aNormal = new Float32Array(count * 3);
      const aRand = new Float32Array(count * 3);
      const v0 = new THREE.Vector3(),
        v1 = new THREE.Vector3(),
        v2 = new THREE.Vector3();
      const edge1 = new THREE.Vector3(),
        edge2 = new THREE.Vector3(),
        faceN = new THREE.Vector3();
      for (let t = 0; t < triCount; t++) {
        const i = t * 3;
        v0.fromBufferAttribute(pos, i);
        v1.fromBufferAttribute(pos, i + 1);
        v2.fromBufferAttribute(pos, i + 2);
        const cx = (v0.x + v1.x + v2.x) / 3;
        const cy = (v0.y + v1.y + v2.y) / 3;
        const cz = (v0.z + v1.z + v2.z) / 3;
        edge1.subVectors(v1, v0);
        edge2.subVectors(v2, v0);
        faceN.crossVectors(edge1, edge2).normalize();
        const rx = Math.random(),
          ry = Math.random(),
          rz = Math.random();
        for (let v = 0; v < 3; v++) {
          const j = (i + v) * 3;
          aCenter[j] = cx;
          aCenter[j + 1] = cy;
          aCenter[j + 2] = cz;
          aNormal[j] = faceN.x;
          aNormal[j + 1] = faceN.y;
          aNormal[j + 2] = faceN.z;
          aRand[j] = rx;
          aRand[j + 1] = ry;
          aRand[j + 2] = rz;
        }
      }
      nonIndexed.setAttribute("aCenter", new THREE.BufferAttribute(aCenter, 3));
      nonIndexed.setAttribute(
        "aFaceNormal",
        new THREE.BufferAttribute(aNormal, 3)
      );
      nonIndexed.setAttribute("aRand", new THREE.BufferAttribute(aRand, 3));
      return nonIndexed;
    }

    let shardSegs = cfg.current.shardSegments || 2;
    const explodeGeo = buildExplodeGeo(
      new RoundedBoxGeometry(1, 1, 1, shardSegs, 0.08)
    );
    const explodeUniforms = {
      uExplode: { value: 0 },
      uExplodeCap: { value: 0.35 },
      uRotSpeed: { value: 0.5 },
      uTime: { value: 0 },
      uOpacity: { value: 0.7 },
      uSceneTex: { value: null },
      uBgTex: { value: null },
      uRes: { value: new THREE.Vector2(W(), H()) },
    };
    const explodeMat = new THREE.ShaderMaterial({
      uniforms: explodeUniforms,
      vertexShader: explodeVertexShader,
      fragmentShader: explodeFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const explodeMesh = new THREE.Mesh(explodeGeo, explodeMat);
    explodeMesh.visible = false;
    explodeMesh.renderOrder = 10;
    scene.add(explodeMesh);

    // ── Scroll ──
    let sT = 0,
      sC = 0;
    const onWheel = (e) => {
      sT = Math.max(
        0,
        Math.min(
          cfg.current.totalScrollRange,
          sT + e.deltaY * 0.008 * cfg.current.scrollSpeed
        )
      );
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    let tY = 0;
    const onTS = (e) => {
      if (e.touches.length === 1) tY = e.touches[0].clientY;
    };
    const onTMS = (e) => {
      if (e.touches.length !== 1) return;
      const dy = tY - e.touches[0].clientY;
      tY = e.touches[0].clientY;
      sT = Math.max(
        0,
        Math.min(
          cfg.current.totalScrollRange,
          sT + dy * 0.02 * cfg.current.scrollSpeed
        )
      );
    };
    window.addEventListener("touchstart", onTS);
    window.addEventListener("touchmove", onTMS);
    const mouse = new THREE.Vector2(-999, -999),
      mouseWorld = new THREE.Vector3(),
      mouseSmooth = new THREE.Vector3();
    const raycaster = new THREE.Raycaster(),
      mSp = new THREE.Sphere(new THREE.Vector3(), 1);
    const onMM = (e) => {
      mouse.x = (e.clientX / W()) * 2 - 1;
      mouse.y = -(e.clientY / H()) * 2 + 1;
    };
    const onTM = (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        mouse.x = (t.clientX / W()) * 2 - 1;
        mouse.y = -(t.clientY / H()) * 2 + 1;
      }
    };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("touchmove", onTM);

    // Hold detection on cube
    let bounceZ = 0,
      bounceSpin = 0,
      bounceDecay = 0;
    let holdTimer = null,
      isHolding = false,
      holdStartTime = 0;
    const testCubeHit = (e) => {
      const mx = (e.clientX / W()) * 2 - 1,
        my = -(e.clientY / H()) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
      return raycaster.ray.intersectSphere(mSp, new THREE.Vector3());
    };
    const onDown = (e) => {
      if (!testCubeHit(e)) return;
      isHolding = true;
      holdStartTime = performance.now();
      holdTimer = setTimeout(() => {
        if (isHolding) {
          // Smooth click - gentle squeeze that blends into chat transition
          clickScaleVel = -0.8;
          isHolding = false;
          // Reset scroll so progress bar rewinds to 0
          sT = 0;
          // Delay chat open so movement feels connected
          setTimeout(() => {
            if (onCubeHoldRef.current) onCubeHoldRef.current();
          }, 300);
        }
      }, 600);
    };
    const onUp = () => {
      if (holdTimer) clearTimeout(holdTimer);
      isHolding = false;
      holdTimer = null;
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
      sceneRT.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);
    const clock = new THREE.Clock();
    let raf;
    let birthStart = performance.now();
    let lastReplayKey = 0;
    let rotAngle = 0;
    // Menu animation: smoothly move object to left + scale up
    const menuPos = new THREE.Vector3(0, 0, 0);
    const menuVel = new THREE.Vector3(0, 0, 0);
    let menuScale = 1;
    let menuScaleVel = 0;
    let prevMouseX = 0,
      prevMouseY = 0;
    // Menu floating cubes
    const menuCubes = [];
    let menuCubesShown = false;
    let chatZ = 0,
      chatZVel = 0,
      chatSpinBurst = 0,
      chatArc = 0,
      chatArcVel = 0,
      chatArcX = 0,
      chatArcXVel = 0,
      wasInChat = false;
    let clickScale = 1,
      clickScaleVel = 0;

    function loop() {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.0333);
      const el = clock.elapsedTime;
      const c = cfg.current;

      // Replay detection — reset birth when birthReplay changes
      if (c.birthReplay && c.birthReplay !== lastReplayKey) {
        lastReplayKey = c.birthReplay;
        birthStart = performance.now();
        rotAngle = 0;
        // Apply initial spin burst
        angVel.x += c.birthSpinBurstX ?? 0;
        angVel.y += c.birthSpinBurstY ?? 0;
        angVel.z += c.birthSpinBurstZ ?? 0;
      }

      const birthT = Math.min(
        1,
        (performance.now() - birthStart) / 1000 / c.birthDuration
      );
      // Easing — cubic-bezier or power ease
      let birth;
      if ((c.birthUseBezier ?? 0) > 0.5) {
        const ease = cubicBezier(
          c.birthBezierX1 ?? 0.16,
          c.birthBezierY1 ?? 1.0,
          c.birthBezierX2 ?? 0.3,
          c.birthBezierY2 ?? 1.0
        );
        birth = ease(birthT);
      } else {
        const birthEase = c.birthEasing || 2.5;
        birth = 1 - Math.pow(1 - birthT, birthEase);
      }
      if (onBirthProgress) onBirthProgress(birth);
      // Fly-in from behind camera, settles slightly upward
      const bR = c.sphereRadius;
      const bA = c.noiseAmp;
      const bM = c.mouseStrength * birth;
      const birthYDist = c.birthFloatDist ?? 1.2;
      const birthY = -birthYDist * (1 - birth);
      const birthZDist = c.birthFlyInDist ?? 7;
      const birthZCurve = c.birthFlyInCurve ?? 1.8;
      const birthZ = birthZDist * Math.pow(1 - birth, birthZCurve);
      const birthScaleStart = c.birthScaleStart ?? 1.0;
      const birthScaleCurve = birthScaleStart + (1 - birthScaleStart) * birth;
      const birthOpacity = Math.min(birth * (c.birthFadeSpeed || 3), 1);
      // X/Y coordinate offsets — lerp from start to end
      const birthX =
        (c.birthStartX ?? 0) +
        ((c.birthEndX ?? 0) - (c.birthStartX ?? 0)) * birth;
      const birthYOffset =
        (c.birthStartY ?? 0) +
        ((c.birthEndY ?? 0) - (c.birthStartY ?? 0)) * birth;

      // Gentle scroll friction near card positions
      const cardCenterConv = [0.2, 0.5, 0.825];
      const prevConv = Math.max(
        0,
        Math.min(
          1,
          (sC / c.totalScrollRange - (c.shatterThreshold || 0.15)) /
            (c.convergenceRange || 0.67)
        )
      );
      let scrollRate = 0.08;
      for (let ci = 0; ci < cardCenterConv.length; ci++) {
        const dist = Math.abs(prevConv - cardCenterConv[ci]);
        if (dist < 0.04) scrollRate = Math.min(scrollRate, 0.04);
      }
      sC += (sT - sC) * scrollRate;
      const sc = sC;
      const scrollProg = Math.max(0, Math.min(1, sc / c.totalScrollRange));
      if (onScrollProgress) onScrollProgress(scrollProg);
      // Birth rotation
      rotAngle += (c.birthSpinSpeed || 0.4) * (c.birthSpinMult || 0.15) * dt;
      // Idle base rotation
      if (birth > 0.98) rotAngle += c.rotationSpeed * 0.5 * dt;

      // Bounce animation (click reaction) — clicky spring
      bounceDecay += dt;
      const bSpring = 8,
        bDamp = 4;
      const bzAccel = -bounceZ * bSpring - bounceSpin * 0.1;
      bounceZ += bounceZ * -bDamp * dt + bzAccel * dt * dt;
      if (Math.abs(bounceZ) < 0.01 && bounceDecay > 0.5) bounceZ = 0;
      bounceSpin *= Math.max(0, 1 - 3 * dt);
      rotAngle += bounceSpin * dt;

      // Click scale — gradual shrink during hold, spring back after
      if (isHolding) {
        const holdProgress = Math.min(
          1,
          (performance.now() - holdStartTime) / 600
        );
        const holdTarget = 1 - holdProgress * 0.18;
        clickScale += (holdTarget - clickScale) * 0.12;
        clickScaleVel = 0;
      } else {
        const csAccel = (1 - clickScale) * 6 - clickScaleVel * 3;
        clickScaleVel += csAccel * dt;
        clickScale += clickScaleVel * dt;
        if (
          Math.abs(clickScale - 1) < 0.001 &&
          Math.abs(clickScaleVel) < 0.005
        ) {
          clickScale = 1;
          clickScaleVel = 0;
        }
      }

      sphere.rotation.y = rotAngle;
      sphere.rotation.x =
        Math.sin(el * (c.birthTiltSpeed || 0.2)) *
        (c.birthTiltAmp || 0.04) *
        birth;

      // Proximity reporting — project sphere to screen, measure distance from mouse
      let cubeProx = 0;
      if (birth > 0.5 && onCubeProximityRef.current) {
        const screenPos = sphere.position.clone().project(camera);
        const dx = screenPos.x - mouse.x,
          dy = screenPos.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        cubeProx = Math.max(0, 1 - dist / (c.reticleRange || 1.2));
        onCubeProximityRef.current(cubeProx);
        // Update sphere for click detection
        mSp.set(sphere.position, bR * (c.shapeScale || 1) * menuScale * 1.3);
      }

      // ── Position animation: damped spring ──
      const mOpen = menuOpenRef.current;
      // ── Menu floating cubes ──
      if (mOpen && !menuCubesShown) {
        menuCubesShown = true;
        // Distributed zones to avoid overlap: top-left, right-mid, bottom-left
        const zones = [
          { x: [-6, -3.5], y: [1.5, 3.5], z: [-5, -2] },
          { x: [3.5, 6], y: [-0.5, 1.5], z: [-6, -3] },
          { x: [-4, -1.5], y: [-3.5, -1.5], z: [-4, -1.5] },
        ];
        zones.forEach((zone, i) => {
          const px = zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]);
          const py = zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]);
          const pz = zone.z[0] + Math.random() * (zone.z[1] - zone.z[0]);
          const size = 0.35 + Math.random() * 0.5;
          const g = new THREE.BoxGeometry(size, size, size);
          const m = new THREE.MeshBasicMaterial({
            color: 0xd0d4e8,
            transparent: true,
            opacity: 0,
            wireframe: false,
          });
          const edges = new THREE.EdgesGeometry(g);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0xb0b4c8,
            transparent: true,
            opacity: 0,
          });
          const mesh = new THREE.Mesh(g, m);
          const wire = new THREE.LineSegments(edges, lineMat);
          mesh.add(wire);
          mesh.position.set(px, py - 1.5, pz); // start below target
          mesh.scale.setScalar(0.01); // start tiny
          mesh.rotation.set(
            Math.random() * 2,
            Math.random() * 2,
            Math.random()
          );
          mesh.userData.rotSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.35,
            0
          );
          mesh.userData.targetY = py;
          mesh.userData.targetScale = 1;
          mesh.userData.delay = i * 0.15; // stagger entrance
          mesh.userData.born = performance.now();
          scene.add(mesh);
          menuCubes.push({ mesh, mat: m, lineMat, geo: g, edges });
        });
      }
      if (
        !mOpen &&
        menuCubesShown &&
        menuCubes.every((mc) => mc.mat.opacity < 0.01 && mc.mesh.scale.x < 0.02)
      ) {
        menuCubesShown = false;
        menuCubes.forEach((mc) => {
          scene.remove(mc.mesh);
          mc.geo.dispose();
          mc.mat.dispose();
          mc.edges.dispose();
          mc.lineMat.dispose();
        });
        menuCubes.length = 0;
      }
      menuCubes.forEach((mc) => {
        const age = (performance.now() - mc.mesh.userData.born) / 1000;
        const delay = mc.mesh.userData.delay || 0;
        const t = Math.max(0, age - delay);
        // Smooth ease for entrance
        const entrance = Math.min(1, t / 0.8);
        const ease = entrance * entrance * (3 - 2 * entrance);
        const targetOp = mOpen ? 0.15 * ease : 0;
        const targetLineOp = mOpen ? 0.25 * ease : 0;
        const targetS = mOpen ? ease : 0;
        mc.mat.opacity += (targetOp - mc.mat.opacity) * 3 * dt;
        mc.lineMat.opacity += (targetLineOp - mc.lineMat.opacity) * 3 * dt;
        // Scale in
        const curS = mc.mesh.scale.x;
        mc.mesh.scale.setScalar(curS + (targetS - curS) * 3 * dt);
        // Float up to target Y
        const ty = mc.mesh.userData.targetY || 0;
        mc.mesh.position.y +=
          ((mOpen ? ty : ty - 1.5) - mc.mesh.position.y) * 3 * dt;
        // Gentle rotation
        mc.mesh.rotation.x += mc.mesh.userData.rotSpeed.x * dt;
        mc.mesh.rotation.y += mc.mesh.userData.rotSpeed.y * dt;
      });
      const inChat = chatModeRef.current;
      const targetX = inChat ? -3.2 : 0;
      const targetY = inChat ? 0 : 0;
      const targetZ = inChat ? 4 : 0;
      const targetS = inChat ? 1.6 : 1;
      const stiffness = inChat ? 2.5 : 6.0;
      const damping = inChat ? 3.0 : 4.5;
      const dxM = targetX - menuPos.x,
        dyM = targetY - menuPos.y;
      menuVel.x += (dxM * stiffness - menuVel.x * damping) * dt;
      menuVel.y += (dyM * stiffness - menuVel.y * damping) * dt;
      menuPos.x += menuVel.x * dt;
      menuPos.y += menuVel.y * dt;
      const dsM = targetS - menuScale;
      menuScaleVel += (dsM * stiffness - menuScaleVel * damping) * dt;
      menuScale += menuScaleVel * dt;
      // Chat Z spring (separate)
      const dzM = targetZ - chatZ;
      chatZVel += (dzM * stiffness - chatZVel * damping) * dt;
      chatZ += chatZVel * dt;
      // Parabolic arc: push away + leftward, then curve back
      const arcStiff = 2.8;
      const arcDamp = 2.2;
      chatArcVel += (0 - chatArc) * arcStiff * dt - chatArcVel * arcDamp * dt;
      chatArc += chatArcVel * dt;
      chatArcXVel +=
        (0 - chatArcX) * arcStiff * dt - chatArcXVel * arcDamp * dt;
      chatArcX += chatArcXVel * dt;
      if (Math.abs(chatArc) < 0.01 && Math.abs(chatArcVel) < 0.01) {
        chatArc = 0;
        chatArcVel = 0;
      }
      if (Math.abs(chatArcX) < 0.01 && Math.abs(chatArcXVel) < 0.01) {
        chatArcX = 0;
        chatArcXVel = 0;
      }
      // Chat spin — spin right on enter
      if (inChat && !wasInChat) {
        chatSpinBurst = 4;
        // Velocity-only kicks — no position jumps, arc builds smoothly
        chatArcVel = -8;
        chatArcXVel = -5;
        angVel.y += 2.5; // direct spin impulse
        wasInChat = true;
      }
      if (!inChat && wasInChat) {
        chatSpinBurst = -4;
        chatArcVel = 8;
        chatArcXVel = 5;
        angVel.y -= 2.5;
        wasInChat = false;
      }
      chatSpinBurst *= Math.max(0, 1 - 1.8 * dt);
      rotAngle += chatSpinBurst * dt;
      angVel.y += chatSpinBurst * 0.5 * dt;
      // Mouse → camera-space torque on angular velocity (always consistent)
      const mdx = mouse.x - prevMouseX,
        mdy = mouse.y - prevMouseY;
      prevMouseX = mouse.x;
      prevMouseY = mouse.y;
      const validMouse = mouse.x > -900 && prevMouseX > -900;

      // Progress bar fill progress (0→1 as ring fills)
      const shatterStart = c.shatterThreshold || 0.15;

      // Mouse-driven spin
      if (validMouse && cubeProx > 0.5 && birth > 0.95) {
        const speed = Math.sqrt(mdx * mdx + mdy * mdy);
        const proxStrength = Math.pow(cubeProx, 2);
        const mass = 5.0;
        const strength =
          (6 + speed * 100) * proxStrength * (1 - shatterProgress);
        angVel.y += (mdx * strength) / mass;
        angVel.x += (-mdy * strength * 0.8) / mass;
      }
      // Gentle base rotation
      if (birth > 0.98) {
        angVel.y += (c.glassRotSpeedY || 0.36) * 0.08 * dt;
        angVel.x += (c.glassRotSpeedX || 0.62) * 0.08 * dt;
      }
      // Drag
      const drag = 0.9;
      angVel.x -= angVel.x * drag * dt;
      angVel.y -= angVel.y * drag * dt;
      angVel.z -= angVel.z * drag * dt;
      // Clamp
      angVel.clampLength(0, 4);
      // Apply angular velocity to quaternion (world-space rotation)
      const avLen = angVel.length();
      if (avLen > 0.0001) {
        const axis = angVel.clone().normalize();
        const dq = new THREE.Quaternion().setFromAxisAngle(axis, avLen * dt);
        cubeQuat.premultiply(dq);
        cubeQuat.normalize();
      }
      sphere.position.set(
        menuPos.x + chatArcX + birthX,
        menuPos.y + birthY + birthYOffset,
        birthZ - bounceZ + chatZ + chatArc
      );
      glassCube.position.set(
        menuPos.x + chatArcX + birthX,
        menuPos.y + birthY + birthYOffset,
        birthZ - bounceZ + chatZ + chatArc
      );

      // ── Scroll-driven transition (reversible) ──
      const shatterTriggered = scrollProg >= shatterStart;
      const targetSP = shatterTriggered
        ? Math.min(1, (scrollProg - shatterStart) / (1 - shatterStart))
        : 0;
      const lerpRate = shatterTriggered ? 0.18 : 0.06;
      shatterProgress += (targetSP - shatterProgress) * lerpRate;
      if (shatterTriggered && shatterProgress < 0.05) shatterProgress = 0.05;
      const sp = shatterProgress;

      // Track transition trigger moment (for particle stream only)
      if (shatterTriggered && !wasShattered) {
        wasShattered = true;
      }
      if (!shatterTriggered && wasShattered) {
        wasShattered = false;
      }

      // After glass breaks, kill the spin quickly
      if (shatterTriggered) {
        const postDrag = 0.95;
        angVel.x *= Math.max(0, 1 - postDrag * dt * 8);
        angVel.y *= Math.max(0, 1 - postDrag * dt * 8);
        angVel.z *= Math.max(0, 1 - postDrag * dt * 8);
      }

      // Explosion progress — scroll-driven, fully reversible
      // Ramps 0→1 over a small scroll range past the threshold
      const explodeRange = 0.12; // 12% of total scroll
      const explodeT = Math.max(
        0,
        Math.min(1, (scrollProg - shatterStart) / explodeRange)
      );

      // Glass cube visible when explosion hasn't started
      const cubeVis = explodeT < 0.01;
      glassCube.visible = cubeVis;
      glassEdges.visible = cubeVis;

      // Glass shards — fade out quickly after shatter, gone before cards appear
      const shardFadeStart = c.shatterThreshold || 0.15;
      const shardPostScroll = Math.max(
        0,
        Math.min(1, (scrollProg - shardFadeStart) / 0.1)
      );
      explodeMesh.visible = explodeT > 0.01 && shardPostScroll < 0.95;
      if (explodeMesh.visible) {
        explodeMesh.position.copy(glassCube.position);
        const hLen = c.helixLength || 60;
        const hTurns = c.helixTurns || 10;
        const convForShards = Math.max(
          0,
          Math.min(
            1,
            (scrollProg - (c.shatterThreshold || 0.15)) /
              (c.convergenceRange || 0.67)
          )
        );
        const shardYShift =
          (convForShards *
            hTurns *
            Math.PI *
            (c.helixRotationMult || 0.8) *
            hLen) /
          (hTurns * Math.PI * 2);
        explodeMesh.position.y +=
          shardYShift + shardPostScroll * shardPostScroll * 18;
        explodeMesh.quaternion.copy(cubeQuat);
        const gSize = c.glassCubeSize || 3.6;
        explodeMesh.scale
          .set(gSize, gSize, gSize)
          .multiplyScalar(bR * menuScale);
        explodeUniforms.uExplode.value = explodeT;
        explodeUniforms.uExplodeCap.value = c.explodeCap || 0.35;
        explodeUniforms.uRotSpeed.value = c.shardRotSpeed || 0.5;
        explodeUniforms.uTime.value = el;
        explodeUniforms.uOpacity.value =
          (c.shatterOpacity || 0.7) * (1 - shardPostScroll);
        explodeUniforms.uRes.value.set(W(), H());
        const newSegs = c.shardSegments || 2;
        if (newSegs !== shardSegs) {
          shardSegs = newSegs;
          const rebuildGeo = buildExplodeGeo(
            new RoundedBoxGeometry(
              1,
              1,
              1,
              shardSegs,
              c.glassCornerRadius || 0.08
            )
          );
          explodeMesh.geometry.dispose();
          explodeMesh.geometry = rebuildGeo;
        }
      }

      if (cubeVis) {
        const cr = c.glassCornerRadius || 0.08;
        if (Math.abs(cr - lastCornerR) > 0.005) {
          lastCornerR = cr;
          const newGeo = new RoundedBoxGeometry(1, 1, 1, 4, cr);
          glassCube.geometry.dispose();
          glassCube.geometry = newGeo;
          const newEdgeGeo = new THREE.EdgesGeometry(newGeo);
          glassEdges.geometry.dispose();
          glassEdges.geometry = newEdgeGeo;
          // Rebuild explode geo from new geometry
          const newExplodeGeo = buildExplodeGeo(
            new RoundedBoxGeometry(1, 1, 1, shardSegs, cr)
          );
          explodeMesh.geometry.dispose();
          explodeMesh.geometry = newExplodeGeo;
        }
        glassCube.quaternion.copy(cubeQuat);
        const gSize = c.glassCubeSize || 3.6;
        glassCube.scale
          .set(gSize, gSize, gSize)
          .multiplyScalar(bR * menuScale * clickScale * birthScaleCurve);
        glassUniforms.uRefract.value = c.glassRefraction || 0.15;
        glassUniforms.uBlur.value = c.glassBlur || 2.9;
        glassUniforms.uEdgeAlpha.value = c.glassEdgeAlpha || 1;
        glassUniforms.uFresnelPow.value = c.glassFresnelPower || 0.5;
        glassUniforms.uSpecular.value = c.glassSpecular || 4;
        glassUniforms.uSpecPower.value = c.glassSpecPower || 120;
        glassUniforms.uIridescence.value = c.glassIridescence || 0;
        glassUniforms.uOpacity.value =
          (c.glassOpacity != null ? c.glassOpacity : 0.92) * birthOpacity;
        glassUniforms.uTint.value.set(
          c.glassTintR || 0.9,
          c.glassTintG || 0.92,
          c.glassTintB || 1
        );
        glassUniforms.uRes.value.set(W(), H());
        glassEdgeMat.opacity = c.glassEdgeOpacity;
        const halfSide = (c.glassCubeSize || 3.6) * 0.5;
        fU.uBounds.value = halfSide - 0.15;
      }

      // Sphere — hidden, particles replace it
      sphere.visible = false;
      sphere.scale.setScalar(bR * (c.shapeScale || 1) * menuScale * clickScale);
      fU.uTime.value = el;
      fU.uScrollProgress.value = scrollProg;
      fU.uShape.value = 0;
      fU.uMeshAlpha.value = birthOpacity * (1 - shatterProgress);
      fU.uTetraScale.value = c.tetraScale;
      fU.uCubeScale.value = c.cubeScale;
      fU.uShapeTiltX.value = c.shapeTiltX || 0;
      fU.uShapeTiltY.value = c.shapeTiltY || 0;
      fU.uGC1.value.set(c.gradColor1 || "#1a0a3e");
      fU.uGC2.value.set(c.gradColor2 || "#d41878");
      fU.uGC3.value.set(c.gradColor3 || "#08b4a8");
      fU.uGC4.value.set(c.gradColor4 || "#f5a623");
      fU.uNoiseFreq.value = c.noiseFreq;
      fU.uNoiseAmp.value = bA;
      fU.uNoiseSpeed.value = c.noiseSpeed;
      fU.uNoiseOctaves.value = c.noiseOctaves;
      fU.uNoiseLac.value = c.noiseLacunarity;
      fU.uNoisePers.value = c.noisePersistence;
      fU.uSpikeSharp.value = c.spikeSharpness;
      fU.uNoiseWarp.value = c.noiseWarp;
      fU.uMouseStrength.value = bM;
      fU.uMouseRadius.value = c.mouseRadius;
      fU.uMouseFalloff.value = c.mouseFalloff;
      fU.uMouseNoiseBoost.value = c.mouseNoiseBoost;
      fU.uMouseNoiseFreq.value = c.mouseNoiseFreq;
      fU.uMouseAttract.value = c.mouseAttract;
      fU.uBaseBrightStart.value = c.baseBrightStart;
      fU.uBaseBrightEnd.value = c.baseBrightEnd;
      fU.uRoughness.value = c.roughness;
      fU.uMetallic.value = c.metallic;
      fU.uSpecularIntensity.value = c.specularIntensity;
      fU.uFresnelPower.value = c.fresnelPower;
      fU.uFresnelIntensity.value = c.fresnelIntensity;
      fU.uIridescence.value = c.iridescence;
      fU.uEnvReflect.value = c.envReflect;
      fU.uEnvBrightness.value = c.envBrightness;
      fU.uAoStrength.value = c.aoStrength;
      fU.uAoRange.value = c.aoRange;
      fU.uRimStrength.value = c.rimStrength;
      fU.uRimColor.value.set(c.rimColor);
      fU.uAmbientIntensity.value = c.ambientIntensity;
      fU.uLight1Pos.value.set(c.light1X, c.light1Y, c.light1Z);
      fU.uLight1Int.value = c.light1Intensity;
      fU.uLight2Pos.value.set(c.light2X, c.light2Y, c.light2Z);
      fU.uLight2Int.value = c.light2Intensity;
      fU.uLight3Pos.value.set(c.light3X, c.light3Y, c.light3Z);
      fU.uLight3Int.value = c.light3Intensity;
      fU.uWaveformMix.value = 0;
      fU.uWaveTime.value = el;
      if (birth > 0.95) {
        raycaster.setFromCamera(mouse, camera);
        mSp.set(sphere.position, bR * 1.5);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectSphere(mSp, hit)) mouseWorld.copy(hit);
        else {
          const pl = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
          raycaster.ray.intersectPlane(pl, mouseWorld);
        }
        mouseSmooth.lerp(mouseWorld, 0.08);
        fU.uMouseWorld.value.copy(
          mouseSmooth.clone().sub(sphere.position).divideScalar(bR)
        );
      }

      // Background texture from gradient canvas
      if (gradCanvasRef.current && !bgTex) {
        bgTex = new THREE.CanvasTexture(gradCanvasRef.current);
        bgTex.minFilter = THREE.LinearFilter;
        bgTex.magFilter = THREE.LinearFilter;
        glassUniforms.uBgTex.value = bgTex;
      }
      if (bgTex) bgTex.needsUpdate = true;

      // Two-pass: scene to RT (no glass/explode), then full scene to screen
      const gVis = glassCube.visible;
      const eVis = explodeMesh.visible;
      glassCube.visible = false;
      explodeMesh.visible = false;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      glassCube.visible = gVis;
      explodeMesh.visible = eVis;
      // Feed scene textures to both glass and explode shaders
      glassUniforms.uSceneTex.value = sceneRT.texture;
      explodeUniforms.uSceneTex.value = sceneRT.texture;
      if (bgTex) explodeUniforms.uBgTex.value = bgTex;
      renderer.render(scene, camera);
    }
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove", onTMS);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      sphereGeo.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      glassEdgeGeo.dispose();
      glassEdgeMat.dispose();
      explodeGeo.dispose();
      explodeMat.dispose();
      scene.remove(explodeMesh);
      menuCubes.forEach((mc) => {
        scene.remove(mc.mesh);
        mc.geo.dispose();
        mc.mat.dispose();
      });
      sceneRT.dispose();
      if (bgTex) bgTex.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
      }}
    />
  );
}
