import { Vector3 } from "three";
import { MAX_RIPPLES } from "./shaders/blob.glsl.js";

/**
 * createBlobPhysics()
 *
 * JS side of the blob's motion. Owns the ripple ring buffer, the six jelly
 * wobble modes (damped springs), the sustained press dent, the directional
 * squash and the cursor bulge, and writes them into the shader uniforms.
 *
 * All directions are unit vectors in the blob's OBJECT space, so a dent made
 * on one part of the surface stays on that part as the blob rotates.
 *
 * Ripple uniforms (per slot):
 *   uRipple  = (dir.xyz, startTime)   — startTime < 0 marks a free slot
 *   uRippleP = (amp, speed, k, decay) — amplitude in radii, angular
 *              frequency rad/s, wavenumber rad^-1, decay 1/s
 */
export function createBlobPhysics() {
  const ripple = new Float32Array(MAX_RIPPLES * 4);
  const rippleP = new Float32Array(MAX_RIPPLES * 4);
  for (let i = 0; i < MAX_RIPPLES; i++) {
    ripple[i * 4 + 2] = 1;
    ripple[i * 4 + 3] = -1;
    // Free slots still carry sane wave params so the shader never divides
    // by a zero wavenumber
    rippleP[i * 4 + 1] = 24;
    rippleP[i * 4 + 2] = 9;
    rippleP[i * 4 + 3] = 1.5;
  }
  let nextSlot = 0;

  // Jelly modes: natural frequencies spread so the wobble reads as organic
  const OMEGA = [22, 19, 25, 17, 21, 27];
  const ZETA = 0.14;
  const wobble = new Float32Array(6);
  const wobbleV = new Float32Array(6);

  const pressDir = new Vector3(0, 0, 1);
  let pressDepth = 0,
    pressTarget = 0,
    pressVel = 0;

  const squashAxis = new Vector3(0, 0, 1);
  let squash = 1,
    squashVel = 0,
    squashTarget = 1;

  const mouseDir = new Vector3(0, 0, 1);
  let mouseBulge = 0,
    mouseBulgeTarget = 0;

  let holdEmitTimer = 0;

  function spawnRipple(dir, amp, time, opts) {
    const speed = opts?.speed ?? 24;
    const k = opts?.k ?? 9;
    const decay = opts?.decay ?? 1.5;
    const i = nextSlot;
    nextSlot = (nextSlot + 1) % MAX_RIPPLES;
    ripple[i * 4] = dir.x;
    ripple[i * 4 + 1] = dir.y;
    ripple[i * 4 + 2] = dir.z;
    ripple[i * 4 + 3] = time;
    rippleP[i * 4] = amp;
    rippleP[i * 4 + 1] = speed;
    rippleP[i * 4 + 2] = k;
    rippleP[i * 4 + 3] = decay;
  }

  // Excite the jelly modes. Weighting by the mode shapes evaluated at the
  // press direction means the surface first moves INWARD under the finger
  // and pokes on different spots wobble differently.
  function kick(strength, dir) {
    const d = dir || pressDir;
    const w = [
      d.x * d.y,
      d.y * d.z,
      d.x * d.z,
      d.x * d.x - d.y * d.y,
      (3 * d.z * d.z - 1) * 0.5,
      (5 * d.y * d.y * d.y - 3 * d.y) * 0.5,
    ];
    for (let i = 0; i < 6; i++) {
      wobbleV[i] +=
        -w[i] * strength * 2.4 + (Math.random() - 0.5) * strength * 0.6;
    }
  }

  // A press lands: instant dent, a ring racing out from the point, a squash
  function press(dir, time, strength = 1) {
    pressDir.copy(dir);
    squashAxis.copy(dir);
    spawnRipple(dir, 0.06 * strength, time);
    kick(0.35 * strength, dir);
    pressTarget = 0.07;
    squashVel -= 0.9 * strength;
    holdEmitTimer = 0;
  }

  // Sustained press: the dent deepens with progress and keeps shedding
  // smaller, tighter rings so the whole surface stays in motion
  function hold(dir, progress, dt, time) {
    pressDir.copy(dir);
    squashAxis.copy(dir);
    pressTarget = 0.06 + progress * 0.2;
    squashTarget = 1 - 0.05 - progress * 0.15;
    holdEmitTimer += dt;
    const interval = 0.22 - progress * 0.08;
    if (holdEmitTimer >= interval) {
      holdEmitTimer -= interval;
      spawnRipple(dir, 0.025 + progress * 0.05, time, {
        speed: 20,
        k: 11,
        decay: 1.8,
      });
    }
  }

  // Let go: the surface springs back, throwing a bigger ring the longer and
  // deeper it was held
  function release(dir, progress, time) {
    const s = 0.5 + progress * 0.9;
    spawnRipple(dir, 0.05 + progress * 0.11, time, {
      speed: 26,
      k: 8,
      decay: 1.3,
    });
    kick(0.5 * s, dir);
    pressTarget = 0;
    squashTarget = 1;
    holdEmitTimer = 0;
  }

  function setMouse(dir, proximity) {
    mouseDir.copy(dir);
    mouseBulgeTarget = proximity * proximity * 0.045;
  }

  function update(dt) {
    for (let i = 0; i < 6; i++) {
      const w = OMEGA[i];
      wobbleV[i] += (-w * w * wobble[i] - 2 * ZETA * w * wobbleV[i]) * dt;
      wobble[i] += wobbleV[i] * dt;
    }
    pressVel += ((pressTarget - pressDepth) * 180 - pressVel * 22) * dt;
    pressDepth += pressVel * dt;
    squashVel += ((squashTarget - squash) * 90 - squashVel * 9) * dt;
    squash += squashVel * dt;
    mouseBulge += (mouseBulgeTarget - mouseBulge) * Math.min(1, dt * 6);
  }

  // Rough total motion, used to feed the face state on the JS side
  function energy() {
    let e = Math.abs(pressVel) * 0.2 + Math.abs(squashVel) * 0.3;
    for (let i = 0; i < 6; i++) e += Math.abs(wobble[i]);
    return e;
  }

  function writeUniforms(u) {
    u.uPressDir.value.copy(pressDir);
    u.uPressDepth.value = pressDepth;
    u.uSquashAxis.value.copy(squashAxis);
    u.uSquash.value = squash;
    u.uMouseDir.value.copy(mouseDir);
    u.uMouseBulge.value = mouseBulge;
  }

  return {
    ripple,
    rippleP,
    wobble,
    pressDir,
    spawnRipple,
    kick,
    press,
    hold,
    release,
    setMouse,
    update,
    energy,
    writeUniforms,
    get squash() {
      return squash;
    },
    get pressDepth() {
      return pressDepth;
    },
  };
}
