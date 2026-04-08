import { FONT_FAMILY } from "../../constants/style";

export function TypingIndicator() {
  return (
    <div
      style={{
        padding: "8px 0",
        fontFamily: FONT_FAMILY,
        fontSize: 20,
        fontWeight: 200,
        color: "rgba(18,18,40,0.15)",
        letterSpacing: "0.08em",
        animation: "ambFloat1 5s ease-in-out infinite",
      }}
    >
      <span style={{ animation: "tdot 1.4s infinite" }}>·</span>
      <span style={{ animation: "tdot 1.4s 0.2s infinite" }}> ·</span>
      <span style={{ animation: "tdot 1.4s 0.4s infinite" }}> ·</span>
    </div>
  );
}

export function SuggestionPill({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.35)",
        border: "0.5px solid rgba(18,18,40,0.06)",
        backdropFilter: "blur(8px)",
        fontFamily: FONT_FAMILY,
        fontSize: 10,
        fontWeight: 300,
        color: "rgba(18,18,40,0.4)",
        letterSpacing: "0.02em",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(255,255,255,0.6)";
        e.target.style.color = "rgba(18,18,40,0.6)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "rgba(255,255,255,0.35)";
        e.target.style.color = "rgba(18,18,40,0.4)";
      }}
    >
      {label}
    </button>
  );
}
