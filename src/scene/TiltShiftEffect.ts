import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector2, Vector4 } from 'three'

/**
 * Tilt-shift: a sharp horizontal band through the cube, blurring progressively above and below it.
 * The blur is confined to a soft-edged region (the cube's column) so the rest of the page stays crisp.
 * Variable-radius golden-angle disk blur, single pass.
 */
const fragment = /* glsl */ `
  uniform float uFocus;
  uniform float uBand;
  uniform float uRamp;
  uniform float uMaxBlur;
  uniform vec4 uRegion;
  uniform vec2 uSoft;
  uniform float uAll;

  float regionMask(vec2 uv) {
    float mx = smoothstep(uRegion.x - uSoft.x, uRegion.x + uSoft.x, uv.x)
             * (1.0 - smoothstep(uRegion.z - uSoft.x, uRegion.z + uSoft.x, uv.x));
    float my = smoothstep(uRegion.y - uSoft.y, uRegion.y + uSoft.y, uv.y)
             * (1.0 - smoothstep(uRegion.w - uSoft.y, uRegion.w + uSoft.y, uv.y));
    return mx * my;
  }

  float blurAmount(vec2 uv) {
    float d = max(abs(uv.y - uFocus) - uBand, 0.0);
    float a = smoothstep(0.0, uRamp, d);
    // uAll blurs the whole region evenly (the cube behind a project's case study)
    return max(a * a, uAll) * regionMask(uv);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float r = blurAmount(uv) * uMaxBlur;
    if (r < 0.4) {
      outputColor = inputColor;
      return;
    }
    vec4 acc = vec4(0.0);
    float wsum = 0.0;
    const int TAPS = 32;
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i) + 0.5;
      float rr = sqrt(fi / float(TAPS));
      float a = fi * 2.39996323;
      vec2 off = vec2(cos(a), sin(a)) * rr * r * texelSize;
      float w = 1.0 - rr * 0.4;
      acc += texture2D(inputBuffer, uv + off) * w;
      wsum += w;
    }
    outputColor = acc / wsum;
  }
`

export class TiltShiftEffect extends Effect {
  constructor() {
    super('TiltShiftEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, Uniform>([
        ['uFocus', new Uniform(0.5)],
        ['uBand', new Uniform(0.05)],
        ['uRamp', new Uniform(0.3)],
        ['uMaxBlur', new Uniform(10)],
        ['uRegion', new Uniform(new Vector4(-0.2, -0.2, 0.5, 1.2))],
        ['uSoft', new Uniform(new Vector2(0.05, 0.05))],
        ['uAll', new Uniform(0)],
      ]),
    })
  }

  /** all values in uv space (y up), blur in device px */
  set(
    focus: number,
    band: number,
    ramp: number,
    maxBlur: number,
    region: [number, number, number, number],
    soft: [number, number],
    all = 0,
  ) {
    const u = this.uniforms
    u.get('uFocus')!.value = focus
    u.get('uBand')!.value = band
    u.get('uRamp')!.value = ramp
    u.get('uMaxBlur')!.value = maxBlur
    ;(u.get('uRegion')!.value as Vector4).set(...region)
    ;(u.get('uSoft')!.value as Vector2).set(...soft)
    u.get('uAll')!.value = all
  }
}
