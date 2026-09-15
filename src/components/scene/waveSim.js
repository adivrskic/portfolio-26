import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RedFormat,
  RepeatWrapping,
} from "three";

/**
 * createWaveSim({ lon, lat })
 *
 * A damped wave equation solved on the blob's surface — the source of its
 * ripples. The surface is a latitude/longitude grid in the blob's object
 * space (poles on ±Y); each cell holds a height h (in radii) and a velocity
 * v, and every substep the height accelerates toward its neighbours'
 * average (the spherical Laplacian), is damped, and is pulled gently back
 * to rest. Disturbances therefore propagate as real waves: rings spread,
 * cross and interfere, wrap round the far side and refocus, and a held
 * finger radiates ripples from the edge of its dent.
 *
 * The heights go to the GPU every frame as an R16F texture that the blob's
 * vertex shader samples (see waveAt in shaders/blob.glsl.js).
 *
 * Numerics: explicit leapfrog with fixed 1/240s substeps. Longitude cells
 * shrink toward the poles, so the longitudinal metric is clamped to keep
 * the step stable there, and the two pole rows are relaxed toward their
 * mean so the poles stay coherent — waves near them travel a little slower,
 * which is invisible.
 */
export function createWaveSim({ lon = 80, lat = 40 } = {}) {
  const N = lon * lat;
  const h = new Float32Array(N);
  const v = new Float32Array(N);
  const lap = new Float32Array(N);
  const dirs = new Float32Array(N * 3);
  const dTheta = Math.PI / lat;
  const dPhi = (Math.PI * 2) / lon;
  const sinT = new Float32Array(lat);
  const sinUp = new Float32Array(lat);
  const sinDn = new Float32Array(lat);
  const phiMetric = new Float32Array(lat);
  for (let i = 0; i < lat; i++) {
    const t = (i + 0.5) * dTheta;
    sinT[i] = Math.sin(t);
    sinUp[i] = Math.sin(t + dTheta / 2);
    sinDn[i] = Math.sin(t - dTheta / 2);
    const s = Math.max(Math.sin(t), 0.3);
    phiMetric[i] = 1 / (s * s * dPhi * dPhi);
    for (let j = 0; j < lon; j++) {
      // Matches the shader's lookup: u = atan(z, x) / 2π + 0.5, v = acos(y) / π
      const p = (j + 0.5) * dPhi - Math.PI;
      const k = (i * lon + j) * 3;
      dirs[k] = Math.sin(t) * Math.cos(p);
      dirs[k + 1] = Math.cos(t);
      dirs[k + 2] = Math.sin(t) * Math.sin(p);
    }
  }

  const data = new Uint16Array(N);
  const texture = new DataTexture(data, lon, lat, RedFormat, HalfFloatType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const params = {
    speed: 2.6, // wave speed, radians of surface per second
    damping: 1.2, // 1/s
    tension: 2, // restoring pull toward the resting shape, 1/s²
  };
  const SUBSTEP = 1 / 240;
  const CLAMP = 0.4;
  let hold = null;

  function laplacian() {
    const half = lon >> 1;
    for (let i = 0; i < lat; i++) {
      const row = i * lon;
      const below = i + 1 < lat ? (i + 1) * lon : -1;
      const above = i > 0 ? (i - 1) * lon : -1;
      const su = sinUp[i];
      const sd = sinDn[i];
      const inv = 1 / (sinT[i] * dTheta * dTheta);
      const pm = phiMetric[i];
      for (let j = 0; j < lon; j++) {
        const k = row + j;
        const hc = h[k];
        const hl = h[row + ((j + lon - 1) % lon)];
        const hr = h[row + ((j + 1) % lon)];
        // Beyond a pole the neighbour is the cell straight across it
        const hb = below >= 0 ? h[below + j] : h[row + ((j + half) % lon)];
        const ha = above >= 0 ? h[above + j] : h[row + ((j + half) % lon)];
        lap[k] =
          (su * (hb - hc) - sd * (hc - ha)) * inv + (hl + hr - 2 * hc) * pm;
      }
    }
  }

  function relaxPole(i) {
    const row = i * lon;
    let m = 0;
    for (let j = 0; j < lon; j++) m += h[row + j];
    m /= lon;
    for (let j = 0; j < lon; j++) h[row + j] += (m - h[row + j]) * 0.5;
  }

  // The held finger: pin the surface to a dent, letting the wave equation
  // react to the moving boundary
  function applyHold(dt) {
    const { x, y, z, depth, sigma, cosCut } = hold;
    const inv = 1 / (sigma * sigma);
    const rate = Math.min(1, dt * 28);
    const brake = Math.min(1, dt * 14);
    for (let k = 0; k < N; k++) {
      const k3 = k * 3;
      const dot = dirs[k3] * x + dirs[k3 + 1] * y + dirs[k3 + 2] * z;
      if (dot < cosCut) continue;
      const ang = Math.acos(Math.min(1, dot));
      const g = Math.exp(-ang * ang * inv);
      h[k] += (-depth * g - h[k]) * g * rate;
      v[k] -= v[k] * g * brake;
    }
  }

  function substep(dt) {
    laplacian();
    const c2 = params.speed * params.speed;
    const damp = params.damping;
    const ten = params.tension;
    for (let k = 0; k < N; k++) {
      v[k] += (c2 * lap[k] - damp * v[k] - ten * h[k]) * dt;
    }
    if (hold) applyHold(dt);
    for (let k = 0; k < N; k++) {
      let x = h[k] + v[k] * dt;
      if (x > CLAMP) x = CLAMP;
      else if (x < -CLAMP) x = -CLAMP;
      h[k] = x;
    }
    relaxPole(0);
    relaxPole(lat - 1);
  }

  function upload() {
    for (let k = 0; k < N; k++) data[k] = DataUtils.toHalfFloat(h[k]);
    texture.needsUpdate = true;
  }

  // Advance by dt seconds (capped so a hidden tab never runs away). Call
  // upload() once per frame afterwards to hand the heights to the GPU.
  function step(dt) {
    let left = Math.min(dt, 0.1);
    while (left > 0) {
      const s = Math.min(SUBSTEP, left);
      substep(s);
      left -= s;
    }
  }

  // A velocity kick around a direction: negative pushes the surface in
  function impulse(dir, amount, sigma) {
    const inv = 1 / (sigma * sigma);
    const cosCut = Math.cos(Math.min(Math.PI, sigma * 3));
    const { x, y, z } = dir;
    for (let k = 0; k < N; k++) {
      const k3 = k * 3;
      const dot = dirs[k3] * x + dirs[k3 + 1] * y + dirs[k3 + 2] * z;
      if (dot < cosCut) continue;
      const ang = Math.acos(Math.min(1, dot));
      v[k] += amount * Math.exp(-ang * ang * inv);
    }
  }

  function setHold(dir, depth, sigma) {
    if (!dir) {
      hold = null;
      return;
    }
    hold = {
      x: dir.x,
      y: dir.y,
      z: dir.z,
      depth,
      sigma,
      cosCut: Math.cos(Math.min(Math.PI, sigma * 3)),
    };
  }

  function stats() {
    let m = 0;
    for (let k = 0; k < N; k++) {
      const a = Math.abs(h[k]);
      if (a > m) m = a;
    }
    return m;
  }

  function dispose() {
    texture.dispose();
  }

  return {
    texture,
    size: [lon, lat],
    params,
    step,
    upload,
    impulse,
    setHold,
    stats,
    dispose,
  };
}
