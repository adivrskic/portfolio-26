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
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {title}
        <span style={{ color: "#bbb" }}>{open ? "−" : "+"}</span>
      </div>
      {open && <div style={{ padding: "0 0 8px" }}>{children}</div>}
    </div>
  );
}

export default function DebugPanel({
  config: c,
  setConfig,
  visible,
  setVisible,
}) {
  const [copied, setCopied] = useState(false);
  const up = (k) => (v) => setConfig((p) => ({ ...p, [k]: v }));
  const reset = () => setConfig({ ...DEFAULTS });
  const replay = () => setConfig((p) => ({ ...p, birthReplay: Date.now() }));
  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(c, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <button
              onClick={replay}
              style={{
                flex: 1,
                padding: "6px 2px",
                fontSize: 9,
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: "rgba(0,80,255,0.08)",
                color: "#0055ff",
                borderRadius: 4,
                border: "1px solid rgba(0,80,255,0.15)",
                fontWeight: 500,
              }}
            >
              ▶ Replay
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "6px 2px",
                fontSize: 9,
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: "rgba(255,60,60,0.06)",
                color: "#c44",
                borderRadius: 4,
                border: "1px solid rgba(255,60,60,0.1)",
                fontWeight: 500,
              }}
            >
              ↺ Reset
            </button>
          </div>

          <Section title="TIMING" open>
            <Sl
              label="Duration (s)"
              value={c.birthDuration}
              onChange={up("birthDuration")}
              min={0.3}
              max={8}
              step={0.1}
            />
            <Sl
              label="Fade-in speed"
              value={c.birthFadeSpeed ?? 3}
              onChange={up("birthFadeSpeed")}
              min={0.5}
              max={10}
              step={0.1}
            />
            <Sl
              label="Text reveal at"
              value={c.birthTextAt ?? 0.99}
              onChange={up("birthTextAt")}
              min={0.3}
              max={1}
              step={0.01}
            />
          </Section>

          <Section title="FLY-IN" open>
            <Sl
              label="Z start distance"
              value={c.birthFlyInDist ?? 7}
              onChange={up("birthFlyInDist")}
              min={0}
              max={100}
              step={0.5}
            />
            <Sl
              label="Z deceleration"
              value={c.birthFlyInCurve ?? 1.8}
              onChange={up("birthFlyInCurve")}
              min={0.3}
              max={10}
              step={0.1}
            />
            <Sl
              label="Y float distance"
              value={c.birthFloatDist ?? 7}
              onChange={up("birthFloatDist")}
              min={0}
              max={100}
              step={0.1}
            />
            <Sl
              label="Arc height"
              value={c.birthArcHeight ?? 2.0}
              onChange={up("birthArcHeight")}
              min={-20}
              max={20}
              step={0.1}
            />
            <Sl
              label="X start offset"
              value={c.birthStartX ?? 0}
              onChange={up("birthStartX")}
              min={-20}
              max={20}
              step={0.1}
            />
            <Sl
              label="Y start offset"
              value={c.birthStartY ?? 0}
              onChange={up("birthStartY")}
              min={-20}
              max={20}
              step={0.1}
            />
            <Sl
              label="X end offset"
              value={c.birthEndX ?? 0}
              onChange={up("birthEndX")}
              min={-10}
              max={10}
              step={0.1}
            />
            <Sl
              label="Y end offset"
              value={c.birthEndY ?? 0}
              onChange={up("birthEndY")}
              min={-10}
              max={10}
              step={0.1}
            />
          </Section>

          <Section title="SCALE" open>
            <Sl
              label="Start scale"
              value={c.birthScaleStart ?? 1.0}
              onChange={up("birthScaleStart")}
              min={0.1}
              max={10}
              step={0.05}
            />
          </Section>

          <Section title="EASING CURVE" open>
            <div style={{ marginBottom: 6 }}>
              <label
                style={{
                  fontSize: 9,
                  color: "#888",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={(c.birthUseBezier ?? 0) > 0.5}
                  onChange={(e) =>
                    up("birthUseBezier")(e.target.checked ? 1 : 0)
                  }
                  style={{ accentColor: "#0055ff" }}
                />
                Use cubic-bezier (instead of power ease)
              </label>
            </div>
            {(c.birthUseBezier ?? 0) > 0.5 ? (
              <>
                <Sl
                  label="X1"
                  value={c.birthBezierX1 ?? 0.16}
                  onChange={up("birthBezierX1")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Y1"
                  value={c.birthBezierY1 ?? 1.0}
                  onChange={up("birthBezierY1")}
                  min={-0.5}
                  max={2}
                  step={0.01}
                />
                <Sl
                  label="X2"
                  value={c.birthBezierX2 ?? 0.3}
                  onChange={up("birthBezierX2")}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Sl
                  label="Y2"
                  value={c.birthBezierY2 ?? 1.0}
                  onChange={up("birthBezierY2")}
                  min={-0.5}
                  max={2}
                  step={0.01}
                />
                <div
                  style={{
                    fontSize: 8,
                    color: "#aaa",
                    fontFamily: "monospace",
                    marginTop: 2,
                  }}
                >
                  cubic-bezier(
                  {(c.birthBezierX1 ?? 0.16).toFixed(2)},{" "}
                  {(c.birthBezierY1 ?? 1.0).toFixed(2)},{" "}
                  {(c.birthBezierX2 ?? 0.3).toFixed(2)},{" "}
                  {(c.birthBezierY2 ?? 1.0).toFixed(2)})
                </div>
              </>
            ) : (
              <Sl
                label="Power ease"
                value={c.birthEasing ?? 2.5}
                onChange={up("birthEasing")}
                min={0.5}
                max={6}
                step={0.1}
              />
            )}
          </Section>

          <Section title="ROTATION" open>
            <Sl
              label="Spin speed"
              value={c.birthSpinSpeed ?? 0.4}
              onChange={up("birthSpinSpeed")}
              min={0}
              max={4}
              step={0.05}
            />
            <Sl
              label="Spin multiplier"
              value={c.birthSpinMult ?? 0.15}
              onChange={up("birthSpinMult")}
              min={0}
              max={1}
              step={0.01}
            />
            <Sl
              label="Tilt amount"
              value={c.birthTiltAmp ?? 0.04}
              onChange={up("birthTiltAmp")}
              min={0}
              max={0.5}
              step={0.005}
            />
            <Sl
              label="Tilt speed"
              value={c.birthTiltSpeed ?? 0.2}
              onChange={up("birthTiltSpeed")}
              min={0}
              max={2}
              step={0.05}
            />
            <div
              style={{
                fontSize: 8,
                color: "#999",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "6px 0 4px",
              }}
            >
              Initial spin burst
            </div>
            <Sl
              label="Burst X"
              value={c.birthSpinBurstX ?? 0}
              onChange={up("birthSpinBurstX")}
              min={-8}
              max={8}
              step={0.1}
            />
            <Sl
              label="Burst Y"
              value={c.birthSpinBurstY ?? 0}
              onChange={up("birthSpinBurstY")}
              min={-8}
              max={8}
              step={0.1}
            />
            <Sl
              label="Burst Z"
              value={c.birthSpinBurstZ ?? 0}
              onChange={up("birthSpinBurstZ")}
              min={-8}
              max={8}
              step={0.1}
            />
          </Section>

          <Section title="BRUSH STROKE">
            <Sl
              label="Fade speed"
              value={c.brushFade ?? 0.021}
              onChange={up("brushFade")}
              min={0.001}
              max={0.08}
              step={0.001}
            />
            <Sl
              label="Reveal radius"
              value={c.revealRadius ?? 420}
              onChange={up("revealRadius")}
              min={50}
              max={800}
              step={10}
            />
            <Sl
              label="Reveal intensity"
              value={c.revealIntensity ?? 1}
              onChange={up("revealIntensity")}
              min={0.1}
              max={3}
              step={0.05}
            />
            <Sl
              label="Size multiplier"
              value={c.brushSizeMult ?? 0.4}
              onChange={up("brushSizeMult")}
              min={0.05}
              max={1.0}
              step={0.01}
            />
            <Sl
              label="Opacity multiplier"
              value={c.brushOpacityMult ?? 0.1}
              onChange={up("brushOpacityMult")}
              min={0.01}
              max={0.5}
              step={0.01}
            />
            <Sl
              label="Spacing"
              value={c.brushSpacing ?? 4}
              onChange={up("brushSpacing")}
              min={1}
              max={16}
              step={0.5}
            />
            <Sl
              label="Smoothing"
              value={c.brushSmoothing ?? 0.12}
              onChange={up("brushSmoothing")}
              min={0.01}
              max={0.5}
              step={0.01}
            />
            <Sl
              label="Mask expand"
              value={c.brushMaskExpand ?? 1.002}
              onChange={up("brushMaskExpand")}
              min={1.0}
              max={1.02}
              step={0.001}
            />
            <Sl
              label="Core size"
              value={c.brushCoreSize ?? 0.5}
              onChange={up("brushCoreSize")}
              min={0.1}
              max={1.0}
              step={0.01}
            />
            <Sl
              label="Core opacity"
              value={c.brushCoreOpacity ?? 0.6}
              onChange={up("brushCoreOpacity")}
              min={0.05}
              max={1.0}
              step={0.01}
            />
            <Sl
              label="Core falloff"
              value={c.brushCoreFalloff ?? 0.15}
              onChange={up("brushCoreFalloff")}
              min={0.01}
              max={0.6}
              step={0.01}
            />
          </Section>

          <Section title="BRISTLES">
            <Sl
              label="Angle spread"
              value={c.bristleAngleSpread ?? 0.8}
              onChange={up("bristleAngleSpread")}
              min={0}
              max={2.0}
              step={0.05}
            />
            <Sl
              label="Dist min"
              value={c.bristleDistMin ?? 0.15}
              onChange={up("bristleDistMin")}
              min={0}
              max={0.5}
              step={0.01}
            />
            <Sl
              label="Dist max"
              value={c.bristleDistMax ?? 0.6}
              onChange={up("bristleDistMax")}
              min={0.2}
              max={1.5}
              step={0.01}
            />
            <Sl
              label="Size min"
              value={c.bristleSizeMin ?? 0.25}
              onChange={up("bristleSizeMin")}
              min={0.05}
              max={0.8}
              step={0.01}
            />
            <Sl
              label="Size max"
              value={c.bristleSizeMax ?? 0.7}
              onChange={up("bristleSizeMax")}
              min={0.2}
              max={1.5}
              step={0.01}
            />
            <Sl
              label="Opacity min"
              value={c.bristleOpacityMin ?? 0.4}
              onChange={up("bristleOpacityMin")}
              min={0}
              max={1}
              step={0.01}
            />
            <Sl
              label="Opacity max"
              value={c.bristleOpacityMax ?? 1.0}
              onChange={up("bristleOpacityMax")}
              min={0.2}
              max={1}
              step={0.01}
            />
          </Section>

          <Section title="GRADIENT BLOBS">
            <Sl
              label="Blob count"
              value={c.blobCount ?? 15}
              onChange={up("blobCount")}
              min={3}
              max={30}
              step={1}
            />
            <Sl
              label="Blob size min"
              value={c.blobSizeMin ?? 0.25}
              onChange={up("blobSizeMin")}
              min={0.05}
              max={0.5}
              step={0.01}
            />
            <Sl
              label="Blob size max"
              value={c.blobSizeMax ?? 0.65}
              onChange={up("blobSizeMax")}
              min={0.3}
              max={1.2}
              step={0.01}
            />
            <Sl
              label="Blob alpha min"
              value={c.blobAlphaMin ?? 0.3}
              onChange={up("blobAlphaMin")}
              min={0.05}
              max={0.8}
              step={0.01}
            />
            <Sl
              label="Blob alpha max"
              value={c.blobAlphaMax ?? 0.85}
              onChange={up("blobAlphaMax")}
              min={0.3}
              max={1.0}
              step={0.01}
            />
            <Sl
              label="Grad speed"
              value={c.gradSpeed ?? 1.82}
              onChange={up("gradSpeed")}
              min={0.1}
              max={5}
              step={0.05}
            />
          </Section>

          <Section title="CHAT TRANSITION">
            <Sl
              label="Stiffness"
              value={c.chatStiffness ?? 1.8}
              onChange={up("chatStiffness")}
              min={0.5}
              max={6}
              step={0.1}
            />
            <Sl
              label="Damping"
              value={c.chatDamping ?? 3.5}
              onChange={up("chatDamping")}
              min={1}
              max={8}
              step={0.1}
            />
            <Sl
              label="Return stiffness"
              value={c.chatReturnStiffness ?? 4.0}
              onChange={up("chatReturnStiffness")}
              min={1}
              max={10}
              step={0.1}
            />
            <Sl
              label="Return damping"
              value={c.chatReturnDamping ?? 4.0}
              onChange={up("chatReturnDamping")}
              min={1}
              max={10}
              step={0.1}
            />
            <Sl
              label="Arc stiffness"
              value={c.chatArcStiffness ?? 2.0}
              onChange={up("chatArcStiffness")}
              min={0.5}
              max={6}
              step={0.1}
            />
            <Sl
              label="Arc damping"
              value={c.chatArcDamping ?? 2.8}
              onChange={up("chatArcDamping")}
              min={0.5}
              max={6}
              step={0.1}
            />
            <Sl
              label="Arc kick Z"
              value={c.chatArcKickZ ?? -5}
              onChange={up("chatArcKickZ")}
              min={-15}
              max={0}
              step={0.5}
            />
            <Sl
              label="Arc kick X"
              value={c.chatArcKickX ?? -3}
              onChange={up("chatArcKickX")}
              min={-10}
              max={0}
              step={0.5}
            />
            <Sl
              label="Spin kick"
              value={c.chatSpinKick ?? 1.8}
              onChange={up("chatSpinKick")}
              min={0}
              max={6}
              step={0.1}
            />
            <Sl
              label="Spin decay"
              value={c.chatSpinDecay ?? 1.4}
              onChange={up("chatSpinDecay")}
              min={0.5}
              max={4}
              step={0.1}
            />
          </Section>

          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <button
              onClick={copyJson}
              style={{
                flex: 1,
                padding: "6px 2px",
                fontSize: 9,
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: copied
                  ? "rgba(0,180,80,0.08)"
                  : "rgba(0,80,255,0.08)",
                color: copied ? "#0a4" : "#0055ff",
                borderRadius: 4,
                border: `1px solid ${
                  copied ? "rgba(0,180,80,0.15)" : "rgba(0,80,255,0.15)"
                }`,
                fontWeight: 500,
              }}
            >
              {copied ? "✓ Copied" : "Copy JSON"}
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "6px 2px",
                fontSize: 9,
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: "rgba(255,60,60,0.06)",
                color: "#c44",
                borderRadius: 4,
                border: "1px solid rgba(255,60,60,0.1)",
                fontWeight: 500,
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
