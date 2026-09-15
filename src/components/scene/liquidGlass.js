import {
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import {
  glassVertexShader,
  glassFragmentShader,
  MAX_LENSES,
} from "./shaders/glass.glsl.js";

/**
 * createLiquidGlass({ sceneTexture, bgTexture, bgColor })
 *
 * Draws every DOM element carrying `data-glass` as a refracting lens in the
 * final composite pass (see shaders/glass.glsl.js). Each frame it measures
 * those elements and hands their rectangles to the shader:
 *
 *   data-glass="0|1"       lens amount; components toggle it around their
 *                          reveal animations (it also fades in and out here)
 *   data-glass-blur="30"   frost blur in CSS px, like the backdrop-filter
 *                          it replaces
 *   data-glass-frost="0.3" how far the glass tints toward the panel colour
 *
 * The lens follows the element's border-radius and every ancestor's
 * opacity, so GSAP fades and the showcase's wrapper fade carry over. The
 * CSS side (App.css, html.liquid-glass) strips the element's own backdrop
 * blur while this is active.
 */
export function createLiquidGlass({ sceneTexture, bgTexture, bgColor }) {
  const uniforms = {
    uScene: { value: sceneTexture },
    uBg: { value: bgTexture },
    uBgColor: { value: bgColor },
    uTint: { value: new Vector3(232 / 255, 232 / 255, 238 / 255) },
    uView: { value: new Vector2(1, 1) },
    uDpr: { value: 1 },
    uBgLodBias: { value: 0 },
    uBezel: { value: 14 },
    uCount: { value: 0 },
    uRect: { value: new Float32Array(MAX_LENSES * 4) },
    uLens: { value: new Float32Array(MAX_LENSES * 4) },
  };
  const material = new ShaderMaterial({
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  scene.add(quad);

  // Per-element smoothed amount, so a lens eases in over ~100ms instead of
  // popping when a component flips its data-glass
  const smoothed = new Map();
  const rects = uniforms.uRect.value;
  const lens = uniforms.uLens.value;

  function effectiveOpacity(el, cs) {
    if (cs.visibility === "hidden" || cs.display === "none") return 0;
    let o = Number(cs.opacity);
    for (
      let node = el.parentElement;
      node && node !== document.body && o > 0.001;
      node = node.parentElement
    ) {
      const po = Number(getComputedStyle(node).opacity);
      if (po < 1) o *= po;
    }
    return o;
  }

  function update(dt, viewW, viewH, dpr, bgLodBias) {
    uniforms.uView.value.set(viewW, viewH);
    uniforms.uDpr.value = dpr;
    uniforms.uBgLodBias.value = bgLodBias;
    const els = document.querySelectorAll("[data-glass]");
    const seen = new Set();
    let n = 0;
    for (const el of els) {
      const target = parseFloat(el.dataset.glass) || 0;
      let s = smoothed.get(el);
      if (target <= 0 && !s) continue;
      const cs = getComputedStyle(el);
      const goal = target * effectiveOpacity(el, cs);
      if (!s) {
        s = { amount: 0 };
        smoothed.set(el, s);
      }
      s.amount += (goal - s.amount) * Math.min(1, dt * 14);
      if (goal <= 0 && s.amount < 0.01) s.amount = 0;
      seen.add(el);
      if (s.amount < 0.005 || n >= MAX_LENSES) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const br = cs.borderTopLeftRadius || "0";
      let radius = parseFloat(br) || 0;
      if (br.endsWith("%"))
        radius = (Math.min(rect.width, rect.height) * radius) / 100;
      const blur = parseFloat(el.dataset.glassBlur);
      const frost = parseFloat(el.dataset.glassFrost);
      const k = n * 4;
      rects[k] = rect.left;
      rects[k + 1] = rect.top;
      rects[k + 2] = rect.width;
      rects[k + 3] = rect.height;
      lens[k] = radius;
      lens[k + 1] = s.amount;
      lens[k + 2] = Number.isFinite(blur) ? blur : 20;
      lens[k + 3] = Number.isFinite(frost) ? frost : 0.3;
      n++;
    }
    for (const el of smoothed.keys()) if (!seen.has(el)) smoothed.delete(el);
    uniforms.uCount.value = n;
    return n;
  }

  function render(renderer) {
    renderer.render(scene, camera);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    smoothed.clear();
  }

  return { update, render, dispose, uniforms };
}
