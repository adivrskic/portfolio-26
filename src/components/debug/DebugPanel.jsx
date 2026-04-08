import { useState } from "react";
import { DEFAULTS } from "../../config/defaults";

function Sl({ label, value, onChange, min, max, step }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: "#888",
          marginBottom: 1,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: "monospace", color: "#555" }}>
          {typeof value === "number"
            ? value.toFixed(step < 0.1 ? 2 : 1)
            : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", height: 3, accentColor: "#0055ff" }}
      />
    </div>
  );
}

function Ci({ label, value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
        fontSize: 9,
        color: "#888",
      }}
    >
      <span>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "monospace", color: "#555", fontSize: 8 }}>
          {value}
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 18,
            height: 18,
            border: "1px solid #ccc",
            borderRadius: 3,
            cursor: "pointer",
            padding: 0,
            background: "none",
          }}
        />
      </div>
    </div>
  );
}

function Section({ title, children, open: defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 8,
          color: open ? "#0055ff" : "#999",
          letterSpacing: "0.06em",
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 0",
        }}
      >
        <span style={{ fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: 9, opacity: 0.4 }}>{open ? "−" : "+"}</span>
      </div>
      {open && <div style={{ paddingBottom: 6 }}>{children}</div>}
    </div>
  );
}

const TABS = [
  { id: "scene", label: "Scene" },
  { id: "effects", label: "Effects" },
  { id: "style", label: "Style" },
  { id: "timing", label: "Timing" },
];

export default function DebugPanel({
  config: c,
  setConfig,
  visible,
  setVisible,
}) {
  const [tab, setTab] = useState("effects");
  const up = (k) => (v) => setConfig((p) => ({ ...p, [k]: v }));
  const reset = () => setConfig({ ...DEFAULTS });

  return (
    <>
      <button
        onClick={() => setVisible(!visible)}
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 1000,
          pointerEvents: "auto",
          background: visible ? "rgba(0,80,255,0.3)" : "rgba(240,240,245,0.8)",
          color: "#555",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 4,
          padding: "6px 14px",
          fontSize: 10,
          fontFamily: "'Inter',sans-serif",
          letterSpacing: "0.1em",
          cursor: "pointer",
          textTransform: "uppercase",
          backdropFilter: "blur(10px)",
        }}
      >
        {visible ? "× Close" : "⚙ Debug"}
      </button>

      {visible && (
        <div
          style={{
            position: "fixed",
            top: 50,
            right: 12,
            width: 260,
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            zIndex: 999,
            pointerEvents: "auto",
            background: "rgba(245,245,250,0.95)",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 8,
            padding: 10,
            backdropFilter: "blur(20px)",
            fontFamily: "'Inter',sans-serif",
            color: "#444",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: 2,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "4px 2px",
                  fontSize: 8,
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  background:
                    tab === t.id ? "rgba(0,80,255,0.08)" : "transparent",
                  color: tab === t.id ? "#0055ff" : "#999",
                  borderRadius: 3,
                  border: `1px solid ${
                    tab === t.id ? "rgba(0,80,255,0.15)" : "transparent"
                  }`,
                  fontWeight: tab === t.id ? 500 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ═══ SCENE — The 3D objects ═══ */}
          {tab === "scene" && (
            <>
              {/* ══════════════════════════════════════════════════════════════
    GLASS CUBE — MeshTransmissionMaterial debug controls
    
    Paste this to replace the existing <Section title="GLASS CUBE"> 
    block in DebugPanel.jsx (around line 202-273).
    ══════════════════════════════════════════════════════════════ */}

              <Section title="GLASS CUBE" open>
                <Sl
                  label="Size"
                  value={c.glassCubeSize}
                  onChange={up("glassCubeSize")}
                  min={1}
                  max={8}
                  step={0.1}
                />
                <Sl
                  label="Corner rounding"
                  value={c.glassCornerRadius ?? 0.08}
                  onChange={up("glassCornerRadius")}
                  min={0}
                  max={0.5}
                  step={0.01}
                />
                <Sl
                  label="Edge opacity"
                  value={c.glassEdgeOpacity ?? 0.12}
                  onChange={up("glassEdgeOpacity")}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Section>

              <Section title="TRANSMISSION" open>
                <Sl
                  label="Transmission"
                  value={c.glassTransmission ?? 1}
                  onChange={up("glassTransmission")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Thickness"
                  value={c.glassThickness ?? 2}
                  onChange={up("glassThickness")}
                  min={0}
                  max={10}
                  step={0.1}
                />
                <Sl
                  label="Backside thickness"
                  value={c.glassBacksideThickness ?? 5}
                  onChange={up("glassBacksideThickness")}
                  min={0}
                  max={15}
                  step={0.1}
                />
                <Sl
                  label="IOR (refraction)"
                  value={c.glassIor ?? 1.5}
                  onChange={up("glassIor")}
                  min={1}
                  max={3}
                  step={0.01}
                />
                <Sl
                  label="Roughness (frost)"
                  value={c.glassRoughness ?? 0}
                  onChange={up("glassRoughness")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Chromatic aberration"
                  value={c.glassChromaticAberration ?? 0.02}
                  onChange={up("glassChromaticAberration")}
                  min={0}
                  max={0.5}
                  step={0.005}
                />
                <Sl
                  label="Anisotropic blur"
                  value={c.glassAnisotropicBlur ?? 0.4}
                  onChange={up("glassAnisotropicBlur")}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <Ci
                  label="Tint color"
                  value={c.glassColor || "#ffffff"}
                  onChange={up("glassColor")}
                />
              </Section>

              <Section title="DISTORTION">
                <Sl
                  label="Distortion"
                  value={c.glassDistortion ?? 0}
                  onChange={up("glassDistortion")}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="Distortion scale"
                  value={c.glassDistortionScale ?? 0.2}
                  onChange={up("glassDistortionScale")}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="Temporal distortion"
                  value={c.glassTemporalDistortion ?? 0}
                  onChange={up("glassTemporalDistortion")}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Section>

              <Section title="QUALITY (affects perf)">
                <Sl
                  label="Samples"
                  value={c.glassSamples ?? 10}
                  onChange={up("glassSamples")}
                  min={1}
                  max={16}
                  step={1}
                />
                <Sl
                  label="Resolution"
                  value={c.glassResolution ?? 1024}
                  onChange={up("glassResolution")}
                  min={128}
                  max={2048}
                  step={128}
                />
              </Section>

              <Section title="ROTATION">
                <Sl
                  label="Spin X"
                  value={c.glassRotSpeedX}
                  onChange={up("glassRotSpeedX")}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="Spin Y"
                  value={c.glassRotSpeedY}
                  onChange={up("glassRotSpeedY")}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="Idle speed"
                  value={c.rotationSpeed}
                  onChange={up("rotationSpeed")}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Section>
              <Section title="ROTATION">
                <Sl
                  label="Spin X"
                  value={c.glassRotSpeedX}
                  onChange={up("glassRotSpeedX")}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="Spin Y"
                  value={c.glassRotSpeedY}
                  onChange={up("glassRotSpeedY")}
                  min={0}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="Idle speed"
                  value={c.rotationSpeed}
                  onChange={up("rotationSpeed")}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Section>
              <Section title="LIGHTING">
                <Sl
                  label="Key light"
                  value={c.light1Intensity}
                  onChange={up("light1Intensity")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Fill light"
                  value={c.light2Intensity}
                  onChange={up("light2Intensity")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Back light"
                  value={c.light3Intensity}
                  onChange={up("light3Intensity")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Ambient"
                  value={c.ambientIntensity}
                  onChange={up("ambientIntensity")}
                  min={0}
                  max={2}
                  step={0.05}
                />
              </Section>
              <Section title="MATERIAL (inner sphere)">
                <Sl
                  label="Roughness"
                  value={c.roughness}
                  onChange={up("roughness")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Metallic"
                  value={c.metallic}
                  onChange={up("metallic")}
                  min={0}
                  max={5}
                  step={0.1}
                />
                <Sl
                  label="Fresnel"
                  value={c.fresnelPower}
                  onChange={up("fresnelPower")}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
                <Sl
                  label="Iridescence"
                  value={c.iridescence}
                  onChange={up("iridescence")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Env reflection"
                  value={c.envReflect}
                  onChange={up("envReflect")}
                  min={0}
                  max={5}
                  step={0.1}
                />
                <Sl
                  label="Rim glow"
                  value={c.rimStrength}
                  onChange={up("rimStrength")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Ci
                  label="Rim color"
                  value={c.rimColor}
                  onChange={up("rimColor")}
                />
              </Section>
            </>
          )}

          {/* ═══ EFFECTS — The animation pipeline ═══ */}
          {tab === "effects" && (
            <>
              <Section title="GLASS BREAK" open>
                <Sl
                  label="Break speed (seconds)"
                  value={c.explodeDuration}
                  onChange={up("explodeDuration")}
                  min={0.3}
                  max={8}
                  step={0.1}
                />
                <Sl
                  label="How far pieces fly"
                  value={c.explodeCap}
                  onChange={up("explodeCap")}
                  min={0.05}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Piece opacity"
                  value={c.shatterOpacity}
                  onChange={up("shatterOpacity")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Number of pieces"
                  value={c.shardSegments}
                  onChange={up("shardSegments")}
                  min={1}
                  max={6}
                  step={1}
                />
                <Sl
                  label="Piece rotation"
                  value={c.shardRotSpeed}
                  onChange={up("shardRotSpeed")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Cube spin before break"
                  value={c.progressSpinSpeed}
                  onChange={up("progressSpinSpeed")}
                  min={0}
                  max={8}
                  step={0.1}
                />
              </Section>
              <Section title="PARTICLE STREAM">
                <Sl
                  label="Stream speed"
                  value={c.streamSpeed}
                  onChange={up("streamSpeed")}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
                <Sl
                  label="Spiral width"
                  value={c.spiralStrength}
                  onChange={up("spiralStrength")}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <Sl
                  label="Formation front"
                  value={c.convergenceSharpness}
                  onChange={up("convergenceSharpness")}
                  min={0.02}
                  max={0.5}
                  step={0.01}
                />
              </Section>
              <Section title="HELIX SHAPE">
                <Sl
                  label="Height"
                  value={c.helixLength}
                  onChange={up("helixLength")}
                  min={10}
                  max={120}
                  step={1}
                />
                <Sl
                  label="Width"
                  value={c.helixRadius}
                  onChange={up("helixRadius")}
                  min={0.5}
                  max={8}
                  step={0.1}
                />
                <Sl
                  label="Coils"
                  value={c.helixTurns}
                  onChange={up("helixTurns")}
                  min={2}
                  max={20}
                  step={1}
                />
                <Sl
                  label="Dot size"
                  value={c.helixPointSize}
                  onChange={up("helixPointSize")}
                  min={0.1}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Opacity"
                  value={c.helixOpacity}
                  onChange={up("helixOpacity")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Spread"
                  value={c.helixSpread}
                  onChange={up("helixSpread")}
                  min={0}
                  max={3}
                  step={0.05}
                />
              </Section>
              <Section title="HELIX SCROLL">
                <Sl
                  label="Rotation per scroll"
                  value={c.helixRotationMult}
                  onChange={up("helixRotationMult")}
                  min={0.1}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Formation range"
                  value={c.convergenceRange}
                  onChange={up("convergenceRange")}
                  min={0.1}
                  max={1.5}
                  step={0.01}
                />
                <Sl
                  label="End dissipation"
                  value={c.dissipateStart}
                  onChange={up("dissipateStart")}
                  min={0.5}
                  max={1}
                  step={0.01}
                />
              </Section>
            </>
          )}

          {/* ═══ STYLE — Colors, text, UI appearance ═══ */}
          {tab === "style" && (
            <>
              <Section title="GRADIENT COLORS" open>
                <Ci
                  label="Color 1"
                  value={c.gradColor1}
                  onChange={up("gradColor1")}
                />
                <Ci
                  label="Color 2"
                  value={c.gradColor2}
                  onChange={up("gradColor2")}
                />
                <Ci
                  label="Color 3"
                  value={c.gradColor3}
                  onChange={up("gradColor3")}
                />
                <Ci
                  label="Color 4"
                  value={c.gradColor4}
                  onChange={up("gradColor4")}
                />
                <Sl
                  label="Speed"
                  value={c.gradSpeed}
                  onChange={up("gradSpeed")}
                  min={0}
                  max={5}
                  step={0.05}
                />
                <Sl
                  label="Scale"
                  value={c.gradScale}
                  onChange={up("gradScale")}
                  min={0.5}
                  max={10}
                  step={0.1}
                />
              </Section>
              <Section title="BRUSH REVEAL">
                <Sl
                  label="Radius"
                  value={c.revealRadius}
                  onChange={up("revealRadius")}
                  min={50}
                  max={800}
                  step={10}
                />
                <Sl
                  label="Intensity"
                  value={c.revealIntensity}
                  onChange={up("revealIntensity")}
                  min={0}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Fade"
                  value={c.brushFade}
                  onChange={up("brushFade")}
                  min={0}
                  max={0.1}
                  step={0.001}
                />
              </Section>
              <Section title="TEXT">
                <Sl
                  label="Size"
                  value={c.fontSize}
                  onChange={up("fontSize")}
                  min={0.5}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Weight"
                  value={c.fontWeight}
                  onChange={up("fontWeight")}
                  min={100}
                  max={900}
                  step={100}
                />
                <Sl
                  label="Spacing"
                  value={c.letterSpacing}
                  onChange={up("letterSpacing")}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <Sl
                  label="Opacity"
                  value={c.textOpacity}
                  onChange={up("textOpacity")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Position (bottom %)"
                  value={c.textBottom}
                  onChange={up("textBottom")}
                  min={2}
                  max={30}
                  step={0.5}
                />
                <Ci
                  label="Dark color"
                  value={c.textColor}
                  onChange={up("textColor")}
                />
                <Ci
                  label="Light color"
                  value={c.textColorLight}
                  onChange={up("textColorLight")}
                />
              </Section>
              <Section title="CURSOR / MENU">
                <Sl
                  label="Cursor range"
                  value={c.reticleRange}
                  onChange={up("reticleRange")}
                  min={0.5}
                  max={3}
                  step={0.05}
                />
                <Sl
                  label="Cursor smoothing"
                  value={c.reticleSmoothing}
                  onChange={up("reticleSmoothing")}
                  min={0.01}
                  max={0.3}
                  step={0.01}
                />
                <Sl
                  label="Menu blur"
                  value={c.menuBlur}
                  onChange={up("menuBlur")}
                  min={0}
                  max={40}
                  step={1}
                />
                <Sl
                  label="Menu opacity"
                  value={c.menuBgOpacity}
                  onChange={up("menuBgOpacity")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Ci
                  label="Menu text color"
                  value={c.menuTextColor}
                  onChange={up("menuTextColor")}
                />
                <Ci
                  label="Menu input color"
                  value={c.menuInputColor}
                  onChange={up("menuInputColor")}
                />
              </Section>
              <Section title="GOLD GLITTER">
                <Sl
                  label="Pool count"
                  value={c.glitterCount}
                  onChange={up("glitterCount")}
                  min={100}
                  max={800}
                  step={50}
                />
                <Sl
                  label="Size min"
                  value={c.glitterSizeMin}
                  onChange={up("glitterSizeMin")}
                  min={0.1}
                  max={3}
                  step={0.1}
                />
                <Sl
                  label="Size max"
                  value={c.glitterSizeMax}
                  onChange={up("glitterSizeMax")}
                  min={0.5}
                  max={6}
                  step={0.1}
                />
                <Sl
                  label="Lifetime min"
                  value={c.glitterLifetimeMin}
                  onChange={up("glitterLifetimeMin")}
                  min={0.5}
                  max={10}
                  step={0.5}
                />
                <Sl
                  label="Lifetime max"
                  value={c.glitterLifetimeMax}
                  onChange={up("glitterLifetimeMax")}
                  min={1}
                  max={15}
                  step={0.5}
                />
                <Sl
                  label="Drift min"
                  value={c.glitterDriftMin}
                  onChange={up("glitterDriftMin")}
                  min={0}
                  max={50}
                  step={1}
                />
                <Sl
                  label="Drift max"
                  value={c.glitterDriftMax}
                  onChange={up("glitterDriftMax")}
                  min={5}
                  max={80}
                  step={1}
                />
                <Sl
                  label="Spread"
                  value={c.glitterSpread}
                  onChange={up("glitterSpread")}
                  min={5}
                  max={80}
                  step={1}
                />
                <Sl
                  label="Spawn rate"
                  value={c.glitterSpawnRate}
                  onChange={up("glitterSpawnRate")}
                  min={1}
                  max={40}
                  step={1}
                />
                <Sl
                  label="Idle rate"
                  value={c.glitterIdleRate}
                  onChange={up("glitterIdleRate")}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <Sl
                  label="Fade curve"
                  value={c.glitterFadeExp}
                  onChange={up("glitterFadeExp")}
                  min={0.2}
                  max={3}
                  step={0.1}
                />
              </Section>
            </>
          )}

          {/* ═══ TIMING — Scroll, intro, interactions ═══ */}
          {tab === "timing" && (
            <>
              <Section title="SCROLL" open>
                <Sl
                  label="Sensitivity"
                  value={c.scrollSpeed}
                  onChange={up("scrollSpeed")}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
                <Sl
                  label="Total distance"
                  value={c.totalScrollRange}
                  onChange={up("totalScrollRange")}
                  min={20}
                  max={300}
                  step={5}
                />
                <Sl
                  label="Break point (%)"
                  value={c.shatterThreshold}
                  onChange={up("shatterThreshold")}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                />
              </Section>
              <Section title="INTRO">
                <Sl
                  label="Cube entrance time"
                  value={c.birthDuration}
                  onChange={up("birthDuration")}
                  min={0.5}
                  max={6}
                  step={0.1}
                />
                <Sl
                  label="Float distance"
                  value={c.birthFloatDist}
                  onChange={up("birthFloatDist")}
                  min={0}
                  max={20}
                  step={0.5}
                />
                <Sl
                  label="Entrance spin"
                  value={c.birthSpinSpeed}
                  onChange={up("birthSpinSpeed")}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <Sl
                  label="Fade speed"
                  value={c.birthFadeSpeed}
                  onChange={up("birthFadeSpeed")}
                  min={0.5}
                  max={5}
                  step={0.1}
                />
              </Section>
              <Section title="TEXT REVEAL">
                <Sl
                  label="Duration"
                  value={c.emergeDuration}
                  onChange={up("emergeDuration")}
                  min={0.1}
                  max={2}
                  step={0.05}
                />
                <Sl
                  label="Letter stagger"
                  value={c.letterStagger}
                  onChange={up("letterStagger")}
                  min={0}
                  max={0.3}
                  step={0.01}
                />
                <Sl
                  label="Delay"
                  value={c.textRevealDelay}
                  onChange={up("textRevealDelay")}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <Sl
                  label="Travel distance"
                  value={c.textTravelDist}
                  onChange={up("textTravelDist")}
                  min={0}
                  max={30}
                  step={1}
                />
              </Section>
              <Section title="MOUSE">
                <Sl
                  label="Push strength"
                  value={c.mouseStrength}
                  onChange={up("mouseStrength")}
                  min={0}
                  max={2}
                  step={0.05}
                />
                <Sl
                  label="Push radius"
                  value={c.mouseRadius}
                  onChange={up("mouseRadius")}
                  min={0.5}
                  max={5}
                  step={0.1}
                />
                <Sl
                  label="Falloff"
                  value={c.mouseFalloff}
                  onChange={up("mouseFalloff")}
                  min={0.1}
                  max={3}
                  step={0.05}
                />
              </Section>
            </>
          )}

          {/* Actions */}
          <div
            style={{
              marginTop: 8,
              borderTop: "1px solid rgba(0,0,0,0.06)",
              paddingTop: 8,
              display: "flex",
              gap: 4,
            }}
          >
            <button
              onClick={() => {
                const j = JSON.stringify(c, null, 2);
                navigator.clipboard.writeText(j).catch(() => {
                  const ta = document.createElement("textarea");
                  ta.value = j;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                });
              }}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 8,
                fontFamily: "inherit",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: "rgba(0,80,255,0.04)",
                color: "#05f",
                borderRadius: 3,
                border: "1px solid rgba(0,80,255,0.1)",
              }}
            >
              Copy JSON
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 8,
                fontFamily: "inherit",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: "rgba(255,0,0,0.04)",
                color: "#c44",
                borderRadius: 3,
                border: "1px solid rgba(200,0,0,0.1)",
              }}
            >
              Reset All
            </button>
          </div>
        </div>
      )}
    </>
  );
}
