import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CanvasTexture,
  Clock,
  Color,
  EdgesGeometry,
  FrontSide,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene as THREEScene,
  ShaderMaterial,
  Sphere,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getCurrentSeason } from "../../config/defaults";
import { sphereVertexShader } from "./shaders/sphereVertex.glsl.js";
import { sphereFragmentShader } from "./shaders/sphereFragment.glsl.js";
// Glass cube now uses MeshPhysicalMaterial with transmission (no custom shader)
import { createCubeFaceRenderer } from "./cubeFaceRenderer";
import { createExpressionState, updateExpressions } from "./expressionTriggers";
import { createGlassEnvironment } from "./glassEnv";

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
  onBirthProgress,
  gradientCanvas,
  menuOpen,
  chatMode,
  showcaseTransition,
  showcaseOpen,
  activeSeason,
  onCubeClick,
  onCubeHold,
  onCubeProximity,
}) {
  const containerRef = useRef(null);
  const gradCanvasRef = useRef(null);
  gradCanvasRef.current = gradientCanvas;
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen || false;
  const chatModeRef = useRef(false);
  chatModeRef.current = chatMode || false;
  const showcaseTransRef = useRef(false);
  showcaseTransRef.current = showcaseTransition || false;
  const showcaseOpenRef = useRef(false);
  showcaseOpenRef.current = showcaseOpen || false;
  const activeSeasonRef = useRef(activeSeason || getCurrentSeason());
  activeSeasonRef.current = activeSeason || getCurrentSeason();
  const onCubeClickRef = useRef(onCubeClick);
  onCubeClickRef.current = onCubeClick;
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
    const isMobile = "ontouchstart" in window || window.innerWidth < 768;
    const renderer = new WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
    );
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    const scene = new THREEScene();
    const envMap = createGlassEnvironment(renderer, scene);
    const camera = new PerspectiveCamera(50, W() / H(), 0.1, 200);
    camera.position.set(0, 0, 8);

    // ── Mesh ──
    const sphereGeo = new IcosahedronGeometry(1, 64);
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
      uMouseWorld: { value: new Vector3(0, 0, 3) },
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
      uRimColor: { value: new Color(0x1a2a4a) },
      uAmbientIntensity: { value: 0 },
      uLight1Pos: { value: new Vector3(3, 4, 5) },
      uLight1Int: { value: 1.2 },
      uLight2Pos: { value: new Vector3(-3, -1, 3) },
      uLight2Int: { value: 3 },
      uLight3Pos: { value: new Vector3(-0.2, -8, 0) },
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
      uGC1: { value: new Color("#1a0a3e") },
      uGC2: { value: new Color("#d41878") },
      uGC3: { value: new Color("#08b4a8") },
      uGC4: { value: new Color("#f5a623") },
    };
    const sphere = new Mesh(
      sphereGeo,
      new ShaderMaterial({
        vertexShader: FV,
        fragmentShader: FF,
        uniforms: fU,
        transparent: true,
        depthWrite: true,
      })
    );
    sphere.renderOrder = 0;
    sphere.visible = false; // sphere is replaced by glass cube — kept only for disposal
    scene.add(sphere);

    // ── Glass cube ──
    // Mobile: skip transmission (renders scene twice internally). Use a lightweight
    // transparent material that looks 80% as good at half the GPU cost.
    const glassGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.08);
    const glassMat = isMobile
      ? new MeshPhysicalMaterial({
          transparent: true,
          opacity: 0.18,
          roughness: 0.02,
          metalness: 0.05,
          envMapIntensity: 2.0,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          color: 0xffffff,
          side: FrontSide,
          depthWrite: false,
        })
      : new MeshPhysicalMaterial({
          transmission: 1,
          roughness: 0,
          ior: 1.8,
          thickness: 3.5,
          transparent: true,
          metalness: 0,
          envMapIntensity: 2.0,
          specularIntensity: 1,
          specularColor: 0xffffff,
          clearcoat: 0.3,
          clearcoatRoughness: 0,
          color: 0xffffff,
          side: FrontSide,
          depthWrite: false,
        });
    const glassCube = new Mesh(glassGeo, glassMat);
    glassCube.renderOrder = 10;
    scene.add(glassCube);

    // ── Glowing smiley / audio wave inside the cube ──
    const smileyCanvas = document.createElement("canvas");
    smileyCanvas.width = 256;
    smileyCanvas.height = 256;
    const sCtx = smileyCanvas.getContext("2d");
    const smCx = 128,
      smCy = 128;
    let dizzySmooth = 0;
    let chatMorph = 0; // 0 = smiley, 1 = wave
    let sleepSmooth = 0; // 0 = awake, 1 = sleeping
    let happySmooth = 0; // 0 = normal, 1 = happy (after chat closes)
    let prevChatMode = false;
    let blinkTimer = 0;
    let blinkAmount = 0; // 0 = open, 1 = closed
    let nextBlink = 2 + Math.random() * 4;
    let doubleBlink = 0; // countdown for second blink (0 = none pending)
    // ── New expressions ──
    let expr = {
      curious: 0, // near-hover without click
      wink: 0, // gold theme change
      love: 0, // contact form sent (set externally)
      cheeky: 0, // rapid scroll direction changes
      proud: 0, // viewed all showcase sections
      startled: 0, // first click
      shy: 0, // long hover on cube
      phew: 0, // birth complete — "sorry I'm late"
    };
    let prevMx = 0,
      prevMy = 0;
    // ── Face renderer (extracted to cubeFaceRenderer.js) ──
    const { drawCubeFace } = createCubeFaceRenderer(smileyCanvas);
    const exprTriggerState = createExpressionState();
    exprTriggerState.prevSeason = activeSeasonRef.current;

    // Love expression: triggered by ContactForm via custom event
    const onLoveTrigger = () => {
      expr.love = 1;
    };
    window.addEventListener("contact-sent", onLoveTrigger);
    const smileyTex = new CanvasTexture(smileyCanvas);
    smileyTex.needsUpdate = true;
    const smileyMat = new SpriteMaterial({
      map: smileyTex,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const smiley = new Sprite(smileyMat);
    smiley.scale.set(0.75, 0.75, 1);
    smiley.position.set(0, 0, 0.05);
    smiley.renderOrder = 12;
    glassCube.add(smiley);

    let lastCornerR = 0.08;
    // Quaternion-based rotation — spin always matches screen-space mouse direction
    const cubeQuat = new Quaternion();
    const angVel = new Vector3(0, 0, 0); // angular velocity in world space

    const mouse = new Vector2(-999, -999);
    let lastActivity = performance.now();
    const raycaster = new Raycaster(),
      mSp = new Sphere(new Vector3(), 1);
    // ── Reusable math objects — avoids per-frame allocations in the render loop ──
    const _screenPos = new Vector3();
    const _axis = new Vector3();
    const _dq = new Quaternion();
    const _testMouse = new Vector2();
    const _testHit = new Vector3();
    const onMM = (e) => {
      mouse.x = (e.clientX / W()) * 2 - 1;
      mouse.y = -(e.clientY / H()) * 2 + 1;
      lastActivity = performance.now();
    };
    const onTM = (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        mouse.x = (t.clientX / W()) * 2 - 1;
        mouse.y = -(t.clientY / H()) * 2 + 1;
        lastActivity = performance.now();
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
      holdStartTime = 0,
      holdFired = false;
    const testCubeHit = (e) => {
      const mx = (e.clientX / W()) * 2 - 1,
        my = -(e.clientY / H()) * 2 + 1;
      raycaster.setFromCamera(_testMouse.set(mx, my), camera);
      return raycaster.ray.intersectSphere(mSp, _testHit);
    };
    const onDown = (e) => {
      lastActivity = performance.now();
      // Startled on first click/touch — BUG3 FIX: skip if showcase open (scZoom handles it)
      if (!exprTriggerState.firstClickFired && !showcaseOpenRef.current) {
        exprTriggerState.firstClickFired = true;
        expr.startled = 1;
      }
      // Don't interact with cube when overlays are open
      if (
        menuOpenRef.current ||
        chatModeRef.current ||
        showcaseOpenRef.current ||
        showcaseTransRef.current
      )
        return;
      if (!testCubeHit(e)) return;
      isHolding = true;
      holdFired = false;
      holdStartTime = performance.now();
      holdTimer = setTimeout(() => {
        if (isHolding) {
          // Hold — trigger showcase
          holdFired = true;
          clickScaleVel = -0.8;
          isHolding = false;
          if (onCubeHoldRef.current) onCubeHoldRef.current();
        }
      }, 600);
    };
    const onUp = () => {
      if (holdTimer) clearTimeout(holdTimer);
      // Quick click only — if held long enough to start progress ring, don't open chat
      const holdDuration = performance.now() - holdStartTime;
      if (isHolding && !holdFired && holdDuration < 150) {
        clickScaleVel = -0.8;
        setTimeout(() => {
          if (onCubeClickRef.current) onCubeClickRef.current();
        }, 300);
      }
      isHolding = false;
      holdFired = false;
      holdTimer = null;
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    // Touch hold support
    const onTouchDown = (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      onDown({ clientX: t.clientX, clientY: t.clientY });
    };
    const onTouchUp = () => onUp();
    window.addEventListener("touchstart", onTouchDown, { passive: true });
    window.addEventListener("touchend", onTouchUp);
    window.addEventListener("touchcancel", onTouchUp);

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
      }, 150);
    };
    window.addEventListener("resize", onResize);
    const clock = new Clock();
    let raf;
    let goldSparkleFrame = 0;
    let birthStart = performance.now();
    let birthPhewFired = false;
    let lastReplayKey = 0;
    let rotAngle = 0;
    // Menu animation: smoothly move object to left + scale up
    const menuPos = new Vector3(0, 0, 0);
    const menuVel = new Vector3(0, 0, 0);
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
    // Showcase transition — cube zooms toward camera
    let scZoom = 0; // 0 = normal, 1 = fully zoomed

    function loop() {
      raf = requestAnimationFrame(loop);

      // When showcase is open, hide canvas entirely and skip all rendering
      if (showcaseOpenRef.current) {
        renderer.domElement.style.visibility = "hidden";
        return;
      }
      renderer.domElement.style.visibility = "visible";

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
      // Trigger phew face when birth just completes
      if (birthT >= 1 && !birthPhewFired) {
        birthPhewFired = true;
        expr.phew = 1;
      }
      // Fly-in from behind camera, settles slightly upward
      const bR = c.sphereRadius;
      const birthYDist = c.birthFloatDist ?? 1.2;
      const birthY = -birthYDist * (1 - birth);
      const birthZDist = c.birthFlyInDist ?? 7;
      const birthZCurve = c.birthFlyInCurve ?? 1.8;
      const birthZ = birthZDist * Math.pow(1 - birth, birthZCurve);
      // Parabolic arc — peaks mid-flight, zero at start & end
      const birthArc = Math.sin(birth * Math.PI) * (c.birthArcHeight ?? 2.0);
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

      // Proximity reporting — project cube to screen, measure distance from mouse
      let cubeProx = 0;
      if (birth > 0.5 && onCubeProximityRef.current) {
        _screenPos.copy(glassCube.position).project(camera);
        const dx = _screenPos.x - mouse.x,
          dy = _screenPos.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        cubeProx = Math.max(0, 1 - dist / (c.reticleRange || 1.2));
        onCubeProximityRef.current(cubeProx);
        // Update bounding sphere for click detection
        mSp.set(glassCube.position, bR * (c.shapeScale || 1) * menuScale * 1.3);
      }

      // ── Position animation: damped spring ──
      const mOpen = menuOpenRef.current;
      // ── Menu floating cubes — two glass cubes, left and right ──
      if (mOpen && !menuCubesShown) {
        menuCubesShown = true;
        const cubeSize = (c.glassCubeSize || 3.6) * 0.55;
        const cr = c.glassCornerRadius || 0.08;
        const zones = [
          { x: [-1.5, 1.5], y: [1.5, 3.5], z: [-5, -3] }, // above, behind
          { x: [-1.5, 1.5], y: [-3.5, -1.5], z: [-5, -3] }, // below, behind
        ];
        zones.forEach((zone, i) => {
          const px = zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]);
          const py = zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]);
          const pz = zone.z[0] + Math.random() * (zone.z[1] - zone.z[0]);
          const g = new RoundedBoxGeometry(
            cubeSize,
            cubeSize,
            cubeSize,
            4,
            cr * cubeSize
          );
          const m = isMobile
            ? new MeshPhysicalMaterial({
                transparent: true,
                opacity: 0,
                roughness: 0.05,
                metalness: 0.1,
                envMapIntensity: 1.2,
                color: 0xffffff,
              })
            : new MeshPhysicalMaterial({
                transmission: 0.92,
                roughness: 0.05,
                ior: 1.5,
                thickness: 1.2,
                transparent: true,
                opacity: 0,
                metalness: 0,
                envMapIntensity: 1.2,
                color: 0xffffff,
              });
          const edgeGeo = new EdgesGeometry(g);
          const lineMat = new LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
          });
          const mesh = new Mesh(g, m);
          const wire = new LineSegments(edgeGeo, lineMat);
          mesh.add(wire);
          mesh.position.set(px, py - 1.5, pz);
          mesh.scale.setScalar(0.01);
          mesh.rotation.set(
            Math.random() * 0.6,
            Math.random() * 0.6,
            Math.random() * 0.3
          );
          mesh.userData.rotSpeed = new Vector3(
            (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.5) * 0.18,
            0
          );
          mesh.userData.targetY = py;
          mesh.userData.delay = i * 0.2;
          mesh.userData.born = performance.now();
          scene.add(mesh);
          menuCubes.push({ mesh, mat: m, lineMat, geo: g, edges: edgeGeo });
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
        const entrance = Math.min(1, t / 1.0); // slower entrance
        const ease = entrance * entrance * (3 - 2 * entrance);
        const targetOp = mOpen ? (isMobile ? 0.12 : 0.88) * ease : 0;
        const targetLineOp = mOpen ? 0.1 * ease : 0;
        const targetS = mOpen ? ease : 0;
        mc.mat.opacity += (targetOp - mc.mat.opacity) * 2.5 * dt;
        mc.lineMat.opacity += (targetLineOp - mc.lineMat.opacity) * 2.5 * dt;
        const curS = mc.mesh.scale.x;
        mc.mesh.scale.setScalar(curS + (targetS - curS) * 2.5 * dt);
        const ty = mc.mesh.userData.targetY || 0;
        mc.mesh.position.y +=
          ((mOpen ? ty : ty - 1.5) - mc.mesh.position.y) * 2.5 * dt;
        mc.mesh.rotation.x += mc.mesh.userData.rotSpeed.x * dt;
        mc.mesh.rotation.y += mc.mesh.userData.rotSpeed.y * dt;
      });
      const inChat = chatModeRef.current;
      const targetX = inChat ? -3.2 : 0;
      const targetY = inChat ? 0 : 0;
      const targetZ = inChat ? 4 : 0;
      const targetS = inChat ? 1.6 : 1;
      const stiffness = inChat
        ? c.chatStiffness || 1.8
        : c.chatReturnStiffness || 5.0;
      const damping = inChat
        ? c.chatDamping || 3.5
        : c.chatReturnDamping || 4.0;
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
      const arcStiff = c.chatArcStiffness || 2.0;
      const arcDamp = c.chatArcDamping || 2.5;
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
      // Chat spin — big spin burst on enter
      if (inChat && !wasInChat) {
        chatSpinBurst = c.chatSpinKick || 5.0;
        chatArcVel = c.chatArcKickZ || -6;
        chatArcXVel = c.chatArcKickX || -4;
        angVel.y += c.chatSpinKick || 5.0;
        angVel.x += 1.5;
        wasInChat = true;
      }
      if (!inChat && wasInChat) {
        chatSpinBurst = -(c.chatSpinKick || 5.0);
        chatArcVel = -(c.chatArcKickZ || -6);
        chatArcXVel = -(c.chatArcKickX || -4);
        angVel.y -= c.chatSpinKick || 5.0;
        angVel.x -= 1.5;
        wasInChat = false;
      }
      chatSpinBurst *= Math.max(0, 1 - (c.chatSpinDecay || 1.4) * dt);
      rotAngle += chatSpinBurst * dt;
      angVel.y += chatSpinBurst * 0.5 * dt;
      // Mouse → camera-space torque on angular velocity (always consistent)
      const mdx = mouse.x - prevMouseX,
        mdy = mouse.y - prevMouseY;
      prevMouseX = mouse.x;
      prevMouseY = mouse.y;
      const validMouse = mouse.x > -900 && prevMouseX > -900;

      // Mouse-driven spin
      if (validMouse && cubeProx > 0.5 && birth > 0.95) {
        const speed = Math.sqrt(mdx * mdx + mdy * mdy);
        const proxStrength = Math.pow(cubeProx, 2);
        const mass = 5.0;
        const strength = (6 + speed * 100) * proxStrength;
        angVel.y += (mdx * strength) / mass;
        angVel.x += (-mdy * strength * 0.8) / mass;
      }
      // Gentle base rotation
      if (birth > 0.98) {
        angVel.y += (c.glassRotSpeedY || 0.36) * 0.08 * dt;
        angVel.x += (c.glassRotSpeedX || 0.62) * 0.08 * dt;
      }
      // Drag
      const drag = 0.75;
      angVel.x -= angVel.x * drag * dt;
      angVel.y -= angVel.y * drag * dt;
      angVel.z -= angVel.z * drag * dt;
      // Clamp
      angVel.clampLength(0, 8);
      // Apply angular velocity to quaternion (world-space rotation)
      const avLen = angVel.length();

      // ── Smiley / wave visualizer ──
      const dizzyTarget = Math.min(1, Math.max(0, (avLen - 1.5) / 3.5));
      dizzySmooth +=
        (dizzyTarget - dizzySmooth) *
        (dizzyTarget > dizzySmooth ? 3 : 1.5) *
        dt;
      // Smooth morph: 0 = smiley face, 1 = wave visualizer
      const morphTarget = chatModeRef.current ? 1 : 0;
      chatMorph += (morphTarget - chatMorph) * 1.8 * dt;
      // Happy face when returning from chat
      if (prevChatMode && !chatModeRef.current) happySmooth = 1;
      prevChatMode = chatModeRef.current;
      happySmooth = Math.max(0, happySmooth - dt * 0.3); // decay over ~3s
      // ── Expression triggers (extracted to expressionTriggers.js) ──
      // Safe mouse coords (0,0 if cursor hasn't entered yet)
      const safeMx = mouse.x < -900 ? 0 : mouse.x;
      const safeMy = mouse.y < -900 ? 0 : mouse.y;
      const { anyActive: exprShowing } = updateExpressions(
        expr,
        exprTriggerState,
        {
          dt,
          cubeProx,
          isHolding,
          chatMode: chatModeRef.current,
          activeSeason: activeSeasonRef.current,
          angVelY: angVel.y,
          showcaseOpen: showcaseOpenRef.current,
          now: performance.now(),
          lookX: safeMx,
          lookY: safeMy,
        }
      );
      // #K — Use smoothed look-at from expression state
      const smoothMx = exprTriggerState.smoothLookX;
      const smoothMy = exprTriggerState.smoothLookY;

      // Blink — natural timing: ~300ms close-to-open, occasional double-blink
      if (exprShowing || sleepSmooth > 0.3) {
        // Suppress new blinks during expressions/sleep, but let current blink finish
        blinkTimer = 0;
      } else {
        blinkTimer += dt;
        if (blinkTimer >= nextBlink) {
          blinkAmount = 1;
          blinkTimer = 0;
          nextBlink = 2.5 + Math.random() * 4;
          // 15% chance of double-blink
          if (Math.random() < 0.15) doubleBlink = 0.25;
        }
      }
      // Double-blink countdown
      if (doubleBlink > 0) {
        doubleBlink -= dt;
        if (doubleBlink <= 0 && blinkAmount < 0.2) {
          blinkAmount = 1;
          doubleBlink = 0;
        }
      }
      // Decay: ~300ms to fully reopen (dt * 3.5)
      blinkAmount = Math.max(0, blinkAmount - dt * 3.5);

      // Sleep — BUG4 FIX: use max of lastActivity and lastExpressionTime
      const effectiveLastActive = Math.max(
        lastActivity,
        exprTriggerState.lastExpressionTime || 0
      );
      const idleTime = (performance.now() - effectiveLastActive) / 1000;
      const sleepTarget = idleTime > 15 ? Math.min(1, (idleTime - 15) / 3) : 0;
      // Fast wake: if an expression fires while sleeping, snap awake quickly
      const sleepLerp = exprShowing && sleepSmooth > 0.2 ? 8 : 2;
      sleepSmooth += (sleepTarget - sleepSmooth) * sleepLerp * dt;
      const themeColors = [
        c.gradColor1,
        c.gradColor2,
        c.gradColor3,
        c.gradColor4,
      ];
      // Pass idle micro-expression state through expr object for renderer
      expr._driftX = exprTriggerState.eyeDriftX;
      expr._driftY = exprTriggerState.eyeDriftY;
      expr._mouthVar = exprTriggerState.mouthVar;
      // Hold progress for loading circle — only starts after the click
      // threshold (150ms) so quick taps never flash the ring.
      const holdElapsed = performance.now() - holdStartTime;
      const holdDeadZone = 150; // matches click threshold in onUp
      const holdProgress =
        isHolding && !holdFired && holdElapsed > holdDeadZone
          ? Math.max(
              0,
              Math.min(1, (holdElapsed - holdDeadZone) / (600 - holdDeadZone))
            )
          : 0;

      // #16 — skip smiley redraw when nothing is changing
      const isGold = (c.gradColor1 || "").toLowerCase() === "#b8860b";
      // Gold sparkles animate slowly — redraw every 3 frames, not every frame
      const goldNeedsRedraw = isGold && ++goldSparkleFrame % 3 === 0;
      const exprActive =
        expr.curious > 0.01 ||
        expr.wink > 0.01 ||
        expr.love > 0.01 ||
        expr.cheeky > 0.01 ||
        expr.proud > 0.01 ||
        expr.startled > 0.01 ||
        expr.shy > 0.01 ||
        expr.phew > 0.01;
      const smileyDirty =
        dizzySmooth > 0.01 ||
        happySmooth > 0.01 ||
        blinkAmount > 0.01 ||
        exprActive ||
        Math.abs(chatMorph - (chatModeRef.current ? 1 : 0)) > 0.01 ||
        Math.abs(sleepSmooth - (sleepTarget > 0.5 ? 1 : 0)) > 0.01 ||
        holdProgress > 0 ||
        scZoom > 0.01 ||
        goldNeedsRedraw ||
        Math.abs(smoothMx - (prevMx || 0)) > 0.01 ||
        Math.abs(smoothMy - (prevMy || 0)) > 0.01;
      prevMx = smoothMx;
      prevMy = smoothMy;

      if (smileyDirty) {
        drawCubeFace(
          dizzySmooth,
          el,
          smoothMx,
          smoothMy,
          chatMorph,
          themeColors,
          scZoom,
          sleepSmooth,
          holdProgress,
          happySmooth,
          blinkAmount,
          expr
        );
        smileyTex.needsUpdate = true;
      }

      if (avLen > 0.0001) {
        _axis.copy(angVel).normalize();
        _dq.setFromAxisAngle(_axis, avLen * dt);
        cubeQuat.premultiply(_dq);
        cubeQuat.normalize();
      }
      // Showcase transition: cube gently zooms toward camera and enlarges
      if (showcaseTransRef.current || showcaseOpenRef.current) {
        scZoom = Math.min(1, scZoom + dt * 0.5); // ~2s to fully zoom
      } else if (scZoom > 0) {
        // Snap back instantly — scene is revealed by checker, no time to animate
        scZoom = 0;
      }
      // Ease the raw scZoom for smooth acceleration/deceleration
      const zoomEased =
        scZoom < 0.5
          ? 2 * scZoom * scZoom
          : 1 - Math.pow(-2 * scZoom + 2, 2) / 2;
      const zoomZ = zoomEased * 12;
      const zoomScale = 1 + zoomEased * 1.2;

      const baseX = menuPos.x + chatArcX + birthX;
      const baseY = menuPos.y + birthY + birthYOffset + birthArc;
      const baseZ = birthZ - bounceZ + chatZ + chatArc;

      // Gently center as it zooms
      const px = baseX * (1 - zoomEased);
      const py = baseY * (1 - zoomEased * 0.4);
      const pz = baseZ + zoomZ;

      glassCube.position.set(px, py, pz);

      // Glass cube — hidden when fully zoomed into showcase
      const cubeVisible = zoomEased < 0.99;
      glassCube.visible = cubeVisible;

      {
        const cr = c.glassCornerRadius || 0.08;
        if (Math.abs(cr - lastCornerR) > 0.005) {
          lastCornerR = cr;
          const newGeo = new RoundedBoxGeometry(1, 1, 1, 4, cr);
          glassCube.geometry.dispose();
          glassCube.geometry = newGeo;
        }
        glassCube.quaternion.copy(cubeQuat);
        const gSize = c.glassCubeSize || 3.6;
        glassCube.scale
          .set(gSize, gSize, gSize)
          .multiplyScalar(
            bR * menuScale * clickScale * birthScaleCurve * zoomScale
          );
        // Desktop: opacity is a secondary fade over the transmission effect
        // Mobile: opacity IS the glass effect — cap at 0.15 to stay translucent
        glassMat.opacity = isMobile
          ? 0.18 * birthOpacity * (1 - zoomEased)
          : birthOpacity * (1 - zoomEased);
        glassMat.roughness = c.glassRoughness || 0;
        if (!isMobile) {
          glassMat.ior = c.glassIOR || 1.8;
          glassMat.thickness = c.glassThickness || 3.5;
          glassMat.transmission =
            c.glassTransmission != null ? c.glassTransmission : 1;
        }
      }

      // Single-pass render — MeshPhysicalMaterial handles transmission internally
      renderer.render(scene, camera);
    }
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchstart", onTouchDown);
      window.removeEventListener("touchend", onTouchUp);
      window.removeEventListener("touchcancel", onTouchUp);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      envMap.dispose();
      sphereGeo.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      menuCubes.forEach((mc) => {
        scene.remove(mc.mesh);
        mc.geo.dispose();
        mc.mat.dispose();
      });
      smileyTex.dispose();
      smileyMat.dispose();
      window.removeEventListener("contact-sent", onLoveTrigger);
      sphere.material.dispose();
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
