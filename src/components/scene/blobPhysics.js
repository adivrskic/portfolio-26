import { Vector3 } from "three";
import { createWaveSim } from "./waveSim";

/**
 * createBlobPhysics()
 *
 * JS side of the blob's motion. Owns the surface-wave simulation (waveSim.js)
 * that makes the ripples, the six jelly wobble modes (damped springs), the
 * directional squash and the cursor bulge, and writes them into the shader
 * uniforms.
 *
 * All directions are unit vectors in the blob's OBJECT space, so a dent made
 * on one part of the surface stays on that part as the blob rotates.
 */
export function createBlobPhysics() {
  const wave = createWaveSim({ lon: 80, lat: 40 });

  // Jelly modes: natural frequencies spread so the wobble reads as organic
  const OMEGA = [22, 19, 25, 17, 21, 27];
  const ZETA = 0.14;
  const wobble = new Float32Array(6);
  const wobbleV = new Float32Array(6);

  const pressDir = new Vector3(0, 0, 1);
  let holdDepth = 0,
    holdTarget = 0;

  const squashAxis = new Vector3(0, 0, 1);
  let squash = 1,
    squashVel = 0,
    squashTarget = 1;

  const mouseDir = new Vector3(0, 0, 1);
  let mouseBulge = 0,
    mouseBulgeTarget = 0;

  const params = {
    impulse: 1.4, // velocity a press puts into the surface
    ambient: 0.35, // strength of the idle raindrop impulses (0 = still)
  };
  let ambientTimer = 1.2;
  let stirTimer = 0;
  const _rnd = new Vector3();

  function randomDir(out) {
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return out.set(r * Math.cos(a), z, r * Math.sin(a));
  }

  // Excite the jelly modes. Weighting by the mode shapes evaluated at the
  // press direction means the body first moves INWARD under the finger
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

  // A press lands: the surface is driven inward under the finger and the
  // wave equation takes it from there; the body squashes and wobbles
  function press(dir, time, strength = 1) {
    pressDir.copy(dir);
    squashAxis.copy(dir);
    wave.impulse(dir, -params.impulse * strength, 0.2);
    kick(0.25 * strength, dir);
    squashVel -= 0.7 * strength;
    holdTarget = 0;
  }

  // Sustained press: the finger pins a dent that deepens with progress;
  // the dent's moving edge keeps radiating ripples
  function hold(dir, progress, dt, time) {
    pressDir.copy(dir);
    squashAxis.copy(dir);
    holdTarget = 0.06 + progress * 0.16;
    wave.setHold(dir, holdTarget, 0.34);
    squashTarget = 1 - 0.04 - progress * 0.12;
  }

  // Let go: the pinned surface springs back out and throws a ring whose
  // size follows how long and deep it was held
  function release(dir, progress, time) {
    wave.setHold(null);
    wave.impulse(dir, params.impulse * (0.4 + progress * 0.8), 0.3);
    kick(0.35 * (0.5 + progress), dir);
    holdTarget = 0;
    squashTarget = 1;
  }

  // A broad hit (landing, chat kicks): waves wash right round the body
  function splash(dir, strength, sigma = 0.6) {
    wave.impulse(dir, -params.impulse * strength, sigma);
  }

  function setMouse(dir, proximity, speed = 0) {
    mouseDir.copy(dir);
    mouseBulgeTarget = proximity * proximity * 0.04;
    // Stirring: a cursor sweeping across the surface drags small waves
    if (proximity > 0.6 && speed > 0.004 && stirTimer <= 0) {
      wave.impulse(
        dir,
        -Math.min(0.6, speed * 25) * params.impulse * 0.5,
        0.16
      );
      stirTimer = 0.07;
    }
  }

  function update(dt) {
    for (let i = 0; i < 6; i++) {
      const w = OMEGA[i];
      wobbleV[i] += (-w * w * wobble[i] - 2 * ZETA * w * wobbleV[i]) * dt;
      wobble[i] += wobbleV[i] * dt;
    }
    holdDepth += (holdTarget - holdDepth) * Math.min(1, dt * 18);
    squashVel += ((squashTarget - squash) * 90 - squashVel * 9) * dt;
    squash += squashVel * dt;
    mouseBulge += (mouseBulgeTarget - mouseBulge) * Math.min(1, dt * 6);
    stirTimer -= dt;
    // Idle life: an occasional faint raindrop somewhere on the surface, so
    // there are always a few rings crossing each other
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 0.45 + Math.random() * 0.9;
      if (params.ambient > 0) {
        wave.impulse(
          randomDir(_rnd),
          -(0.5 + Math.random()) * params.ambient,
          0.12 + Math.random() * 0.1
        );
      }
    }
    wave.step(dt);
  }

  function energy() {
    let e = Math.abs(squashVel) * 0.3 + wave.stats() * 3;
    for (let i = 0; i < 6; i++) e += Math.abs(wobble[i]);
    return e;
  }

  // Once per frame, after any number of update() substeps
  function writeUniforms(u) {
    u.uSquashAxis.value.copy(squashAxis);
    u.uSquash.value = squash;
    u.uMouseDir.value.copy(mouseDir);
    u.uMouseBulge.value = mouseBulge;
    wave.upload();
  }

  function dispose() {
    wave.dispose();
  }

  return {
    wave,
    wobble,
    params,
    pressDir,
    kick,
    press,
    hold,
    release,
    splash,
    setMouse,
    update,
    energy,
    writeUniforms,
    dispose,
    get squash() {
      return squash;
    },
    get pressDepth() {
      return holdDepth;
    },
  };
}
