import { useState, useCallback } from "react";
import { L } from "../showcase/ShowcaseCanvas";

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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 100,
          background: "rgba(0,0,0,0.5)",
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
        SC DEBUG
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 100,
        width: 220,
        maxHeight: "90vh",
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
            color: "#333",
          }}
        >
          SHOWCASE DEBUG
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
      <Section title="CAMERA" open>
        <Sl
          label="Snap lerp"
          value={get("anim.cameraLerp")}
          onChange={set("anim.cameraLerp")}
          min={0.01}
          max={0.2}
          step={0.005}
        />
        <Sl
          label="Wheel debounce (ms)"
          value={get("anim.wheelDebounce")}
          onChange={set("anim.wheelDebounce")}
          min={300}
          max={2000}
          step={50}
        />
      </Section>
      <Section title="GLASS CUBE">
        <Sl
          label="Size"
          value={get("cube.size")}
          onChange={set("cube.size")}
          min={0.3}
          max={4}
          step={0.05}
        />
        <Sl
          label="Center X"
          value={get("cube.centerX")}
          onChange={set("cube.centerX")}
          min={0.1}
          max={0.45}
          step={0.005}
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
        <Sl
          label="Hidden pause (s)"
          value={get("cube.hiddenPause")}
          onChange={set("cube.hiddenPause")}
          min={0}
          max={0.5}
          step={0.02}
        />
      </Section>
      <Section title="CUBE PUSH">
        <Sl
          label="Radius"
          value={get("cube.push.radius")}
          onChange={set("cube.push.radius")}
          min={2}
          max={30}
          step={1}
        />
        <Sl
          label="Strength"
          value={get("cube.push.strength")}
          onChange={set("cube.push.strength")}
          min={0.5}
          max={15}
          step={0.5}
        />
        <Sl
          label="Response"
          value={get("cube.push.response")}
          onChange={set("cube.push.response")}
          min={0.01}
          max={0.3}
          step={0.01}
        />
        <Sl
          label="Decay active"
          value={get("cube.push.decayActive")}
          onChange={set("cube.push.decayActive")}
          min={0.8}
          max={0.99}
          step={0.005}
        />
        <Sl
          label="Decay idle"
          value={get("cube.push.decayIdle")}
          onChange={set("cube.push.decayIdle")}
          min={0.7}
          max={0.99}
          step={0.005}
        />
      </Section>
      <Section title="TEXT ANIMATION">
        <Sl
          label="Fade speed"
          value={get("anim.textFade")}
          onChange={set("anim.textFade")}
          min={0.005}
          max={0.15}
          step={0.005}
        />
        <Sl
          label="Drift distance"
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
      <Section title="IMAGE ANIMATION">
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
      <Section title="BACKDROP">
        <Sl
          label="Opacity"
          value={get("backdrop.opacity")}
          onChange={set("backdrop.opacity")}
          min={0}
          max={0.6}
          step={0.01}
        />
        <Sl
          label="Fade speed"
          value={get("backdrop.fadeSpeed")}
          onChange={set("backdrop.fadeSpeed")}
          min={0.005}
          max={0.15}
          step={0.005}
        />
        <Sl
          label="Z depth"
          value={get("backdrop.z")}
          onChange={set("backdrop.z")}
          min={-5}
          max={0}
          step={0.5}
        />
        <Sl
          label="Vis range"
          value={get("backdrop.visRange")}
          onChange={set("backdrop.visRange")}
          min={1}
          max={10}
          step={0.5}
        />
      </Section>
      <Section title="3D PERSPECTIVE">
        <Sl
          label="Image rot Y"
          value={get("perspective.imgRotY")}
          onChange={set("perspective.imgRotY")}
          min={-0.15}
          max={0.15}
          step={0.005}
        />
        <Sl
          label="Text rot Y"
          value={get("perspective.textRotY")}
          onChange={set("perspective.textRotY")}
          min={-0.1}
          max={0.1}
          step={0.005}
        />
      </Section>
      <Section title="LAYOUT">
        <Sl
          label="Section height"
          value={get("sectionH")}
          onChange={set("sectionH")}
          min={8}
          max={24}
          step={0.5}
        />
        <Sl
          label="Hero height"
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
    </div>
  );
}
