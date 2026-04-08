import { FONT_FAMILY } from "../../constants/style";

export default function SliderRow({
  label,
  labelIcon: LabelIcon,
  value,
  onChange,
  leftIcon,
  rightIcon,
  labels,
  min,
  max,
  tint,
  inputBg,
}) {
  const D = tint || "rgba(26,26,46,";
  const pct = ((value - min) / (max - min)) * 100;
  const activeLabel = labels ? labels[Math.round(value)] : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: D + "0.45)",
            fontFamily: FONT_FAMILY,
            fontWeight: 300,
            letterSpacing: "0.1em",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {LabelIcon && (
            <LabelIcon size={11} strokeWidth={1.2} color={D + "0.38)"} />
          )}
          {label}
        </span>
        {activeLabel && (
          <span
            style={{
              fontSize: 11,
              fontFamily: FONT_FAMILY,
              fontWeight: 400,
              color: D + "0.55)",
              letterSpacing: "0.04em",
            }}
          >
            {activeLabel}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {leftIcon}
        <div
          style={{
            flex: 1,
            position: "relative",
            height: 24,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 3,
              background: D + "0.15)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              height: 3,
              borderRadius: 2,
              width: pct + "%",
              background: D + "0.35)",
              transition: "width 0.1s",
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              margin: 0,
              padding: 0,
              opacity: 0,
              cursor: "pointer",
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(${pct}% - 7px)`,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: inputBg || "#e8e8ee",
              border: "2px solid " + D + "0.40)",
              pointerEvents: "none",
              transition: "left 0.1s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          />
        </div>
        {rightIcon}
      </div>
      {labels && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            padding: "0 2px",
          }}
        >
          {labels.map((l, i) => (
            <span
              key={l}
              style={{
                fontSize: 10,
                fontFamily: FONT_FAMILY,
                fontWeight: Math.round(value) === i ? 400 : 300,
                color: D + (Math.round(value) === i ? "0.55)" : "0.28)"),
                transition: "color 0.15s, font-weight 0.15s",
                letterSpacing: "0.05em",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
