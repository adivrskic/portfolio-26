import { noiseGLSL } from "./noise.glsl.js";

/**
 * Glass blob shaders.
 *
 * Vertex: a unit sphere is displaced by three layers —
 *   1. slow simplex "amorph" noise (the resting, drifting shape),
 *   2. dynamic motion: the simulated surface wave (waveSim.js, sampled from
 *      an R16F texture with a B-spline filter), six jelly wobble modes
 *      (spherical-harmonic style, driven by damped springs in blobPhysics)
 *      and a cursor-attraction bulge,
 *   3. a directional squash along the press axis.
 * Normals are rebuilt by finite differences so lighting follows the motion.
 *
 * Fragment: fresnel-weighted reflections of a procedural studio env,
 * refraction of the page gradient behind the blob (desktop) with chromatic
 * dispersion, a theme-palette iridescent shimmer at grazing angles, flickering
 * glints, and the face texture refracted through the front surface — its
 * blur, dispersion and visibility all scale with the local jiggle energy.
 */

const deformGLSL = `
uniform float uTime;
uniform float uNoiseFreq, uNoiseAmp, uNoiseSpeed;
uniform sampler2D uWave;
uniform vec2 uWaveSize;
uniform float uWaveGain;
uniform float uWobble[6];
uniform vec3 uMouseDir;
uniform float uMouseBulge;
uniform vec3 uSquashAxis;
uniform float uSquash;

float amorph(vec3 n, float t) {
  vec3 q = n * uNoiseFreq;
  vec3 drift = vec3(0.31, 0.27, -0.23) * (t * uNoiseSpeed);
  // Mostly one broad octave: big soft lumps, only a whisper of detail so
  // the surface reads as smooth glass rather than cauliflower
  float f = snoise(q + drift) * 0.7
          + snoise(q * 2.1 + drift * 1.3 + 7.1) * 0.14
          + snoise(q * 4.3 - drift + 3.3) * 0.04;
  return f * uNoiseAmp;
}

// Height of the simulated surface wave under a direction. The grid is
// latitude/longitude with the poles on ±Y; a cubic B-spline over four
// bilinear taps keeps the field smooth between cells so the finite-difference
// normals do not show the grid.
float waveAt(vec3 n) {
  vec2 uv = vec2(atan(n.z, n.x) / 6.28318530718 + 0.5,
                 acos(clamp(n.y, -1.0, 1.0)) / 3.14159265359);
  vec2 coord = uv * uWaveSize - 0.5;
  vec2 f = fract(coord);
  coord -= f;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 s0 = w0 + w1;
  vec2 s1 = w2 + w3;
  vec2 t0 = (coord - 1.0 + w1 / s0 + 0.5) / uWaveSize;
  vec2 t1 = (coord + 1.0 + w3 / s1 + 0.5) / uWaveSize;
  return (texture2D(uWave, vec2(t0.x, t0.y)).r * s0.x
        + texture2D(uWave, vec2(t1.x, t0.y)).r * s1.x) * s0.y
       + (texture2D(uWave, vec2(t0.x, t1.y)).r * s0.x
        + texture2D(uWave, vec2(t1.x, t1.y)).r * s1.x) * s1.y;
}

float dynamicDisp(vec3 n, float t) {
  float d = waveAt(n) * uWaveGain;
  d += uWobble[0] * n.x * n.y
     + uWobble[1] * n.y * n.z
     + uWobble[2] * n.x * n.z
     + uWobble[3] * (n.x * n.x - n.y * n.y)
     + uWobble[4] * (3.0 * n.z * n.z - 1.0) * 0.5
     + uWobble[5] * (5.0 * n.y * n.y * n.y - 3.0 * n.y) * 0.5;
  float ma = acos(clamp(dot(n, uMouseDir), -1.0, 1.0));
  d += uMouseBulge * exp(-ma * ma / 0.6);
  return d;
}

vec3 deform(vec3 n, float t, out float jig) {
  float a = amorph(n, t);
  float dy = dynamicDisp(n, t);
  jig = abs(dy);
  vec3 p = n * (1.0 + a + dy);
  float along = dot(p, uSquashAxis);
  p += uSquashAxis * along * (uSquash - 1.0);
  p *= 1.0 + (1.0 - uSquash) * 0.4;
  return p;
}
`;

export const blobVertexShader = `${noiseGLSL}
${deformGLSL}
varying vec3 vWorldPos, vWorldN, vViewPos, vViewN, vObjN;
varying float vJiggle;
void main() {
  vec3 n = normalize(position);
  float jig;
  vec3 p = deform(n, uTime, jig);
  vec3 up = abs(n.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(up, n));
  vec3 b = cross(n, t);
  float e = 0.012;
  float j2;
  vec3 pt = deform(normalize(n + t * e), uTime, j2);
  vec3 pb = deform(normalize(n + b * e), uTime, j2);
  vec3 N = normalize(cross(pt - p, pb - p));
  vObjN = n;
  vJiggle = jig;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorldPos = wp.xyz;
  vWorldN = normalize(mat3(modelMatrix) * N);
  vec4 vp = viewMatrix * wp;
  vViewPos = vp.xyz;
  vViewN = normalize(normalMatrix * N);
  gl_Position = projectionMatrix * vp;
}`;

export const blobFragmentShader = `${noiseGLSL}
uniform float uOpacity, uIor, uFaceIor, uDispersion, uRefract, uShimmer, uGlint, uRim, uEdgeDark;
uniform float uBgMix, uFaceMix, uFaceSize, uFaceBlur, uFaceBlurJig, uFaceFadeJig;
uniform float uTime;
uniform vec2 uResolution;
uniform vec4 uBgRect;
uniform vec3 uFaceCenterV, uBgColor, uTint, uC1, uC2, uC3, uC4;
uniform sampler2D uFaceTex, uBgTex;
varying vec3 vWorldPos, vWorldN, vViewPos, vViewN, vObjN;
varying float vJiggle;

// Procedural studio: bright soft top, grey horizon, darker floor, two lobes
vec3 env(vec3 d) {
  float y = d.y;
  vec3 top = vec3(1.02, 1.0, 0.98);
  vec3 mid = vec3(0.86, 0.87, 0.9);
  vec3 bot = vec3(0.5, 0.51, 0.58);
  vec3 e = y > 0.0
    ? mix(mid, top, smoothstep(0.0, 0.7, y))
    : mix(mid, bot, smoothstep(0.0, -0.7, y));
  e += vec3(1.0, 0.97, 0.9)
     * pow(max(dot(d, normalize(vec3(0.45, 0.62, 0.64))), 0.0), 28.0) * 1.1;
  e += vec3(0.78, 0.86, 1.0)
     * pow(max(dot(d, normalize(vec3(-0.62, 0.22, 0.4))), 0.0), 12.0) * 0.45;
  return e;
}

// Cycle through the four theme colours
vec3 palette(float t) {
  float s = fract(t) * 4.0;
  vec3 c = mix(uC1, uC2, clamp(s, 0.0, 1.0));
  c = mix(c, uC3, clamp(s - 1.0, 0.0, 1.0));
  c = mix(c, uC4, clamp(s - 2.0, 0.0, 1.0));
  c = mix(c, uC1, clamp(s - 3.0, 0.0, 1.0));
  return c;
}

// Where a refracted view ray (view space) meets the camera-facing face plane
vec2 faceUV(vec3 R) {
  float dz = min(R.z, -0.05);
  float th = (uFaceCenterV.z - vViewPos.z) / dz;
  vec3 hit = vViewPos + R * max(th, 0.0);
  return (hit.xy - uFaceCenterV.xy) / uFaceSize + 0.5;
}

void main() {
  vec3 N = normalize(vViewN);
  vec3 V = normalize(-vViewPos);
  float NV = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - NV, 4.0);
  float F = 0.03 + 0.97 * fres;
  float T = 1.0 - F;
  float jig = clamp(vJiggle * 12.0, 0.0, 1.0);

  vec3 Nw = normalize(vWorldN);
  vec3 Vw = normalize(cameraPosition - vWorldPos);
  vec3 refl = env(reflect(-Vw, Nw));

  float disp = uDispersion * (0.35 + jig * 1.65);
  vec3 Rr = refract(-V, N, 1.0 / uIor);
  vec3 Rg = refract(-V, N, 1.0 / (uIor + disp));
  vec3 Rb = refract(-V, N, 1.0 / (uIor + disp * 2.0));

  vec3 transmitted;
  float transA;
  if (uBgMix > 0.5) {
    vec2 suv = gl_FragCoord.xy / uResolution;
    vec2 tuv = (suv - uBgRect.xy) / uBgRect.zw;
    vec2 o = Rr.xy * uRefract;
    vec4 s0 = texture2D(uBgTex, clamp(tuv + o * 0.92, 0.0, 1.0));
    vec4 s1 = texture2D(uBgTex, clamp(tuv + o, 0.0, 1.0));
    vec4 s2 = texture2D(uBgTex, clamp(tuv + o * 1.08, 0.0, 1.0));
    vec3 g = vec3(mix(uBgColor.r, s0.r, s0.a),
                  mix(uBgColor.g, s1.g, s1.a),
                  mix(uBgColor.b, s2.b, s2.a));
    transmitted = g * T * uTint;
    transA = T;
  } else {
    // No background texture: let the page show through, add a little milk
    float milk = 0.1 * T;
    transmitted = uBgColor * milk;
    transA = milk;
  }
  float edge = 1.0 - uEdgeDark * (1.0 - smoothstep(0.02, 0.4, NV));
  transmitted *= edge;

  if (uFaceMix > 0.001) {
    // The face gets its own, gentler index so it swims rather than
    // scatters; the jiggle-driven dispersion still splits it into fringes
    float fdisp = disp * 0.6;
    vec3 Fr = refract(-V, N, 1.0 / uFaceIor);
    vec3 Fg = refract(-V, N, 1.0 / (uFaceIor + fdisp));
    vec3 Fb = refract(-V, N, 1.0 / (uFaceIor + fdisp * 2.0));
    float lod = uFaceBlur + jig * uFaceBlurJig;
    vec4 fr = texture2DLodEXT(uFaceTex, faceUV(Fr), lod);
    vec4 fg = texture2DLodEXT(uFaceTex, faceUV(Fg), lod);
    vec4 fb = texture2DLodEXT(uFaceTex, faceUV(Fb), lod);
    float vis = uFaceMix * (1.0 - jig * uFaceFadeJig) * (1.0 - fres * 0.85) * edge;
    vec3 fc = vec3(fr.r, fg.g, fb.b) * vis;
    float fa = (fr.a + fg.a + fb.a) * (1.0 / 3.0) * vis;
    transmitted = transmitted * (1.0 - fa) + fc;
    transA = transA * (1.0 - fa) + fa;
  }

  float ph = NV * 1.6 + vJiggle * 22.0 + uTime * 0.1
           + snoise(vObjN * 2.6 + uTime * 0.12) * 0.4;
  vec3 irid = palette(ph);
  float shim = uShimmer * fres;
  vec3 spec = refl * F;
  spec = mix(spec, spec * (0.4 + irid * 1.3) + irid * 0.1, shim);

  float glint = 0.0;
  if (uGlint > 0.001) {
    vec3 gp = vObjN * 28.0 + vec3(uTime * 0.7, -uTime * 0.5, uTime * 0.4)
            + N * (vJiggle * 30.0);
    float g1 = snoise(gp);
    float g2 = snoise(vObjN * 43.0 - vec3(uTime * 0.45, uTime * 0.6, uTime * 0.3));
    // Sparse: only the sharpest noise peaks flash, and only while a second
    // slower field is high, so a few glints wink at a time
    glint = pow(clamp(g1 * 0.5 + 0.5, 0.0, 1.0), 22.0)
          * smoothstep(0.2, 0.7, g2) * uGlint * (0.5 + fres) * 1.6;
  }

  vec3 L1 = normalize(vec3(0.55, 0.85, 0.75));
  vec3 H1 = normalize(L1 + V);
  float s1 = pow(max(dot(N, H1), 0.0), 240.0);
  vec3 L2 = normalize(vec3(-0.7, 0.25, 0.65));
  vec3 H2 = normalize(L2 + V);
  float s2 = pow(max(dot(N, H2), 0.0), 80.0) * 0.3;
  float hl = (s1 * 1.2 + s2) * mix(0.25, 1.0, fres) + glint;

  float rim = uRim * pow(1.0 - NV, 9.0);
  vec3 col = transmitted + spec + vec3(hl) + rim * (0.55 + 0.45 * irid);
  float alpha = min(transA + F, 1.0);
  gl_FragColor = vec4(col * uOpacity, alpha * uOpacity);
}`;

// Shadow-map pass: same deformation, packed depth (matches MeshDepthMaterial
// with RGBADepthPacking, which is what the VSM blur passes expect)
export const blobDepthVertexShader = `${noiseGLSL}
${deformGLSL}
varying vec2 vHighPrecisionZW;
void main() {
  vec3 n = normalize(position);
  float jig;
  vec3 p = deform(n, uTime, jig);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vHighPrecisionZW = gl_Position.zw;
}`;

export const blobDepthFragmentShader = `#include <packing>
varying vec2 vHighPrecisionZW;
void main() {
  float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
  gl_FragColor = packDepthToRGBA(fragCoordZ);
}`;
