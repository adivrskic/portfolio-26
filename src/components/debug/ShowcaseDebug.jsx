import { useState, useCallback } from "react";
import { L, state } from "../showcase/ShowcaseLayout";

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
            ? value.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 1)
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

function Section({ title, children, open: defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 8,
          color: open ? "#0055ff" : "#999",
          padding: "6px 0",
          cursor: "pointer",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 500,
          userSelect: "none",
        }}
      >
        {open ? "▾" : "▸"} {title}
      </div>
      {open && <div style={{ paddingBottom: 6 }}>{children}</div>}
    </div>
  );
}

export default function ShowcaseDebug() {
  const [open, setOpen] = useState(false);
  const [, forceUpdate] = useState(0);
  const [toast, setToast] = useState(null);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);

  const set = (path) => (val) => {
    const keys = path.split(".");
    let obj = L;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = val;
    refresh();
  };
  const get = (path) => {
    const keys = path.split(".");
    let obj = L;
    for (const k of keys) obj = obj[k];
    return obj;
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  // Deep-clone L for serialization (skip non-config keys)
  const CONFIG_KEYS = [
    "sectionH",
    "heroH",
    "img",
    "text",
    "backdrop",
    "cube",
    "anim",
    "perspective",
    "hero",
    "post",
    "light",
    "card",
    "physics",
    "glass",
  ];
  const serializeL = () => {
    const out = {};
    for (const k of CONFIG_KEYS)
      if (L[k] !== undefined) out[k] = JSON.parse(JSON.stringify(L[k]));
    return out;
  };
  const applyConfig = (cfg) => {
    for (const k of CONFIG_KEYS) {
      if (cfg[k] === undefined) continue;
      if (typeof cfg[k] === "object" && !Array.isArray(cfg[k])) {
        Object.assign(L[k], cfg[k]);
      } else {
        L[k] = cfg[k];
      }
    }
    refresh();
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        "showcase-debug-config",
        JSON.stringify(serializeL())
      );
      showToast("Saved to localStorage");
    } catch {
      showToast("Save failed");
    }
  };
  const handleLoad = () => {
    try {
      const raw = localStorage.getItem("showcase-debug-config");
      if (!raw) {
        showToast("No saved config");
        return;
      }
      applyConfig(JSON.parse(raw));
      showToast("Loaded");
    } catch {
      showToast("Load failed");
    }
  };
  const handleCopy = () => {
    const js = JSON.stringify(serializeL(), null, 2);
    navigator.clipboard.writeText("export const L = " + js + ";").then(
      () => showToast("Copied as JS"),
      () => showToast("Copy failed")
    );
  };
  const handleReset = () => {
    try {
      const raw = localStorage.getItem("showcase-debug-defaults");
      if (raw) {
        applyConfig(JSON.parse(raw));
        showToast("Reset to defaults");
      }
    } catch {
      showToast("Reset failed");
    }
  };

  // Store defaults on first render, auto-load saved config
  useState(() => {
    try {
      if (!localStorage.getItem("showcase-debug-defaults")) {
        localStorage.setItem(
          "showcase-debug-defaults",
          JSON.stringify(serializeL())
        );
      }
      const saved = localStorage.getItem("showcase-debug-config");
      if (saved) applyConfig(JSON.parse(saved));
    } catch {}
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 1001,
          background: "rgba(0,85,255,0.7)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 9,
          fontFamily: "monospace",
          cursor: "pointer",
          letterSpacing: "0.08em",
        }}
      >
        ◈ DEBUG
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 100,
        zIndex: 1111111,
        width: 230,
        maxHeight: "92vh",
        overflowY: "auto",
        background: "rgba(255,255,255,0.95)",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 10,
        fontFamily: "'Inter',sans-serif",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "#0055ff",
          }}
        >
          SHOWCASE DEBUG
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: "#aaa", fontFamily: "monospace" }}>
            §{state.section}/{state.totalSections - 1}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#999",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <Section title="POSTPROCESSING" open>
        <Sl
          label="AO radius"
          value={get("post.aoRadius")}
          onChange={set("post.aoRadius")}
          min={0.1}
          max={2}
          step={0.05}
        />
        <Sl
          label="AO intensity"
          value={get("post.aoIntensity")}
          onChange={set("post.aoIntensity")}
          min={0}
          max={3}
          step={0.1}
        />
        <Sl
          label="DoF focus range"
          value={get("post.dofFocusRange")}
          onChange={set("post.dofFocusRange")}
          min={0.01}
          max={1}
          step={0.01}
        />
        <Sl
          label="DoF bokeh scale"
          value={get("post.dofBokehScale")}
          onChange={set("post.dofBokehScale")}
          min={0}
          max={20}
          step={0.5}
        />
      </Section>

      <Section title="LIGHTING">
        <Sl
          label="Ambient"
          value={get("light.ambientIntensity")}
          onChange={set("light.ambientIntensity")}
          min={0}
          max={2}
          step={0.05}
        />
        <Sl
          label="Directional"
          value={get("light.dirIntensity")}
          onChange={set("light.dirIntensity")}
          min={0}
          max={5}
          step={0.1}
        />
        <Sl
          label="Dir X"
          value={get("light.dirX")}
          onChange={set("light.dirX")}
          min={-20}
          max={20}
          step={1}
        />
        <Sl
          label="Dir Y"
          value={get("light.dirY")}
          onChange={set("light.dirY")}
          min={-20}
          max={20}
          step={1}
        />
        <Sl
          label="Dir Z"
          value={get("light.dirZ")}
          onChange={set("light.dirZ")}
          min={-20}
          max={20}
          step={1}
        />
        <Sl
          label="Env fill 1"
          value={get("light.env1Intensity")}
          onChange={set("light.env1Intensity")}
          min={0}
          max={10}
          step={0.5}
        />
        <Sl
          label="Env fill 2"
          value={get("light.env2Intensity")}
          onChange={set("light.env2Intensity")}
          min={0}
          max={10}
          step={0.5}
        />
        <Sl
          label="Env fill 3"
          value={get("light.env3Intensity")}
          onChange={set("light.env3Intensity")}
          min={0}
          max={10}
          step={0.5}
        />
      </Section>

      <Section title="GLASS MATERIAL">
        <Sl
          label="Thickness"
          value={get("glass.thickness")}
          onChange={set("glass.thickness")}
          min={0.1}
          max={5}
          step={0.1}
        />
        <Sl
          label="Backside thick"
          value={get("glass.backsideThickness")}
          onChange={set("glass.backsideThickness")}
          min={0}
          max={10}
          step={0.5}
        />
        <Sl
          label="Roughness"
          value={get("glass.roughness")}
          onChange={set("glass.roughness")}
          min={0}
          max={1}
          step={0.01}
        />
        <Sl
          label="IOR"
          value={get("glass.ior")}
          onChange={set("glass.ior")}
          min={1}
          max={2.5}
          step={0.05}
        />
        <Sl
          label="Chromatic aberr"
          value={get("glass.chromaticAberration")}
          onChange={set("glass.chromaticAberration")}
          min={0}
          max={0.3}
          step={0.01}
        />
        <Sl
          label="Aniso blur"
          value={get("glass.anisotropicBlur")}
          onChange={set("glass.anisotropicBlur")}
          min={0}
          max={2}
          step={0.05}
        />
        <Sl
          label="Samples"
          value={get("glass.samples")}
          onChange={set("glass.samples")}
          min={1}
          max={16}
          step={1}
        />
        <Sl
          label="Resolution"
          value={get("glass.resolution")}
          onChange={set("glass.resolution")}
          min={32}
          max={512}
          step={32}
        />
      </Section>

      <Section title="CUBE PHYSICS">
        <Sl
          label="Push radius"
          value={get("physics.pushRadius")}
          onChange={set("physics.pushRadius")}
          min={0.5}
          max={6}
          step={0.1}
        />
        <Sl
          label="Push strength"
          value={get("physics.pushStrength")}
          onChange={set("physics.pushStrength")}
          min={1}
          max={60}
          step={1}
        />
        <Sl
          label="Gravity"
          value={get("physics.gravity")}
          onChange={set("physics.gravity")}
          min={-30}
          max={0}
          step={0.5}
        />
        <Sl
          label="Cube mass"
          value={get("physics.cubeMass")}
          onChange={set("physics.cubeMass")}
          min={0.5}
          max={20}
          step={0.5}
        />
        <Sl
          label="Linear damping"
          value={get("physics.linearDamping")}
          onChange={set("physics.linearDamping")}
          min={0}
          max={10}
          step={0.25}
        />
        <Sl
          label="Angular damping"
          value={get("physics.angularDamping")}
          onChange={set("physics.angularDamping")}
          min={0}
          max={10}
          step={0.25}
        />
        <Sl
          label="Floor friction"
          value={get("physics.floorFriction")}
          onChange={set("physics.floorFriction")}
          min={0}
          max={5}
          step={0.1}
        />
        <Sl
          label="Cube friction"
          value={get("physics.cubeFriction")}
          onChange={set("physics.cubeFriction")}
          min={0}
          max={5}
          step={0.1}
        />
        <Sl
          label="Restitution"
          value={get("physics.restitution")}
          onChange={set("physics.restitution")}
          min={0}
          max={1}
          step={0.05}
        />
      </Section>

      <Section title="GLASS CARD">
        <Sl
          label="BG opacity"
          value={get("card.bgOpacity")}
          onChange={set("card.bgOpacity")}
          min={0}
          max={0.8}
          step={0.01}
        />
        <Sl
          label="Border opacity"
          value={get("card.borderOpacity")}
          onChange={set("card.borderOpacity")}
          min={0}
          max={0.5}
          step={0.01}
        />
        <Sl
          label="Fade speed"
          value={get("card.bgFadeSpeed")}
          onChange={set("card.bgFadeSpeed")}
          min={0.01}
          max={0.2}
          step={0.005}
        />
      </Section>

      <Section title="CAMERA">
        <Sl
          label="Snap lerp"
          value={get("anim.cameraLerp")}
          onChange={set("anim.cameraLerp")}
          min={0.01}
          max={0.2}
          step={0.005}
        />
        <Sl
          label="Wheel debounce"
          value={get("anim.wheelDebounce")}
          onChange={set("anim.wheelDebounce")}
          min={300}
          max={2000}
          step={50}
        />
      </Section>

      <Section title="SHOWCASE CUBE">
        <Sl
          label="Size"
          value={get("cube.size")}
          onChange={set("cube.size")}
          min={0.3}
          max={4}
          step={0.05}
        />
        <Sl
          label="Z depth"
          value={get("cube.z")}
          onChange={set("cube.z")}
          min={0}
          max={10}
          step={0.5}
        />
        <Sl
          label="Fade speed"
          value={get("cube.fadeSpeed")}
          onChange={set("cube.fadeSpeed")}
          min={0.02}
          max={0.3}
          step={0.01}
        />
      </Section>

      <Section title="TEXT ANIM">
        <Sl
          label="Fade speed"
          value={get("anim.textFade")}
          onChange={set("anim.textFade")}
          min={0.005}
          max={0.15}
          step={0.005}
        />
        <Sl
          label="Drift"
          value={get("anim.textDrift")}
          onChange={set("anim.textDrift")}
          min={0}
          max={5}
          step={0.1}
        />
        <Sl
          label="Stagger"
          value={get("anim.textStagger")}
          onChange={set("anim.textStagger")}
          min={0}
          max={0.6}
          step={0.02}
        />
        <Sl
          label="Vis range"
          value={get("anim.textVisRange")}
          onChange={set("anim.textVisRange")}
          min={1}
          max={10}
          step={0.5}
        />
      </Section>

      <Section title="IMAGE ANIM">
        <Sl
          label="Fade speed"
          value={get("anim.imgFade")}
          onChange={set("anim.imgFade")}
          min={0.005}
          max={0.15}
          step={0.005}
        />
        <Sl
          label="Scale lerp"
          value={get("anim.imgScale")}
          onChange={set("anim.imgScale")}
          min={0.005}
          max={0.1}
          step={0.005}
        />
        <Sl
          label="Scale from"
          value={get("anim.imgScaleFrom")}
          onChange={set("anim.imgScaleFrom")}
          min={0.5}
          max={1}
          step={0.01}
        />
      </Section>

      <Section title="LAYOUT">
        <Sl
          label="Section H"
          value={get("sectionH")}
          onChange={set("sectionH")}
          min={8}
          max={24}
          step={0.5}
        />
        <Sl
          label="Hero H"
          value={get("heroH")}
          onChange={set("heroH")}
          min={4}
          max={14}
          step={0.5}
        />
        <Sl
          label="Hero title size"
          value={get("hero.titleSize")}
          onChange={set("hero.titleSize")}
          min={0.04}
          max={0.2}
          step={0.005}
        />
      </Section>

      {/* Section quick-nav */}
      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Array.from({ length: state.totalSections }, (_, i) => (
          <button
            key={i}
            onClick={() => {
              state.section = i;
              refresh();
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: "none",
              fontSize: 8,
              fontFamily: "monospace",
              cursor: "pointer",
              background: state.section === i ? "#0055ff" : "rgba(0,0,0,0.05)",
              color: state.section === i ? "#fff" : "#888",
            }}
          >
            {i}
          </button>
        ))}
      </div>

      {/* Save / Load / Copy / Reset */}
      <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
        {[
          { label: "Save", fn: handleSave, bg: "#0055ff", c: "#fff" },
          { label: "Load", fn: handleLoad, bg: "rgba(0,0,0,0.05)", c: "#555" },
          {
            label: "Copy JS",
            fn: handleCopy,
            bg: "rgba(0,0,0,0.05)",
            c: "#555",
          },
          {
            label: "Reset",
            fn: handleReset,
            bg: "rgba(200,50,50,0.08)",
            c: "#a33",
          },
        ].map((b) => (
          <button
            key={b.label}
            onClick={b.fn}
            style={{
              flex: 1,
              padding: "5px 0",
              borderRadius: 4,
              border: "none",
              fontSize: 8,
              fontFamily: "monospace",
              cursor: "pointer",
              letterSpacing: "0.05em",
              background: b.bg,
              color: b.c,
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            marginTop: 6,
            padding: "4px 8px",
            borderRadius: 4,
            background: "rgba(0,85,255,0.08)",
            color: "#0055ff",
            fontSize: 9,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
