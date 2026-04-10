import { DARK_RGBA, BG_HEX } from "../../constants/style";
import "./SliderRow.css";

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
  const D = tint || DARK_RGBA;
  const pct = ((value - min) / (max - min)) * 100;
  const activeLabel = labels ? labels[Math.round(value)] : null;

  return (
    <div>
      <div className="slider-row__header">
        <span className="slider-row__label" style={{ color: D + "0.45)" }}>
          {LabelIcon && (
            <LabelIcon size={11} strokeWidth={1.2} color={D + "0.38)"} />
          )}
          {label}
        </span>
        {activeLabel && (
          <span
            className="slider-row__active-label"
            style={{ color: D + "0.55)" }}
          >
            {activeLabel}
          </span>
        )}
      </div>
      <div className="slider-row__track-wrap">
        {leftIcon}
        <div className="slider-row__track">
          <div
            className="slider-row__track-bg"
            style={{ background: D + "0.15)" }}
          />
          <div
            className="slider-row__track-fill"
            style={{ width: pct + "%", background: D + "0.35)" }}
          />
          <input
            className="slider-row__input"
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div
            className="slider-row__thumb"
            style={{
              left: `calc(${pct}% - 7px)`,
              background: inputBg || BG_HEX,
              border: "2px solid " + D + "0.40)",
            }}
          />
        </div>
        {rightIcon}
      </div>
      {labels && (
        <div className="slider-row__labels">
          {labels.map((l, i) => (
            <span
              key={l}
              className="slider-row__label-tick"
              style={{
                fontWeight: Math.round(value) === i ? 400 : 300,
                color: D + (Math.round(value) === i ? "0.55)" : "0.28)"),
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
