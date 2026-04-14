/**
 * createGlassEnvironment(renderer)
 *
 * Creates a PMREMGenerator environment map that makes MeshPhysicalMaterial
 * transmission look like actual glass instead of gray.
 *
 * Usage in Scene.jsx:
 *   import { createGlassEnvironment } from "./glassEnv";
 *
 *   // After: const scene = new THREEScene();
 *   const envMap = createGlassEnvironment(renderer, scene);
 *
 *   // In cleanup:
 *   envMap.dispose();
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  PMREMGenerator,
  Scene,
} from "three";

export function createGlassEnvironment(renderer, targetScene) {
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new Scene();
  envScene.background = new Color("#e8e8ee");

  const l1 = new DirectionalLight(0xffffff, 3);
  l1.position.set(5, 8, 5);
  envScene.add(l1);

  const l2 = new DirectionalLight(0xddeeff, 2);
  l2.position.set(-5, 3, -8);
  envScene.add(l2);

  const l3 = new DirectionalLight(0xffe8d0, 1.5);
  l3.position.set(0, -4, 6);
  envScene.add(l3);

  envScene.add(new AmbientLight(0xf0f0ff, 1));

  const envMap = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
  targetScene.environment = envMap;

  pmrem.dispose();
  return envMap;
}
