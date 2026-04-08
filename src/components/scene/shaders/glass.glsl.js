/**
 * Glass cube refraction shaders — two-pass approach.
 */

export const glassVertexShader = `
  varying vec3 vN, vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

export const glassFragmentShader = `
  precision highp float;
  uniform sampler2D uSceneTex, uBgTex;
  uniform vec2 uRes;
  uniform float uRefract, uBlur, uEdgeAlpha, uFresnelPow;
  uniform float uSpecular, uSpecPower, uIridescence, uOpacity;
  uniform vec3 uTint;
  varying vec3 vN, vV;
  void main() {
    float NdV = abs(dot(vN, vV));
    float fres = pow(1.0 - NdV, uFresnelPow);
    vec2 sUV = gl_FragCoord.xy / uRes;

    // Brush stroke proximity
    float brushAlpha = texture2D(uBgTex, sUV).a;
    float proximity = smoothstep(0.0, 0.6, brushAlpha);

    // Refraction + blur scaled by proximity
    float refractAmt = uRefract * (0.15 + proximity * 0.85);
    float blurAmt = uBlur * (0.2 + proximity * 0.8);
    vec2 lUV = clamp(sUV + vN.xy * refractAmt, 0.0, 1.0);

    // Blur sampling
    vec4 sc = vec4(0.0), bg = vec4(0.0);
    float tot = 0.0;
    for (float x = -3.0; x <= 3.0; x++) {
      for (float y = -3.0; y <= 3.0; y++) {
        vec2 o = vec2(x, y) * blurAmt / uRes;
        sc += texture2D(uSceneTex, lUV + o);
        bg += texture2D(uBgTex, lUV + o);
        tot += 1.0;
      }
    }
    sc /= tot; bg /= tot;

    // Composite
    vec3 bgC = bg.rgb * bg.a + vec3(0.91, 0.91, 0.93) * (1.0 - bg.a);
    vec3 comp = mix(bgC, sc.rgb, sc.a);

    // Edge glow with tint
    vec3 edge = uTint * fres * uEdgeAlpha * (0.5 + proximity * 0.5);

    // Specular — two lights
    vec3 h1 = normalize(normalize(vec3(3,4,5)) + vV);
    vec3 h2 = normalize(normalize(vec3(-3,-1,3)) + vV);
    float spec = pow(max(dot(vN, h1), 0.0), uSpecPower) * uSpecular * 0.1;
    spec += pow(max(dot(vN, h2), 0.0), uSpecPower * 0.7) * uSpecular * 0.04;

    // Iridescence
    float iAngle = fres * 6.28318;
    vec3 iri = vec3(sin(iAngle)*0.5+0.5, sin(iAngle+2.094)*0.5+0.5, sin(iAngle+4.189)*0.5+0.5) * uIridescence * fres;

    vec3 col = comp + edge + vec3(spec) + iri;
    float alpha = uOpacity + fres * (1.0 - uOpacity);
    gl_FragColor = vec4(col, alpha);
  }`;
