import { useEffect, useRef } from "react";
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Clock,
  DirectionalLight,
  IcosahedronGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene as THREEScene,
  ShaderMaterial,
  ShadowMaterial,
  Sphere,
  Vector2,
  Vector3,
  Vector4,
  VSMShadowMap,
  WebGLRenderer,
} from "three";
import { getCurrentSeason } from "../../config/defaults";
import { BG_COLOR } from "../../constants/style";
import {
  blobVertexShader,
  blobFragmentShader,
  blobDepthVertexShader,
  blobDepthFragmentShader,
  MAX_RIPPLES,
} from "./shaders/blob.glsl.js";
import { createBlobFace } from "./blobFace";
import { createBlobPhysics } from "./blobPhysics";
import { IS_TOUCH, IS_LOW_POWER } from "../../utils/device";

// Where the shadow light sits relative to the blob (it follows the blob so
// the shadow camera can stay tight and the shadow stays soft)
const SUN_OFFSET = new Vector3(1.1, 9, 2.2);
// Resolution of the page-gradient sample the blob refracts (desktop only)
const BG_TEX_SIZE = 192;

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

function hexToVec3(hex, out) {
  const h = (typeof hex === "string" ? hex : "#000000").replace("#", "");
  return out.set(
    (parseInt(h.substring(0, 2), 16) || 0) / 255,
    (parseInt(h.substring(2, 4), 16) || 0) / 255,
    (parseInt(h.substring(4, 6), 16) || 0) / 255
  );
}

// Ripple slots for meshes without physics: all free (start time -1) but with
// sane wave params so the shader never divides by a zero wavenumber
function idleRipples() {
  const r = new Float32Array(MAX_RIPPLES * 4);
  const p = new Float32Array(MAX_RIPPLES * 4);
  for (let i = 0; i < MAX_RIPPLES; i++) {
    r[i * 4 + 2] = 1;
    r[i * 4 + 3] = -1;
    p[i * 4 + 1] = 24;
    p[i * 4 + 2] = 9;
    p[i * 4 + 3] = 1.5;
  }
  return { r, p };
}

function createBlobUniforms(physics) {
  const idle = physics ? null : idleRipples();
  return {
    uTime: { value: 0 },
    uNoiseFreq: { value: 1.35 },
    uNoiseAmp: { value: 0.14 },
    uNoiseSpeed: { value: 0.28 },
    uRipple: { value: physics ? physics.ripple : idle.r },
    uRippleP: { value: physics ? physics.rippleP : idle.p },
    uRippleWidth: { value: 0.45 },
    uWobble: { value: physics ? physics.wobble : new Float32Array(6) },
    uPressDir: { value: new Vector3(0, 0, 1) },
    uPressDepth: { value: 0 },
    uPressWidth: { value: 0.55 },
    uMouseDir: { value: new Vector3(0, 0, 1) },
    uMouseBulge: { value: 0 },
    uSquashAxis: { value: new Vector3(0, 0, 1) },
    uSquash: { value: 1 },
    uOpacity: { value: 0 },
    uIor: { value: 1.32 },
    uFaceIor: { value: 1.12 },
    uDispersion: { value: 0.06 },
    uRefract: { value: 0.09 },
    uShimmer: { value: 0.85 },
    uGlint: { value: 0.6 },
    uRim: { value: 0.5 },
    uEdgeDark: { value: 0.28 },
    uBgMix: { value: 0 },
    uFaceMix: { value: 0 },
    uFaceSize: { value: 1 },
    uFaceBlur: { value: 0.4 },
    uFaceBlurJig: { value: 4 },
    uFaceFadeJig: { value: 0.55 },
    uResolution: { value: new Vector2(1, 1) },
    uBgRect: { value: new Vector4(0, 0, 1, 1) },
    uFaceCenterV: { value: new Vector3() },
    uBgColor: {
      value: new Vector3(BG_COLOR.r / 255, BG_COLOR.g / 255, BG_COLOR.b / 255),
    },
    uTint: { value: new Vector3(1, 1, 1) },
    uC1: { value: new Vector3() },
    uC2: { value: new Vector3() },
    uC3: { value: new Vector3() },
    uC4: { value: new Vector3() },
    uFaceTex: { value: null },
    uBgTex: { value: null },
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
    const isMobile = IS_LOW_POWER;
    const renderer = new WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
    );
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    // The blob shader outputs display-ready colour; tone mapping would only
    // dull the shadow material
    renderer.toneMapping = NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = VSMShadowMap;
    container.appendChild(renderer.domElement);
    const scene = new THREEScene();
    const camera = new PerspectiveCamera(50, W() / H(), 0.1, 200);
    camera.position.set(0, 0, 8);
    camera.updateMatrixWorld();
    const _size = new Vector2();
    const readSize = () => renderer.getDrawingBufferSize(_size);

    // ── Face texture (sampled inside the blob shader) ──
    const face = createBlobFace(256);
    const faceTex = new CanvasTexture(face.canvas);
    // Premultiplied so mip blur never darkens the edges of the drawing
    faceTex.premultiplyAlpha = true;
    faceTex.wrapS = faceTex.wrapT = ClampToEdgeWrapping;
    faceTex.minFilter = LinearMipmapLinearFilter;
    faceTex.magFilter = LinearFilter;
    faceTex.generateMipmaps = true;

    // ── Page gradient sample the blob refracts (desktop only) ──
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = BG_TEX_SIZE;
    bgCanvas.height = BG_TEX_SIZE;
    const bgCtx = bgCanvas.getContext("2d");
    const bgTex = new CanvasTexture(bgCanvas);
    bgTex.minFilter = LinearFilter;
    bgTex.magFilter = LinearFilter;
    bgTex.generateMipmaps = false;
    bgTex.wrapS = bgTex.wrapT = ClampToEdgeWrapping;

    // ── The blob ──
    const physics = createBlobPhysics();
    const uniforms = createBlobUniforms(physics);
    uniforms.uFaceTex.value = faceTex;
    uniforms.uBgTex.value = bgTex;
    readSize();
    uniforms.uResolution.value.copy(_size);
    const blobGeo = new IcosahedronGeometry(1, isMobile ? 24 : 48);
    const blobMat = new ShaderMaterial({
      vertexShader: blobVertexShader,
      fragmentShader: blobFragmentShader,
      uniforms,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: true,
    });
    // Shadow pass shares the uniforms so the shadow deforms with the surface
    const blobDepthMat = new ShaderMaterial({
      vertexShader: blobDepthVertexShader,
      fragmentShader: blobDepthFragmentShader,
      uniforms,
    });
    const blob = new Mesh(blobGeo, blobMat);
    blob.castShadow = true;
    blob.customDepthMaterial = blobDepthMat;
    blob.frustumCulled = false;
    blob.renderOrder = 0;
    scene.add(blob);

    // ── Floor: invisible plane that only shows the blob's shadow ──
    const floorMat = new ShadowMaterial({
      color: 0x151530,
      opacity: 0.22,
      transparent: true,
      depthWrite: false,
    });
    const floor = new Mesh(new PlaneGeometry(80, 80), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.05;
    floor.receiveShadow = true;
    floor.renderOrder = -1;
    scene.add(floor);
    const sun = new DirectionalLight(0xffffff, 1);
    sun.castShadow = true;
    const shadowSize = isMobile ? 256 : 512;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -4.5;
    sc.right = 4.5;
    sc.top = 4.5;
    sc.bottom = -4.5;
    sc.near = 0.5;
    sc.far = 40;
    sun.shadow.radius = isMobile ? 9 : 22;
    sun.shadow.blurSamples = isMobile ? 6 : 10;
    sun.shadow.bias = 0;
    scene.add(sun);
    scene.add(sun.target);

    // ── Decorative blobs shown behind the menu's frosted glass ──
    const menuGeo = new IcosahedronGeometry(1, isMobile ? 12 : 20);
    const menuBlobs = [];
    let menuBlobsShown = false;
    let menuBlobsCreated = false;
    function ensureMenuBlobs() {
      if (menuBlobsCreated) return;
      menuBlobsCreated = true;
      const zones = [
        { x: [-1.5, 1.5], y: [1.5, 3.5], z: [-5, -3] },
        { x: [-1.5, 1.5], y: [-3.5, -1.5], z: [-5, -3] },
      ];
      zones.forEach((zone, i) => {
        const px = zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]);
        const py = zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]);
        const pz = zone.z[0] + Math.random() * (zone.z[1] - zone.z[0]);
        const u = createBlobUniforms(null);
        u.uNoiseAmp.value = 0.17;
        u.uNoiseFreq.value = 1.6;
        u.uGlint.value = 0;
        u.uShimmer.value = 0.6;
        const m = new ShaderMaterial({
          vertexShader: blobVertexShader,
          fragmentShader: blobFragmentShader,
          uniforms: u,
          transparent: true,
          premultipliedAlpha: true,
          depthWrite: false,
        });
        const mesh = new Mesh(menuGeo, m);
        mesh.frustumCulled = false;
        mesh.renderOrder = 1;
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
        mesh.userData.timeOffset = Math.random() * 100;
        mesh.userData.size = 0.75 + Math.random() * 0.3;
        mesh.visible = false;
        scene.add(mesh);
        menuBlobs.push({ mesh, mat: m, u, opacity: 0, scale: 0 });
      });
    }

    // ── Face state ──
    let chatMorph = 0;
    let sleepSmooth = 0;
    let blinkTimer = 0;
    let blinkAmount = 0;
    let nextBlink = 2 + Math.random() * 4;
    let doubleBlink = 0;
    let smoothLookX = 0,
      smoothLookY = 0;
    let idleT = 0,
      driftX = 0,
      driftY = 0,
      mouthVar = 0;
    let pressSmooth = 0;
    const themeColors = [null, null, null, null];
    const faceState = {
      lookX: 0,
      lookY: 0,
      blink: 0,
      sleep: 0,
      press: 0,
      morph: 0,
      time: 0,
      colors: themeColors,
      driftX: 0,
      driftY: 0,
      mouthVar: 0,
    };
    const lastDrawn = { ...faceState, colors: "" };

    const blobQuat = new Quaternion();
    const angVel = new Vector3(0, 0, 0);

    const mouse = new Vector2(-999, -999);
    let lastActivity = performance.now();
    const raycaster = new Raycaster(),
      mSp = new Sphere(new Vector3(), 1);
    const _screenPos = new Vector3();
    const _axis = new Vector3();
    const _dq = new Quaternion();
    const _qInv = new Quaternion();
    const _testMouse = new Vector2();
    const _testHit = new Vector3();
    const _pressDir = new Vector3(0, 0, 1);
    const _mouseDir = new Vector3(0, 0, 1);
    const _landDir = new Vector3(0, -1, 0);

    const onMM = (e) => {
      mouse.x = (e.clientX / W()) * 2 - 1;
      mouse.y = -(e.clientY / H()) * 2 + 1;
      lastActivity = performance.now();
      trackPressMove(e.clientX, e.clientY);
    };
    const onTM = (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        mouse.x = (t.clientX / W()) * 2 - 1;
        mouse.y = -(t.clientY / H()) * 2 + 1;
        lastActivity = performance.now();
        trackPressMove(t.clientX, t.clientY);
      }
    };
    window.addEventListener("mousemove", onMM, { passive: true });
    window.addEventListener("touchmove", onTM, { passive: true });

    // ── Pressing ──
    // A press is a poke: dent + ring of waves + squash. Holding deepens the
    // dent and keeps the surface rippling; letting go throws a bigger ring.
    // On top of that a tap opens chat and a hold past holdDuration opens the
    // showcase (blobTapOpensChat / blobHoldOpensShowcase in defaults.js).
    let holdTimer = null,
      isHolding = false,
      holdStartTime = 0,
      holdFired = false,
      holdProgress = 0,
      pressX = 0,
      pressY = 0,
      pressMoved = false,
      lastTouchTime = 0;
    // A press that travels this far is a drag (spinning the blob), not a tap
    const TAP_SLOP_PX = 14;

    // Pointer → the surface point under it as an OBJECT-space direction.
    // Falls back to the closest point on the hit sphere so a held finger that
    // slides off the edge keeps pressing the rim instead of dropping.
    const pointerToDir = (nx, ny, out) => {
      raycaster.setFromCamera(_testMouse.set(nx, ny), camera);
      const hit =
        raycaster.ray.intersectSphere(mSp, _testHit) ||
        raycaster.ray.closestPointToPoint(blob.position, _testHit);
      return out
        .copy(hit)
        .sub(blob.position)
        .applyQuaternion(_qInv.copy(blob.quaternion).invert())
        .normalize();
    };
    const endPress = () => {
      physics.release(_pressDir, holdProgress, clock.elapsedTime);
      isHolding = false;
    };
    const onDown = (e) => {
      lastActivity = performance.now();
      if (
        menuOpenRef.current ||
        chatModeRef.current ||
        showcaseOpenRef.current ||
        showcaseTransRef.current
      )
        return;
      // Ignore presses that land on real UI (menu button, chat, overlays) —
      // this listener is on window, so it fires for every mousedown and would
      // otherwise also poke the blob when it drifts behind a button.
      if (
        e.target?.closest &&
        e.target.closest("button, a, input, textarea, select, [role='dialog']")
      )
        return;
      const nx = (e.clientX / W()) * 2 - 1,
        ny = -(e.clientY / H()) * 2 + 1;
      raycaster.setFromCamera(_testMouse.set(nx, ny), camera);
      if (!raycaster.ray.intersectSphere(mSp, _testHit)) return false;
      mouse.set(nx, ny);
      pointerToDir(nx, ny, _pressDir);
      physics.press(_pressDir, clock.elapsedTime, 1);
      isHolding = true;
      holdFired = false;
      pressMoved = false;
      holdProgress = 0;
      pressX = e.clientX;
      pressY = e.clientY;
      holdStartTime = performance.now();
      if (cfg.current.blobHoldOpensShowcase) {
        holdTimer = setTimeout(() => {
          holdTimer = null;
          if (!isHolding) return;
          holdFired = true;
          endPress();
          if (onCubeHoldRef.current) onCubeHoldRef.current();
        }, cfg.current.holdDuration || 600);
      }
      return true;
    };
    const onUp = () => {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
      if (isHolding) {
        // Any release before the hold fires is a tap (a fixed short window
        // left a dead zone that swallowed ordinary finger taps); a press
        // that travelled is a drag, not a tap
        const held = performance.now() - holdStartTime;
        const wasTap =
          !pressMoved && !holdFired && held < (cfg.current.holdDuration || 600);
        endPress();
        if (wasTap && cfg.current.blobTapOpensChat) {
          setTimeout(() => {
            if (onCubeClickRef.current) onCubeClickRef.current();
          }, 300);
        }
      }
      holdFired = false;
    };
    const trackPressMove = (cx, cy) => {
      if (!isHolding || pressMoved) return;
      const dx = cx - pressX;
      const dy = cy - pressY;
      if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) pressMoved = true;
    };
    // Touch fires a compatibility mouse sequence after touchend; ignore it so
    // every tap isn't processed twice.
    const isCompatMouseEvent = () => performance.now() - lastTouchTime < 700;
    const onMouseDownWrapped = (e) => {
      if (isCompatMouseEvent()) return;
      onDown(e);
    };
    const onMouseUpWrapped = () => {
      if (isCompatMouseEvent()) return;
      onUp();
    };
    window.addEventListener("mousedown", onMouseDownWrapped);
    window.addEventListener("mouseup", onMouseUpWrapped);
    const onTouchDown = (e) => {
      lastTouchTime = performance.now();
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const engaged = onDown({
        clientX: t.clientX,
        clientY: t.clientY,
        target: e.target,
      });
      // Only suppress native behaviour (long-press callout, double-tap zoom)
      // when the touch actually grabbed the blob — leaves scrolling in the
      // showcase, menu and chat completely untouched.
      if (engaged && e.cancelable) e.preventDefault();
    };
    const onTouchUp = () => {
      lastTouchTime = performance.now();
      onUp();
    };
    window.addEventListener("touchstart", onTouchDown, { passive: false });
    window.addEventListener("touchend", onTouchUp);
    window.addEventListener("touchcancel", onTouchUp);
    // Press-and-hold on the blob is our gesture — don't let the OS hijack it
    const onContextMenu = (e) => {
      if (isHolding) e.preventDefault();
    };
    window.addEventListener("contextmenu", onContextMenu);

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
        readSize();
        uniforms.uResolution.value.copy(_size);
      }, 150);
    };
    window.addEventListener("resize", onResize);

    const clock = new Clock();
    let raf;
    let birthStart = performance.now();
    let birthLanded = false;
    let lastReplayKey = 0;
    const menuPos = new Vector3(0, 0, 0);
    const menuVel = new Vector3(0, 0, 0);
    let menuScale = 1;
    let menuScaleVel = 0;
    let prevMouseX = 0,
      prevMouseY = 0;
    let chatZ = 0,
      chatZVel = 0,
      chatSpinBurst = 0,
      chatArc = 0,
      chatArcVel = 0,
      chatArcX = 0,
      chatArcXVel = 0,
      wasInChat = false;
    let scZoom = 0;
    let cachedBirthBezier = null;
    let cachedBezierKey = "";
    let wasShowcaseOpen = false;
    let bgFrame = 0;
    const themeKey = ["", "", "", ""];
    const themeVec = [uniforms.uC1, uniforms.uC2, uniforms.uC3, uniforms.uC4];

    function loop() {
      raf = requestAnimationFrame(loop);

      const now = performance.now();

      // Fully pause rendering when showcase is open
      if (showcaseOpenRef.current) {
        renderer.domElement.style.visibility = "hidden";
        wasShowcaseOpen = true;
        return;
      }
      if (wasShowcaseOpen) {
        wasShowcaseOpen = false;
        renderer.domElement.style.visibility = "visible";
        clock.getDelta(); // flush stale delta
        return;
      }

      const dt = Math.min(clock.getDelta(), 0.0333);
      const el = clock.elapsedTime;
      const c = cfg.current;

      if (c.birthReplay && c.birthReplay !== lastReplayKey) {
        lastReplayKey = c.birthReplay;
        birthStart = now;
        birthLanded = false;
        angVel.x += c.birthSpinBurstX ?? 0;
        angVel.y += c.birthSpinBurstY ?? 0;
        angVel.z += c.birthSpinBurstZ ?? 0;
      }

      const birthT = Math.min(1, (now - birthStart) / 1000 / c.birthDuration);
      let birth;
      if ((c.birthUseBezier ?? 0) > 0.5) {
        const bezKey = `${c.birthBezierX1},${c.birthBezierY1},${c.birthBezierX2},${c.birthBezierY2}`;
        if (bezKey !== cachedBezierKey) {
          cachedBezierKey = bezKey;
          cachedBirthBezier = cubicBezier(
            c.birthBezierX1 ?? 0.16,
            c.birthBezierY1 ?? 1.0,
            c.birthBezierX2 ?? 0.3,
            c.birthBezierY2 ?? 1.0
          );
        }
        birth = cachedBirthBezier(birthT);
      } else {
        const birthEase = c.birthEasing || 2.5;
        birth = 1 - Math.pow(1 - birthT, birthEase);
      }
      if (onBirthProgress) onBirthProgress(birth);
      // Landing: the blob settles with a visible wobble
      if (birthT >= 0.92 && !birthLanded) {
        birthLanded = true;
        physics.kick(0.9, _landDir);
      }

      // Portrait phones: shrink a touch so the blob leaves room for the
      // touch hint below it instead of filling the width
      const fit = Math.max(0.8, Math.min(1, 0.55 + camera.aspect * 0.55));
      const R = (c.blobRadius || 1.45) * fit;
      const birthYDist = c.birthFloatDist ?? 1.2;
      const birthY = -birthYDist * (1 - birth);
      const birthZDist = c.birthFlyInDist ?? 7;
      const birthZCurve = c.birthFlyInCurve ?? 1.8;
      const birthZ = birthZDist * Math.pow(1 - birth, birthZCurve);
      const birthArc = Math.sin(birth * Math.PI) * (c.birthArcHeight ?? 2.0);
      const birthScaleStart = c.birthScaleStart ?? 1.0;
      const birthScaleCurve = birthScaleStart + (1 - birthScaleStart) * birth;
      const birthOpacity = Math.min(birth * (c.birthFadeSpeed || 3), 1);
      const birthX =
        (c.birthStartX ?? 0) +
        ((c.birthEndX ?? 0) - (c.birthStartX ?? 0)) * birth;
      const birthYOffset =
        (c.birthStartY ?? 0) +
        ((c.birthEndY ?? 0) - (c.birthStartY ?? 0)) * birth;

      // ── Menu decoration ──
      const mOpen = menuOpenRef.current;
      if (mOpen && !menuBlobsShown) {
        menuBlobsShown = true;
        ensureMenuBlobs();
        menuBlobs.forEach((mb) => {
          mb.mesh.visible = true;
          mb.mesh.userData.born = now;
          mb.opacity = 0;
          mb.scale = 0.01;
        });
      }
      if (
        !mOpen &&
        menuBlobsShown &&
        menuBlobs.every((mb) => mb.opacity < 0.01 && mb.scale < 0.02)
      ) {
        menuBlobsShown = false;
        menuBlobs.forEach((mb) => {
          mb.mesh.visible = false;
        });
      }

      // ── Chat mode: the blob slides aside and grows ──
      const inChat = chatModeRef.current;
      const targetX = inChat ? -3.2 : 0;
      const targetY = 0;
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
      const dzM = targetZ - chatZ;
      chatZVel += (dzM * stiffness - chatZVel * damping) * dt;
      chatZ += chatZVel * dt;
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
      if (inChat && !wasInChat) {
        chatSpinBurst = c.chatSpinKick || 5.0;
        chatArcVel = c.chatArcKickZ || -6;
        chatArcXVel = c.chatArcKickX || -4;
        angVel.y += c.chatSpinKick || 5.0;
        angVel.x += 1.5;
        physics.kick(0.6, _landDir);
        wasInChat = true;
      }
      if (!inChat && wasInChat) {
        chatSpinBurst = -(c.chatSpinKick || 5.0);
        chatArcVel = -(c.chatArcKickZ || -6);
        chatArcXVel = -(c.chatArcKickX || -4);
        angVel.y -= c.chatSpinKick || 5.0;
        angVel.x -= 1.5;
        physics.kick(0.6, _landDir);
        wasInChat = false;
      }
      chatSpinBurst *= Math.max(0, 1 - (c.chatSpinDecay || 1.4) * dt);
      angVel.y += chatSpinBurst * 0.5 * dt;

      // ── Showcase zoom (blob flies into the camera) ──
      if (showcaseTransRef.current || showcaseOpenRef.current) {
        scZoom = Math.min(1, scZoom + dt * 1.1);
      } else if (scZoom > 0) {
        scZoom = 0;
      }
      const zoomEased =
        scZoom < 0.5
          ? 2 * scZoom * scZoom
          : 1 - Math.pow(-2 * scZoom + 2, 2) / 2;
      const zoomZ = zoomEased * 12;
      const zoomScale = 1 + zoomEased * 1.2;

      // Sleep: a slow breath in the scale
      const breath = 1 + sleepSmooth * Math.sin(el * 1.3) * 0.015;
      const worldR = R * menuScale * birthScaleCurve * zoomScale * breath;

      const baseX = menuPos.x + chatArcX + birthX;
      const baseY = menuPos.y + birthY + birthYOffset + birthArc;
      const baseZ = birthZ + chatZ + chatArc;
      const px = baseX * (1 - zoomEased);
      const py = baseY * (1 - zoomEased * 0.4);
      const pz = baseZ + zoomZ;
      blob.position.set(px, py, pz);
      blob.scale.setScalar(worldR);
      blob.visible = zoomEased < 0.99;
      // Hit sphere: a little bigger than the blob on cursor devices, a
      // finger-sized margin on touch
      mSp.set(blob.position, worldR * (IS_TOUCH ? 1.55 : 1.12));

      // ── Cursor: proximity, spin, attraction ──
      let cubeProx = 0;
      if (birth > 0.5) {
        _screenPos.copy(blob.position).project(camera);
        const dx = _screenPos.x - mouse.x,
          dy = _screenPos.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        cubeProx = Math.max(0, 1 - dist / (c.reticleRange || 1.2));
        if (onCubeProximityRef.current) onCubeProximityRef.current(cubeProx);
      }
      const mdx = mouse.x - prevMouseX,
        mdy = mouse.y - prevMouseY;
      prevMouseX = mouse.x;
      prevMouseY = mouse.y;
      const validMouse = mouse.x > -900 && prevMouseX > -900;
      if (validMouse && cubeProx > 0.5 && birth > 0.95) {
        const speed = Math.sqrt(mdx * mdx + mdy * mdy);
        const proxStrength = Math.pow(cubeProx, 2);
        const mass = 5.0;
        const strength = (6 + speed * 100) * proxStrength;
        angVel.y += (mdx * strength) / mass;
        angVel.x += (-mdy * strength * 0.8) / mass;
      }
      if (birth > 0.98) {
        angVel.y += (c.blobSpinY ?? 0.36) * 0.08 * dt;
        angVel.x += (c.blobSpinX ?? 0.62) * 0.08 * dt;
      }
      const drag = 0.75;
      angVel.x -= angVel.x * drag * dt;
      angVel.y -= angVel.y * drag * dt;
      angVel.z -= angVel.z * drag * dt;
      angVel.clampLength(0, 8);
      const avLen = angVel.length();
      if (avLen > 0.0001) {
        _axis.copy(angVel).normalize();
        _dq.setFromAxisAngle(_axis, avLen * dt);
        blobQuat.premultiply(_dq);
        blobQuat.normalize();
      }
      blob.quaternion.copy(blobQuat);
      blob.updateMatrixWorld();

      if (validMouse && birth > 0.9) {
        pointerToDir(mouse.x, mouse.y, _mouseDir);
        physics.setMouse(_mouseDir, cubeProx);
      } else {
        physics.setMouse(_mouseDir, 0);
      }

      // ── Press physics ──
      if (isHolding) {
        holdProgress = Math.max(
          0,
          Math.min(1, (now - holdStartTime - 120) / 900)
        );
        pointerToDir(mouse.x, mouse.y, _pressDir);
        physics.hold(_pressDir, holdProgress, dt, el);
      }
      physics.update(dt);
      physics.writeUniforms(uniforms);

      // ── Face state ──
      const morphTarget = chatModeRef.current ? 1 : 0;
      chatMorph += (morphTarget - chatMorph) * 1.8 * dt;
      const lx = mouse.x < -900 ? 0 : mouse.x;
      const ly = mouse.y < -900 ? 0 : mouse.y;
      smoothLookX += (lx - smoothLookX) * Math.min(1, dt * 6);
      smoothLookY += (ly - smoothLookY) * Math.min(1, dt * 6);
      idleT += dt;
      driftX += (Math.sin(idleT * 0.7) * 2.5 - driftX) * dt * 1.5;
      driftY += (Math.sin(idleT * 0.5 + 1.7) * 1.5 - driftY) * dt * 1.5;
      mouthVar += (Math.sin(idleT * 0.3 + 3.1) * 0.3 - mouthVar) * dt * 1.2;
      const pressExpr = Math.min(
        1,
        physics.pressDepth * 4.5 + (isHolding ? 0.25 : 0)
      );
      pressSmooth += (pressExpr - pressSmooth) * Math.min(1, dt * 10);

      if (sleepSmooth > 0.3 || isHolding) {
        blinkTimer = 0;
      } else {
        blinkTimer += dt;
        if (blinkTimer >= nextBlink) {
          blinkAmount = 1;
          blinkTimer = 0;
          nextBlink = 2.5 + Math.random() * 4;
          if (Math.random() < 0.15) doubleBlink = 0.25;
        }
      }
      if (doubleBlink > 0) {
        doubleBlink -= dt;
        if (doubleBlink <= 0 && blinkAmount < 0.2) {
          blinkAmount = 1;
          doubleBlink = 0;
        }
      }
      blinkAmount = Math.max(0, blinkAmount - dt * 3.5);

      const idleSeconds = (now - lastActivity) / 1000;
      const sleepIdle = c.sleepIdleTime ?? 15;
      const sleepRamp = c.sleepRampTime ?? 3;
      const sleepTarget =
        idleSeconds > sleepIdle
          ? Math.min(1, (idleSeconds - sleepIdle) / sleepRamp)
          : 0;
      sleepSmooth += (sleepTarget - sleepSmooth) * 2 * dt;

      // Theme colours → face + shimmer palette (parsed only on change)
      const hexes = [c.gradColor1, c.gradColor2, c.gradColor3, c.gradColor4];
      for (let i = 0; i < 4; i++) {
        themeColors[i] = hexes[i];
        if (hexes[i] !== themeKey[i]) {
          themeKey[i] = hexes[i];
          hexToVec3(hexes[i], themeVec[i].value);
        }
      }

      faceState.lookX = smoothLookX;
      faceState.lookY = smoothLookY;
      faceState.blink = blinkAmount;
      faceState.sleep = sleepSmooth;
      faceState.press = pressSmooth;
      faceState.morph = chatMorph;
      faceState.time = el;
      faceState.driftX = driftX;
      faceState.driftY = driftY;
      faceState.mouthVar = mouthVar;
      const colorsKey = themeKey.join("|");
      const faceDirty =
        chatMorph > 0.4 ||
        colorsKey !== lastDrawn.colors ||
        Math.abs(faceState.lookX - lastDrawn.lookX) > 0.01 ||
        Math.abs(faceState.lookY - lastDrawn.lookY) > 0.01 ||
        Math.abs(faceState.blink - lastDrawn.blink) > 0.01 ||
        Math.abs(faceState.sleep - lastDrawn.sleep) > 0.01 ||
        Math.abs(faceState.press - lastDrawn.press) > 0.01 ||
        Math.abs(faceState.morph - lastDrawn.morph) > 0.01 ||
        Math.abs(faceState.driftX - lastDrawn.driftX) > 0.04 ||
        Math.abs(faceState.driftY - lastDrawn.driftY) > 0.04 ||
        Math.abs(faceState.mouthVar - lastDrawn.mouthVar) > 0.015;
      if (faceDirty) {
        face.draw(faceState);
        faceTex.needsUpdate = true;
        Object.assign(lastDrawn, faceState);
        lastDrawn.colors = colorsKey;
      }

      // ── Blob uniforms ──
      const u = uniforms;
      u.uTime.value = el;
      u.uNoiseFreq.value = c.blobNoiseFreq ?? 1.35;
      u.uNoiseAmp.value = c.blobNoiseAmp ?? 0.14;
      u.uNoiseSpeed.value = c.blobNoiseSpeed ?? 0.28;
      u.uIor.value = c.blobIor ?? 1.32;
      u.uFaceIor.value = c.blobFaceIor ?? 1.12;
      u.uDispersion.value = c.blobDispersion ?? 0.06;
      u.uRefract.value = c.blobRefract ?? 0.09;
      u.uShimmer.value = c.blobShimmer ?? 0.85;
      u.uGlint.value = isMobile ? 0 : c.blobGlint ?? 0.6;
      u.uRim.value = c.blobRim ?? 0.5;
      u.uEdgeDark.value = c.blobEdgeDark ?? 0.28;
      u.uFaceBlur.value = c.blobFaceBlur ?? 0.4;
      u.uFaceBlurJig.value = c.blobFaceBlurJiggle ?? 4;
      u.uFaceFadeJig.value = c.blobFaceFadeJiggle ?? 0.55;
      u.uOpacity.value = birthOpacity * (1 - zoomEased) * (c.blobOpacity ?? 0.96);
      u.uFaceMix.value = birthOpacity;
      u.uFaceSize.value = worldR * (c.blobFaceScale ?? 1.25);
      // Face plane sits a third of a radius in front of the centre: a shorter
      // path through the glass keeps it legible at rest
      u.uFaceCenterV.value
        .copy(blob.position)
        .applyMatrix4(camera.matrixWorldInverse);
      u.uFaceCenterV.value.z += worldR * 0.3;

      // Page gradient behind the blob → refraction source (desktop only).
      // Only the square of screen around the blob is copied, every other
      // frame, so the per-frame cost stays tiny.
      const grad = gradCanvasRef.current;
      if (!isMobile && grad && grad.width > 0 && blob.visible) {
        const distZ = Math.max(camera.position.z - blob.position.z, 0.5);
        const halfH =
          Math.tan((camera.fov * Math.PI) / 360) * distZ;
        const hy = Math.min(1, (worldR * 1.35 * 1.5) / halfH); // NDC half-extent
        const hx = Math.min(1, hy / camera.aspect);
        let rx = (_screenPos.x + 1) / 2 - hx / 2;
        let ry = (_screenPos.y + 1) / 2 - hy / 2;
        let rw = hx,
          rh = hy;
        if (rx < 0) {
          rw += rx;
          rx = 0;
        }
        if (ry < 0) {
          rh += ry;
          ry = 0;
        }
        rw = Math.max(0.02, Math.min(rw, 1 - rx));
        rh = Math.max(0.02, Math.min(rh, 1 - ry));
        u.uBgRect.value.set(rx, ry, rw, rh);
        if (++bgFrame % 2 === 0) {
          const gw = grad.width,
            gh = grad.height;
          bgCtx.clearRect(0, 0, BG_TEX_SIZE, BG_TEX_SIZE);
          bgCtx.drawImage(
            grad,
            rx * gw,
            (1 - ry - rh) * gh,
            rw * gw,
            rh * gh,
            0,
            0,
            BG_TEX_SIZE,
            BG_TEX_SIZE
          );
          bgTex.needsUpdate = true;
        }
        u.uBgMix.value = 1;
      } else {
        u.uBgMix.value = 0;
      }

      // ── Floor shadow follows the blob ──
      floor.position.y = c.floorY ?? -2.05;
      floorMat.opacity = c.shadowOpacity ?? 0.22;
      sun.shadow.radius = c.shadowSoftness ?? (isMobile ? 9 : 22);
      sun.position.copy(blob.position).add(SUN_OFFSET);
      sun.target.position.copy(blob.position);
      floor.visible = blob.visible && birth > 0.05;

      // ── Menu blobs ──
      menuBlobs.forEach((mb, i) => {
        const age = (now - mb.mesh.userData.born) / 1000;
        const delay = mb.mesh.userData.delay || 0;
        const t = Math.max(0, age - delay);
        const entrance = Math.min(1, t / 1.0);
        const ease = entrance * entrance * (3 - 2 * entrance);
        const targetOp = mOpen ? (isMobile ? 0.6 : 0.88) * ease : 0;
        const targetSc = mOpen ? ease : 0;
        mb.opacity += (targetOp - mb.opacity) * 2.5 * dt;
        mb.scale += (targetSc - mb.scale) * 2.5 * dt;
        mb.mesh.scale.setScalar(
          Math.max(0.01, mb.scale) * R * mb.mesh.userData.size
        );
        const ty = mb.mesh.userData.targetY || 0;
        mb.mesh.position.y +=
          ((mOpen ? ty : ty - 1.5) - mb.mesh.position.y) * 2.5 * dt;
        mb.mesh.rotation.x += mb.mesh.userData.rotSpeed.x * dt;
        mb.mesh.rotation.y += mb.mesh.userData.rotSpeed.y * dt;
        const mu = mb.u;
        const mt = el + mb.mesh.userData.timeOffset;
        mu.uTime.value = mt;
        mu.uOpacity.value = mb.opacity;
        mu.uWobble.value[0] = Math.sin(mt * 1.7 + i) * 0.02;
        mu.uWobble.value[3] = Math.sin(mt * 1.1 + i * 2.1) * 0.025;
        mu.uWobble.value[4] = Math.cos(mt * 1.4 + i * 0.7) * 0.02;
        for (let k = 0; k < 4; k++) mu[`uC${k + 1}`].value.copy(themeVec[k].value);
      });

      renderer.render(scene, camera);
    }
    // Dev-only peek at the live state for headless checks (stripped in prod)
    if (import.meta.env.DEV) {
      window.__blobDebug = () => ({
        x: +blob.position.x.toFixed(2),
        y: +blob.position.y.toFixed(2),
        z: +blob.position.z.toFixed(2),
        scale: +blob.scale.x.toFixed(2),
        chat: chatModeRef.current,
        menu: menuOpenRef.current,
        morph: +chatMorph.toFixed(2),
        opacity: +uniforms.uOpacity.value.toFixed(2),
        holding: isHolding,
      });
      window.__blobFace = face;
    }
    loop();
    return () => {
      if (import.meta.env.DEV) {
        delete window.__blobDebug;
        delete window.__blobFace;
      }
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousedown", onMouseDownWrapped);
      window.removeEventListener("mouseup", onMouseUpWrapped);
      window.removeEventListener("touchstart", onTouchDown);
      window.removeEventListener("touchend", onTouchUp);
      window.removeEventListener("touchcancel", onTouchUp);
      window.removeEventListener("contextmenu", onContextMenu);
      if (holdTimer) clearTimeout(holdTimer);
      clearTimeout(resizeTimer);
      container.removeChild(renderer.domElement);
      menuBlobs.forEach((mb) => {
        scene.remove(mb.mesh);
        mb.mat.dispose();
      });
      menuGeo.dispose();
      blobGeo.dispose();
      blobMat.dispose();
      blobDepthMat.dispose();
      floor.geometry.dispose();
      floorMat.dispose();
      sun.shadow.dispose();
      faceTex.dispose();
      bgTex.dispose();
      renderer.dispose();
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
