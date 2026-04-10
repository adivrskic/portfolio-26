import { FONT_FAMILY } from "../../constants/style";

export function TypingIndicator() {
  return (
    <div
      style={{
        padding: "10px 0",
        display: "flex",
        alignItems: "center",
      }}
    >
      <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
        <rect
          x="2"
          y="2"
          width="36"
          height="24"
          rx="12"
          fill="rgba(18,18,40,0.04)"
          stroke="rgba(18,18,40,0.1)"
          strokeWidth="0.8"
        />
        <circle cx="13" cy="14" r="2" fill="rgba(18,18,40,0.2)">
          <animate
            attributeName="opacity"
            values="0.1;0.4;0.1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="20" cy="14" r="2" fill="rgba(18,18,40,0.2)">
          <animate
            attributeName="opacity"
            values="0.1;0.4;0.1"
            dur="1.4s"
            begin="0.2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="27" cy="14" r="2" fill="rgba(18,18,40,0.2)">
          <animate
            attributeName="opacity"
            values="0.1;0.4;0.1"
            dur="1.4s"
            begin="0.4s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
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
