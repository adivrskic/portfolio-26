import { FONT_FAMILY } from "../../constants/style";

export function TypingIndicator() {
  return (
    <div
      style={{
        padding: "10px 0",
        display: "flex",
        alignItems: "center",
        animation: "typingPulse 2s ease-in-out infinite",
      }}
    >
      <svg width="36" height="30" viewBox="0 0 36 30" fill="none">
        <path
          d="M5 3h26a3 3 0 013 3v14a3 3 0 01-3 3H12l-7 5.5V23H5a3 3 0 01-3-3V6a3 3 0 013-3z"
          fill="rgba(18,18,40,0.04)"
          stroke="rgba(18,18,40,0.12)"
          strokeWidth="0.8"
        />
        <circle cx="12" cy="13" r="1.5" fill="rgba(18,18,40,0.25)">
          <animate
            attributeName="opacity"
            values="0.1;0.4;0.1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="18" cy="13" r="1.5" fill="rgba(18,18,40,0.25)">
          <animate
            attributeName="opacity"
            values="0.1;0.4;0.1"
            dur="1.4s"
            begin="0.2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="24" cy="13" r="1.5" fill="rgba(18,18,40,0.25)">
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
