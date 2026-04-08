/**
 * useSceneStore — lightweight shared state for the R3F scene.
 *
 * Holds scroll, birth, mouse, spring physics, and mode flags that
 * multiple scene components need to read/write each frame.
 *
 * Uses a plain mutable object (not React state) so useFrame consumers
 * can read/write without triggering re-renders. React state is reserved
 * for values that the DOM UI layer needs (scrollProgress, birthComplete, etc.)
 * and is flushed via the callbacks passed in from App.jsx.
 *
 * Pattern: a single shared ref object, created once and passed via context.
 */

import { createContext, useContext, useRef } from "react";
import * as THREE from "three";

// ── The mutable store shape ──
function createStore(initialConfig = {}) {
  return {
    // Time
    elapsed: 0,
    delta: 0,

    // Scroll
    scrollTarget: 0,
    scrollCurrent: 0,
    scrollProgress: 0, // 0–1 normalized

    // Birth animation
    birthStart: performance.now(),
    birthT: 0, // raw 0–1
    birth: 0, // eased

    // Mouse (NDC)
    mouse: new THREE.Vector2(-999, -999),
    prevMouse: new THREE.Vector2(-999, -999),
    mouseWorld: new THREE.Vector3(),
    mouseSmooth: new THREE.Vector3(),

    // Glass cube state (shared so multiple components can reference it)
    cubePosition: new THREE.Vector3(),
    cubeQuaternion: new THREE.Quaternion(),
    cubeScale: new THREE.Vector3(1, 1, 1),
    angularVelocity: new THREE.Vector3(),

    // Spring physics for menu/chat transitions
    menuPos: new THREE.Vector3(),
    menuVel: new THREE.Vector3(),
    menuScale: 1,
    menuScaleVel: 0,

    // Chat arc springs
    chatZ: 0,
    chatZVel: 0,
    chatArc: 0,
    chatArcVel: 0,
    chatArcX: 0,
    chatArcXVel: 0,
    chatSpinBurst: 0,
    wasInChat: false,

    // Click/hold
    clickScale: 1,
    clickScaleVel: 0,
    isHolding: false,
    holdStartTime: 0,
    bounceZ: 0,
    bounceSpin: 0,
    bounceDecay: 0,

    // Rotation
    rotAngle: 0,

    // Shatter/explode
    shatterProgress: 0,
    wasShattered: false,

    // Proximity (cube → mouse distance in screen space)
    cubeProximity: 0,

    // Mode flags (mirrored from React props each frame)
    menuOpen: false,
    chatMode: false,

    // Config ref (points to the same object as App's configRef)
    config: initialConfig,
  };
}

const SceneStoreContext = createContext(null);

/**
 * Provider — wrap around <Canvas> contents.
 * The store is a ref so it's stable across renders.
 */
export function SceneStoreProvider({ initialConfig, children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createStore(initialConfig);
  }
  return (
    <SceneStoreContext.Provider value={storeRef.current}>
      {children}
    </SceneStoreContext.Provider>
  );
}

/**
 * Hook — returns the mutable store object.
 * Components read/write directly in useFrame callbacks.
 */
export function useSceneStore() {
  const store = useContext(SceneStoreContext);
  if (!store)
    throw new Error("useSceneStore must be used inside SceneStoreProvider");
  return store;
}
