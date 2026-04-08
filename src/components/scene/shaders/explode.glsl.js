/**
 * Exploding cube shaders — Akella-style per-face explosion.
 */

export const explodeVertexShader = `
  attribute vec3 aCenter, aFaceNormal, aRand;
  uniform float uExplode, uExplodeCap, uRotSpeed, uTime;

  varying float vAlpha;
  varying vec3 vFaceN, vViewDir, vWorldN;
  varying vec2 vScreenUV;

  mat3 rotAxis(vec3 axis, float angle) {
    float s = sin(angle), c = cos(angle), oc = 1.0 - c;
    return mat3(
      oc*axis.x*axis.x+c, oc*axis.x*axis.y-axis.z*s, oc*axis.z*axis.x+axis.y*s,
      oc*axis.x*axis.y+axis.z*s, oc*axis.y*axis.y+c, oc*axis.y*axis.z-axis.x*s,
      oc*axis.z*axis.x-axis.y*s, oc*axis.y*axis.z+axis.x*s, oc*axis.z*axis.z+c
    );
  }

  void main() {
    float explode = min(uExplode, uExplodeCap);
    float t = explode * explode;
    vec3 localP = position - aCenter;

    // Gentle tumble during explosion only
    vec3 rotAx = normalize(aRand * 2.0 - 1.0 + vec3(0.001));
    float rotAngle = t * uRotSpeed * (1.0 + aRand.x * 2.0);
    localP = rotAxis(rotAx, rotAngle) * localP;

    // Spread outward — some pieces fly far, some barely drift
    vec3 dir = aFaceNormal + (aRand - 0.5) * 0.2;
    dir.y += 0.4 + aRand.x * 0.3; // upward bias
    float stayClose = step(aRand.z, 0.5);
    float speed = mix(0.8 + aRand.y * 0.6, 0.05 + aRand.y * 0.1, stayClose);
    vec3 offset = dir * t * speed;

    vec3 finalPos = aCenter + localP + offset;
    finalPos.y += t * t * (0.3 + aRand.y * 0.2);

    // Near-frozen hover
    float phase = aRand.x * 6.28 + aRand.y * 3.14;
    finalPos.x += sin(uTime * 0.003 + phase) * 0.004;
    finalPos.y += cos(uTime * 0.002 + phase) * 0.003;
    finalPos.z += sin(uTime * 0.0025 + phase + 2.0) * 0.004;

    vec4 mv = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mv;
    vScreenUV = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
    vAlpha = 1.0 - t * 0.3;
    vFaceN = normalize(normalMatrix * aFaceNormal);
    vWorldN = normalize(normalMatrix * (rotAxis(rotAx, rotAngle) * normal));
    vViewDir = normalize(-mv.xyz);
  }`;

export const explodeFragmentShader = `
  precision highp float;
  uniform float uOpacity, uExplode;
  uniform sampler2D uSceneTex, uBgTex;
  uniform vec2 uRes;
  varying float vAlpha;
  varying vec3 vFaceN, vViewDir, vWorldN;
  varying vec2 vScreenUV;
  void main() {
    float NdV = abs(dot(vWorldN, vViewDir));
    float fres = pow(1.0 - NdV, 3.0);

    // Refract scene behind each fragment
    vec2 sUV = gl_FragCoord.xy / uRes;
    vec2 refUV = clamp(sUV + vWorldN.xy * 0.08, 0.0, 1.0);
    vec4 sceneCol = texture2D(uSceneTex, refUV);
    vec4 bgCol = texture2D(uBgTex, refUV);
    vec3 bgC = bgCol.rgb * bgCol.a + vec3(0.92, 0.92, 0.94) * (1.0 - bgCol.a);
    vec3 behind = mix(bgC, sceneCol.rgb, sceneCol.a);

    // Glass tint
    vec3 glassTint = vec3(0.95, 0.96, 1.0);
    vec3 col = mix(behind * glassTint, vec3(1.0), fres * 0.5);

    // Specular highlights
    vec3 h = normalize(normalize(vec3(3.0, 4.0, 5.0)) + vViewDir);
    float spec = pow(max(dot(vWorldN, h), 0.0), 120.0) * 3.0;
    col += vec3(spec * 0.15);

    // Iridescence on edges
    float iAngle = fres * 6.28318 + uExplode * 2.0;
    vec3 iri = vec3(sin(iAngle)*0.5+0.5, sin(iAngle+2.094)*0.5+0.5, sin(iAngle+4.189)*0.5+0.5);
    col += iri * fres * 0.3;

    // Edge glow
    col += vec3(0.9, 0.92, 1.0) * fres * 0.4;

    float alpha = (uOpacity + fres * 0.3) * vAlpha;
    gl_FragColor = vec4(col, alpha);
  }`;
