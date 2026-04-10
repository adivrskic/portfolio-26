import "./ChatWidgets.css";

export function TypingIndicator() {
  return (
    <div className="typing-indicator">
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
    <button className="suggestion-pill" onClick={onClick}>
      {label}
    </button>
  );
}
