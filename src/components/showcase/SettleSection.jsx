import { useRef, useMemo, useEffect, useState } from "react";
import { Color } from "three";
import { RGBELoader } from "three-stdlib";
import { useThree, useFrame, useLoader } from "@react-three/fiber";
import {
  Text3D,
  Center,
  MeshTransmissionMaterial,
  RoundedBox,
  Instance,
  Instances,
} from "@react-three/drei";
import { L, state, clamp, N } from "./ShowcaseLayout";

const CUBE_SIZE = 1.0;
const FONT_3D = "/Inter_Medium_Regular.json";
const HDRI_URL =
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/aerodynamics_workshop_1k.hdr";

// ── Mutable config — ALL scene values live here ──
const S = {
  rotX: 0.82,
  rotY: -0.52,
  rotZ: 0.17,
  sceneX: -0.47,
  sceneY: -0.79,
  sceneZ: 0,
  zoom: 0.64,
  adiX: 7.09,
  adiY: -1.02,
  adiZ: -2.99,
  adiScale: 2.22,
  adiRotX: -1.5707963267948966,
  adiRotY: 0,
  adiRotZ: 0,
  vrsX: 6.77,
  vrsY: -1,
  vrsZ: 0,
  vrsScale: 2.22,
  vrsRotX: -1.66,
  vrsRotY: 0,
  vrsRotZ: 0,
  groundShow: true,
  groundSize: 146,
  groundOpacity: 0.04,
  groundY: -1.01,
  gridShow: true,
  gridCount: 40,
  gridY: -1.02,
  shadowColor: "#94cbff",
  dofEnabled: true,
  dofFocus: 10.08,
  dofAperture: 6.1,
  dofMaxBlur: 0.031,
  cubes: [
    { x: -6.89, y: -0.4, z: 3 },
    { x: -8.91, y: -0.4, z: 1 },
    { x: -6.55, y: -0.4, z: -1.5 },
    { x: -6.22, y: -0.4, z: 2 },
    { x: -7.56, y: -0.4, z: 0 },
    { x: -9.58, y: -0.4, z: 4 },
    { x: -6.22, y: -0.4, z: -0.5 },
    { x: -9.58, y: 0.65, z: -1.5 },
    { x: -2.86, y: 0.65, z: 1 },
  ],
  keyX: 0,
  keyY: 10,
  keyZ: -10,
  keyIntensity: 1,
  fillX: -5,
  fillY: 1,
  fillZ: -1,
  fillIntensity: 0.5,
  rimX: 10,
  rimY: 1,
  rimZ: 0,
  rimIntensity: 0.5,
};

// Glass config
const GLASS_CONFIG = {
  backside: true,
  backsideThickness: 0.15,
  samples: 16,
  resolution: 1024,
  transmission: 1,
  clearcoat: 1,
  clearcoatRoughness: 0,
  thickness: 0.3,
  chromaticAberration: 0.15,
  anisotropy: 0.25,
  roughness: 0,
  distortion: 0.5,
  distortionScale: 0.1,
  temporalDistortion: 0,
  ior: 1.25,
  color: "white",
};

// ═══════════════════════════════════════════════════════
// Pure-DOM debug panel
// ═══════════════════════════════════════════════════════
function mountDebugPanel(forceRender) {
  if (document.getElementById("settle-debug"))
    return document.getElementById("settle-debug");
  const root = document.createElement("div");
  root.id = "settle-debug";
  Object.assign(root.style, {
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: "99999",
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: "8px",
    padding: "10px 14px",
    width: "295px",
    maxHeight: "92vh",
    overflowY: "auto",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "11px",
    color: "#1a1a2e",
    boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
    pointerEvents: "auto",
    cursor: "default",
  });

  const heading = (text) => {
    const h = document.createElement("div");
    Object.assign(h.style, {
      fontSize: "9px",
      fontWeight: "600",
      opacity: "0.35",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      margin: "10px 0 4px",
    });
    h.textContent = text;
    return h;
  };

  const makeSlider = (label, get, set, min, max, step = 0.01) => {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "2px",
    });
    const lbl = document.createElement("label");
    Object.assign(lbl.style, {
      width: "70px",
      fontSize: "10px",
      opacity: "0.6",
      flexShrink: "0",
    });
    lbl.textContent = label;
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = min;
    inp.max = max;
    inp.step = step;
    inp.value = get();
    Object.assign(inp.style, {
      flex: "1",
      height: "2px",
      accentColor: "#4a6fa5",
    });
    const val = document.createElement("span");
    Object.assign(val.style, {
      width: "44px",
      fontSize: "9px",
      textAlign: "right",
      opacity: "0.45",
      flexShrink: "0",
    });
    val.textContent = Number(get()).toFixed(2);
    inp.addEventListener("input", () => {
      set(parseFloat(inp.value));
      val.textContent = parseFloat(inp.value).toFixed(2);
    });
    row.appendChild(lbl);
    row.appendChild(inp);
    row.appendChild(val);
    return row;
  };

  const ss = (label, key, min, max, step) =>
    makeSlider(
      label,
      () => S[key],
      (v) => {
        S[key] = v;
      },
      min,
      max,
      step
    );

  const toggle = (label, key) => {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "2px",
    });
    const lbl = document.createElement("label");
    Object.assign(lbl.style, {
      width: "70px",
      fontSize: "10px",
      opacity: "0.6",
    });
    lbl.textContent = label;
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = S[key];
    inp.addEventListener("change", () => {
      S[key] = inp.checked;
      if (forceRender) forceRender();
    });
    row.appendChild(lbl);
    row.appendChild(inp);
    return row;
  };

  const hdr = document.createElement("div");
  Object.assign(hdr.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  });
  const title = document.createElement("span");
  title.textContent = "Settle Debug";
  Object.assign(title.style, { fontWeight: "600" });
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  Object.assign(copyBtn.style, {
    fontSize: "9px",
    opacity: "0.5",
    background: "none",
    border: "none",
    cursor: "pointer",
  });
  copyBtn.onclick = () => {
    navigator.clipboard?.writeText(JSON.stringify(S, null, 2));
    copyBtn.textContent = "✓";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1000);
  };
  hdr.appendChild(title);
  hdr.appendChild(copyBtn);
  root.appendChild(hdr);

  root.appendChild(heading("Camera / Scene"));
  root.appendChild(ss("Tilt X", "rotX", -3.14, 3.14));
  root.appendChild(ss("Tilt Y", "rotY", -3.14, 3.14));
  root.appendChild(ss("Tilt Z", "rotZ", -3.14, 3.14));
  root.appendChild(ss("Offset X", "sceneX", -20, 20));
  root.appendChild(ss("Offset Y", "sceneY", -20, 20));
  root.appendChild(ss("Offset Z", "sceneZ", -20, 20));
  root.appendChild(ss("Zoom", "zoom", 0.1, 5));

  root.appendChild(heading("ADI Text"));
  root.appendChild(ss("X", "adiX", -20, 20));
  root.appendChild(ss("Y", "adiY", -10, 10));
  root.appendChild(ss("Z", "adiZ", -20, 20));
  root.appendChild(ss("Scale", "adiScale", 0.5, 12));
  root.appendChild(ss("Rot X", "adiRotX", -3.14, 3.14));
  root.appendChild(ss("Rot Y", "adiRotY", -3.14, 3.14));
  root.appendChild(ss("Rot Z", "adiRotZ", -3.14, 3.14));

  root.appendChild(heading("VRSKIC Text"));
  root.appendChild(ss("X", "vrsX", -20, 20));
  root.appendChild(ss("Y", "vrsY", -10, 10));
  root.appendChild(ss("Z", "vrsZ", -20, 20));
  root.appendChild(ss("Scale", "vrsScale", 0.5, 12));
  root.appendChild(ss("Rot X", "vrsRotX", -3.14, 3.14));
  root.appendChild(ss("Rot Y", "vrsRotY", -3.14, 3.14));
  root.appendChild(ss("Rot Z", "vrsRotZ", -3.14, 3.14));

  root.appendChild(heading("Tilt-Shift DOF"));
  root.appendChild(toggle("Enabled", "dofEnabled"));
  root.appendChild(ss("Focus", "dofFocus", 0, 20));
  root.appendChild(ss("Aperture", "dofAperture", 0.1, 10));
  root.appendChild(ss("Max Blur", "dofMaxBlur", 0, 0.1, 0.001));

  root.appendChild(heading("Ground"));
  root.appendChild(toggle("Show", "groundShow"));
  root.appendChild(ss("Size", "groundSize", 10, 200, 1));
  root.appendChild(ss("Opacity", "groundOpacity", 0, 0.3));
  root.appendChild(ss("Y", "groundY", -10, 10));

  root.appendChild(heading("Grid"));
  root.appendChild(toggle("Show", "gridShow"));
  root.appendChild(ss("Count", "gridCount", 5, 60, 1));
  root.appendChild(ss("Y", "gridY", -10, 10));

  root.appendChild(heading("Cubes"));
  S.cubes.forEach((c, i) => {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      marginBottom: "6px",
      paddingLeft: "6px",
      borderLeft: "2px solid rgba(0,0,0,0.06)",
    });
    const lbl = document.createElement("div");
    lbl.textContent = `Cube ${i}`;
    Object.assign(lbl.style, {
      fontSize: "9px",
      fontWeight: "500",
      opacity: "0.45",
      marginBottom: "2px",
    });
    wrap.appendChild(lbl);
    wrap.appendChild(
      makeSlider(
        "X",
        () => c.x,
        (v) => {
          c.x = v;
        },
        -20,
        20
      )
    );
    wrap.appendChild(
      makeSlider(
        "Y",
        () => c.y,
        (v) => {
          c.y = v;
        },
        -5,
        5
      )
    );
    wrap.appendChild(
      makeSlider(
        "Z",
        () => c.z,
        (v) => {
          c.z = v;
        },
        -20,
        20
      )
    );
    root.appendChild(wrap);
  });

  root.appendChild(heading("Key Light"));
  root.appendChild(ss("X", "keyX", -20, 20));
  root.appendChild(ss("Y", "keyY", -20, 20));
  root.appendChild(ss("Z", "keyZ", -20, 20));
  root.appendChild(ss("Intensity", "keyIntensity", 0, 10));
  root.appendChild(heading("Fill Light"));
  root.appendChild(ss("X", "fillX", -20, 20));
  root.appendChild(ss("Y", "fillY", -20, 20));
  root.appendChild(ss("Z", "fillZ", -20, 20));
  root.appendChild(ss("Intensity", "fillIntensity", 0, 10));
  root.appendChild(heading("Rim Light"));
  root.appendChild(ss("X", "rimX", -20, 20));
  root.appendChild(ss("Y", "rimY", -20, 20));
  root.appendChild(ss("Z", "rimZ", -20, 20));
  root.appendChild(ss("Intensity", "rimIntensity", 0, 10));

  document.body.appendChild(root);
  return root;
}

// ═══════════════════════════════════════════════════════
// Grid — theme-colored, auto-fills viewport
// ═══════════════════════════════════════════════════════
function Grid({ opSmooth, themeColor }) {
  const matRef = useRef();
  const gridHelperRef = useRef();
  const groupRef = useRef();

  // Parse theme color for rgba usage
  const tc = useMemo(() => {
    const hex = themeColor || "#1a1a2e";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { hex, r, g, b };
  }, [themeColor]);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity = (opSmooth?.current || 0) * 0.4;
      matRef.current.color.setStyle(tc.hex);
    }
    if (gridHelperRef.current) {
      // gridHelper stores colors in its material array
      const mats = gridHelperRef.current.material;
      const col = new Color(tc.hex);
      if (Array.isArray(mats)) {
        mats.forEach((m) => {
          m.color.copy(col);
          m.opacity = (opSmooth?.current || 0) * 0.15;
          m.transparent = true;
        });
      } else if (mats) {
        mats.color.copy(col);
        mats.opacity = (opSmooth?.current || 0) * 0.15;
        mats.transparent = true;
      }
    }
    if (groupRef.current) groupRef.current.position.y = S.gridY;
  });

  const n = Math.round(S.gridCount);
  if (!S.gridShow) return null;

  // Spacing of 4 units between crosses — covers 4x more area per cross than 2-unit spacing
  const spacing = 4;
  const span = n * spacing;

  return (
    <group ref={groupRef} position={[0, S.gridY, 0]}>
      <Instances limit={n * n * 2}>
        <planeGeometry args={[0.026, 0.5]} />
        <meshBasicMaterial
          ref={matRef}
          color={tc.hex}
          transparent
          opacity={0}
        />
        {Array.from({ length: n }, (_, y) =>
          Array.from({ length: n }, (_, x) => (
            <group
              key={x + ":" + y}
              position={[
                x * spacing - Math.floor(n / 2) * spacing,
                -0.01,
                y * spacing - Math.floor(n / 2) * spacing,
              ]}
            >
              <Instance rotation={[-Math.PI / 2, 0, 0]} />
              <Instance rotation={[-Math.PI / 2, 0, Math.PI / 2]} />
            </group>
          ))
        )}
      </Instances>
      <gridHelper
        ref={gridHelperRef}
        args={[span, span, tc.hex, tc.hex]}
        position={[0, -0.01, 0]}
      />
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Single glass text line
// ═══════════════════════════════════════════════════════
function GlassTextLine({ text, posKey, scaleKey, rotKey, opSmooth }) {
  const groupRef = useRef();
  let texture = null;
  try {
    texture = useLoader(RGBELoader, HDRI_URL);
  } catch (e) {}

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(
      S[posKey + "X"],
      S[posKey + "Y"],
      S[posKey + "Z"]
    );
    groupRef.current.rotation.set(
      S[rotKey + "X"],
      S[rotKey + "Y"],
      S[rotKey + "Z"]
    );
    groupRef.current.scale.setScalar(S[scaleKey] / 5);
    groupRef.current.traverse((child) => {
      if (child.material && child.material.opacity !== undefined) {
        child.material.opacity = opSmooth.current;
        child.material.transparent = true;
      }
    });
  });

  const matProps = {
    ...GLASS_CONFIG,
    ...(texture ? { background: texture } : {}),
  };

  return (
    <group ref={groupRef}>
      <Center scale={[0.8, 1, 1]} front top>
        <Text3D
          castShadow
          bevelEnabled
          font={FONT_3D}
          scale={5}
          letterSpacing={-0.03}
          height={0.25}
          bevelSize={0.01}
          bevelSegments={10}
          curveSegments={128}
          bevelThickness={0.01}
        >
          {text}
          <MeshTransmissionMaterial {...matProps} />
        </Text3D>
      </Center>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Glass cube
// ═══════════════════════════════════════════════════════
function GlassCube({ cubeData, opSmooth }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(cubeData.x, cubeData.y, cubeData.z);
    const mat = ref.current.children?.[0]?.material;
    if (mat) mat.opacity = opSmooth.current * 0.9;
  });
  return (
    <group ref={ref}>
      <RoundedBox
        args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
        radius={0.1}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.15}
          thickness={0.3}
          transmission={1}
          roughness={0}
          ior={1.25}
          chromaticAberration={0.15}
          samples={6}
          resolution={256}
          color="#ffffff"
          transparent
          opacity={0}
          toneMapped
        />
      </RoundedBox>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════
export function SettleFloor({ themeColor }) {
  const groupRef = useRef();
  const sceneRef = useRef();
  const floorRef = useRef();
  const keyRef = useRef();
  const fillRef = useRef();
  const rimRef = useRef();
  const { viewport } = useThree();
  const opSmooth = useRef(0);
  const debugRef = useRef(null);
  const [, forceRender] = useState(0);

  // Shift+D toggles debug
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "D" && e.shiftKey) {
        if (debugRef.current) {
          debugRef.current.remove();
          debugRef.current = null;
        } else {
          debugRef.current = mountDebugPanel(() => forceRender((n) => n + 1));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (debugRef.current) {
        debugRef.current.remove();
        debugRef.current = null;
      }
    };
  }, []);

  useFrame(({ camera }) => {
    const isSettle = state.section >= N + 1;
    const camDist = Math.abs(-camera.position.y - (L.heroH + N * L.sectionH));
    const targetOp = isSettle ? clamp(1 - camDist / 4, 0, 1) : 0;
    opSmooth.current += (targetOp - opSmooth.current) * 0.04;

    if (sceneRef.current) {
      sceneRef.current.rotation.set(S.rotX, S.rotY, S.rotZ);
      sceneRef.current.position.set(S.sceneX, S.sceneY, S.sceneZ);
      sceneRef.current.scale.setScalar(S.zoom);
    }
    if (floorRef.current) {
      floorRef.current.visible = S.groundShow;
      floorRef.current.position.y = S.groundY;
      floorRef.current.material.opacity = opSmooth.current * S.groundOpacity;
    }
    if (keyRef.current) {
      keyRef.current.position.set(S.keyX, S.keyY, S.keyZ);
      keyRef.current.intensity = S.keyIntensity;
    }
    if (fillRef.current) {
      fillRef.current.position.set(S.fillX, S.fillY, S.fillZ);
      fillRef.current.intensity = S.fillIntensity;
    }
    if (rimRef.current) {
      rimRef.current.position.set(S.rimX, S.rimY, S.rimZ);
      rimRef.current.intensity = S.rimIntensity;
    }
  });

  return (
    <group ref={groupRef} position={[0, -(L.heroH + N * L.sectionH), -3]}>
      <group ref={sceneRef}>
        {/* Ground */}
        <mesh
          ref={floorRef}
          rotation-x={-Math.PI / 2}
          position={[0, S.groundY, 0]}
          receiveShadow
        >
          <planeGeometry args={[S.groundSize, S.groundSize]} />
          <meshStandardMaterial
            color="#e8e8ee"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>

        <GlassTextLine
          text="ADI"
          posKey="adi"
          scaleKey="adiScale"
          rotKey="adiRot"
          opSmooth={opSmooth}
        />
        <GlassTextLine
          text="VRSKIC"
          posKey="vrs"
          scaleKey="vrsScale"
          rotKey="vrsRot"
          opSmooth={opSmooth}
        />

        {/* Grid — theme-colored, fills viewport */}
        <Grid opSmooth={opSmooth} themeColor={themeColor} />

        {/* Lights */}
        <directionalLight
          ref={keyRef}
          position={[S.keyX, S.keyY, S.keyZ]}
          intensity={S.keyIntensity}
          castShadow
        />
        <pointLight
          ref={fillRef}
          position={[S.fillX, S.fillY, S.fillZ]}
          intensity={S.fillIntensity}
          color="#c8daf0"
        />
        <pointLight
          ref={rimRef}
          position={[S.rimX, S.rimY, S.rimZ]}
          intensity={S.rimIntensity}
          color="#e0e0ff"
        />

        {S.cubes.map((c, i) => (
          <GlassCube key={i} cubeData={c} opSmooth={opSmooth} />
        ))}
      </group>
    </group>
  );
}
