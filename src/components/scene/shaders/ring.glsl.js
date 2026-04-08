/**
 * Radial progress ring shaders.
 */

export const ringVertexShader = `
  varying float vAngle;
  void main() {
    vAngle = atan(position.y, position.x);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

export const ringFragmentShader = `
  precision highp float;
  uniform float uProgress, uOpacity;
  varying float vAngle;
  void main() {
    float a = 1.5708 - vAngle;
    if (a < 0.0) a += 6.28318;
    float norm = a / 6.28318;
    if (norm > uProgress) discard;
    float gapSize = 0.008;
    if (abs(norm - 0.25) < gapSize) discard;
    if (abs(norm - 0.50) < gapSize) discard;
    if (abs(norm - 0.75) < gapSize) discard;
    float tip = smoothstep(uProgress - 0.015, uProgress, norm);
    float alpha = (0.18 + tip * 0.2) * uOpacity;
    gl_FragColor = vec4(vec3(0.1, 0.1, 0.14), alpha);
  }`;
