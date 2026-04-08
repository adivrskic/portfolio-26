/**
 * Helix particle system shaders — multi-layered organic particles.
 */

export const helixVertexShader = `precision highp float;
  attribute vec3 aStart, aSeed;
  attribute float aStagger, aSize;
  uniform float uTime, uConverge, uStreamT, uPointSize, uHelixRotation, uHelixYShift, uDissipate, uCubeHalf, uConvSharpness, uSpiralStr;
  uniform vec3 uMouseWorld;
  uniform float uMouseStrength, uMouseRadius;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    // ── Convergence: wavefront top→bottom ──
    float rawF = clamp((uConverge - aStagger) / uConvSharpness, 0.0, 1.0);
    float pf = rawF * rawF * (3.0 - 2.0 * rawF);

    // ── Helix target with secondary per-particle oscillation ──
    vec3 hp = position;
    float altAmp = aSeed.x * 0.4 + 0.05;
    float altFreq = aSeed.y * 4.0 + 1.0;
    float altPhase = aSeed.z * 6.28;
    float particleT = -hp.y / max(abs(hp.y) + 10.0, 1.0);
    float wobble1 = sin(particleT * altFreq * 6.28 + altPhase + uTime * (0.08 + aSeed.x * 0.05));
    float wobble2 = cos(particleT * altFreq * 4.0 + altPhase * 1.3 + uTime * (0.06 + aSeed.y * 0.04));
    float helixR = length(hp.xz);
    float wobbleScale = helixR * 0.15 * altAmp;
    float hAngle = atan(hp.z, hp.x);
    hp.x += cos(hAngle + 1.57) * wobble1 * wobbleScale;
    hp.z += sin(hAngle + 1.57) * wobble1 * wobbleScale;
    hp.y += wobble2 * wobbleScale * 0.5;

    // Apply helix rotation + shift
    float cosR = cos(uHelixRotation), sinR = sin(uHelixRotation);
    hp = vec3(hp.x * cosR - hp.z * sinR, hp.y + uHelixYShift, hp.x * sinR + hp.z * cosR);

    // ── Cube position (barely drifting, confined when visible) ──
    float orbit = uTime * (0.15 + aSeed.x * 0.1) + aSeed.z * 6.28;
    vec3 cubePos = aStart;
    cubePos += vec3(sin(orbit), sin(orbit * 0.7 + 1.5), cos(orbit * 0.8 + 3.0)) * 0.015;
    if (uCubeHalf < 50.0) cubePos = clamp(cubePos, vec3(-uCubeHalf * 0.92), vec3(uCubeHalf * 0.92));

    // ── Seeping through cracks: staggered per-particle escape ──
    float particleDelay = aSeed.x * 0.5 + aSeed.y * 0.3;
    float adjustedStream = max(0.0, uStreamT - particleDelay * 0.5);
    float seepT = adjustedStream * adjustedStream;
    vec3 seepDir = normalize(aStart + vec3(0.001));
    vec3 absDir = abs(seepDir);
    float maxComp = max(absDir.x, max(absDir.y, absDir.z));
    vec3 faceDir = step(maxComp - 0.001, absDir) * sign(seepDir);
    faceDir = normalize(mix(seepDir, faceDir, 0.6));
    float seepPhase = smoothstep(0.0, 0.35, adjustedStream);
    float streamPhase = smoothstep(0.25, 1.0, adjustedStream);
    vec3 seepPos = cubePos + faceDir * seepPhase * (0.4 + aSeed.z * 0.5);
    float wobbleT = uTime * (1.5 + aSeed.x * 2.0) + aSeed.z * 6.28;
    seepPos += vec3(sin(wobbleT), cos(wobbleT * 0.7), sin(wobbleT * 1.3)) * seepPhase * 0.08;
    seepPos.y -= seepPhase * seepPhase * (0.1 + aSeed.y * 0.15);

    // ── Blend: seep → helix ──
    float blend = max(streamPhase * 0.5, pf);
    vec3 pos = mix(seepPos, hp, blend);

    // ── Spiral: calm rotation, peaks mid-transition ──
    float spiralStrength = blend * (1.0 - blend) * 4.0;
    float spiralAngle = uTime * (0.4 + aSeed.x * 0.3) + aSeed.z * 6.28;
    float spiralR = spiralStrength * max(helixR, 0.5) * uSpiralStr;
    pos.x += cos(spiralAngle) * spiralR;
    pos.z += sin(spiralAngle) * spiralR;
    pos.y += spiralStrength * (0.15 + aSeed.x * 0.08);

    // ── Post-formation shimmer ──
    pos.y += pf * sin(uTime * 0.15 + aSeed.z * 6.28) * 0.04;
    pos.x += pf * cos(uTime * 0.2 + aSeed.x * 6.28) * 0.02;
    pos.z += pf * sin(uTime * 0.2 + aSeed.y * 6.28) * 0.02;

    // ── Mouse push ──
    if (uMouseStrength > 0.001) {
      vec3 toM = pos - uMouseWorld;
      float md = length(toM);
      pos += normalize(toM + vec3(0.001)) * exp(-md * md / (uMouseRadius * uMouseRadius)) * uMouseStrength * (1.0 - pf * 0.8);
    }

    // ── End: funnel + drip ──
    float diss = uDissipate;
    float funnelT = diss * diss;
    pos.x *= (1.0 - funnelT * 0.95);
    pos.z *= (1.0 - funnelT * 0.95);
    float streamDist = max(0.0, diss - 0.3) * (1.5 + aSeed.y * 3.0);
    pos.y -= streamDist;
    float pastTip = max(0.0, diss - 0.5);
    pos.x += sin(aSeed.x * 8.0 + uTime * 0.3) * pastTip * 0.15;
    pos.z += cos(aSeed.z * 8.0 + uTime * 0.3) * pastTip * 0.15;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // ── Depth-based sizing ──
    float depthFactor = clamp(6.0 / max(-mv.z, 0.5), 0.5, 1.6);
    float particleSpeed = pow(aSeed.x * 0.5 + 0.5, 3.0);
    float speedSize = 1.0 - particleSpeed * 0.4;
    gl_PointSize = (uPointSize * aSize * speedSize * depthFactor) * 100.0 * (1.0 - pastTip * 0.5);

    // ── Alpha ──
    float streamFade = max(0.0, diss - 0.4);
    float seepBright = (1.0 - streamPhase) * seepPhase * 0.3;
    float depthAlpha = clamp(0.4 + depthFactor * 0.4, 0.35, 1.0);
    vAlpha = (0.4 + blend * 0.6 + seepBright) * depthAlpha * (1.0 - streamFade * streamFade);
    vDepth = clamp(1.0 - depthFactor * 0.3, 0.0, 1.0);
  }`;

export const helixFragmentShader = `precision highp float;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c) * 4.0;
    if (d > 1.0) discard;
    float core = exp(-d * 8.0);
    float glow = exp(-d * (2.0 + vDepth * 3.0));
    float a = (core * 0.5 + glow * 0.5) * vAlpha * uOpacity;
    if (a < 0.002) discard;
    vec3 col = mix(vec3(0.04, 0.04, 0.09), vec3(0.02, 0.02, 0.06), glow);
    gl_FragColor = vec4(col * a, a);
  }`;
