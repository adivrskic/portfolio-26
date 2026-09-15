/**
 * Liquid-glass composite pass.
 *
 * Runs once per frame over the whole viewport after the 3D scene has been
 * rendered to a texture. Pixels outside any lens pass the scene through
 * untouched (premultiplied, so the page gradient still shows behind the
 * blob). Inside a lens the page behind it is refracted: flat in the middle,
 * curving over the last few pixels to the rim, where it bends what lies just
 * outside into view with a faint colour split, frosted, tinted, and lit by a
 * bright line along the edges that face the light.
 *
 * "Behind" is the scene texture (blob, shadow) over the page gradient, so
 * the lenses refract the live background in every browser — no SVG
 * backdrop filters involved.
 */

export const MAX_LENSES = 8;

export const glassVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const glassFragmentShader = `
#define MAX_LENSES ${MAX_LENSES}
uniform sampler2D uScene;
uniform sampler2D uBg;
uniform vec3 uBgColor;
uniform vec3 uTint;
uniform vec2 uView;
uniform float uDpr;
uniform float uBgLodBias;
uniform float uBezel;
uniform int uCount;
uniform vec4 uRect[MAX_LENSES];
uniform vec4 uLens[MAX_LENSES];
varying vec2 vUv;

float box(vec2 p, vec2 h, float r) {
  vec2 q = abs(p) - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// The page behind a point, blurred by sampling down the mip chains
vec3 behind(vec2 uv, float lod) {
  uv = clamp(uv, 0.0, 1.0);
  vec4 s = texture2DLodEXT(uScene, uv, lod);
  vec4 g = texture2DLodEXT(uBg, uv, max(lod - uBgLodBias, 0.0));
  vec3 bg = mix(uBgColor, g.rgb, g.a);
  return s.rgb + bg * (1.0 - s.a);
}

// Five taps spread over the mip texel take the blockiness out of a deep lod
vec3 frosted(vec2 uv, float lod) {
  float t = exp2(lod) * 0.5;
  vec2 o = t / (uView * uDpr);
  vec3 c = behind(uv, lod) * 2.0;
  c += behind(uv + vec2(o.x, o.y), lod);
  c += behind(uv + vec2(-o.x, o.y), lod);
  c += behind(uv + vec2(o.x, -o.y), lod);
  c += behind(uv + vec2(-o.x, -o.y), lod);
  return c / 6.0;
}

void main() {
  vec4 outCol = texture2D(uScene, vUv);
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uView;
  vec2 toUv = vec2(1.0, -1.0) / uView;

  for (int i = 0; i < MAX_LENSES; i++) {
    if (i >= uCount) break;
    vec4 r = uRect[i];
    vec4 L = uLens[i];
    vec2 hs = r.zw * 0.5;
    vec2 p = px - (r.xy + hs);
    float radius = min(L.x, min(hs.x, hs.y));
    float d = box(p, hs, radius);
    float coverage = clamp(0.5 - d, 0.0, 1.0) * L.y;
    if (coverage <= 0.001) continue;

    vec2 e = vec2(0.5, 0.0);
    vec2 normal = normalize(vec2(
      box(p + e.xy, hs, radius) - box(p - e.xy, hs, radius),
      box(p + e.yx, hs, radius) - box(p - e.yx, hs, radius)) + 1e-6);
    float bezel = min(uBezel, min(hs.x, hs.y));
    float curve = 1.0 - clamp(-d / bezel, 0.0, 1.0);
    curve *= curve;

    // Light bends through the curve: the rim shows what lies just outside
    // it, with the colours parting slightly
    vec2 bend = normal * curve * bezel * 1.15;
    float lod = log2(max(L.z * uDpr, 1.0)) * 0.85;
    vec3 glass = frosted(vUv + bend * toUv, lod);
    if (curve > 0.001) {
      float red = behind(vUv + bend * 1.25 * toUv, lod).r;
      float blue = behind(vUv + bend * 0.75 * toUv, lod).b;
      glass = vec3(mix(glass.r, red, curve * 0.8), glass.g, mix(glass.b, blue, curve * 0.8));
    }

    // Vibrancy, then the frost tint
    float grey = dot(glass, vec3(0.299, 0.587, 0.114));
    glass = clamp(mix(vec3(grey), glass, 1.25), 0.0, 1.0);
    vec3 colour = mix(glass, uTint, L.w);

    // A bright line where the rim faces the light (top left), a fainter
    // one on the far side, and a soft sheen down the curve
    vec2 light = normalize(vec2(-0.5, -1.0));
    float facing = dot(normal, light);
    float line = smoothstep(-2.2, -0.4, d);
    float highlight = line * (max(facing, 0.0) * 0.75 + max(-facing, 0.0) * 0.3)
                    + curve * max(facing, 0.0) * 0.1;
    colour = clamp(colour + highlight * 0.7, 0.0, 1.0);

    outCol = vec4(colour * coverage + outCol.rgb * (1.0 - coverage),
                  coverage + outCol.a * (1.0 - coverage));
  }
  gl_FragColor = outCol;
}`;
