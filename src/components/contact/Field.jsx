import { FONT_FAMILY } from "../../constants/style";

export default function Field({ children, error, valid, icon: Icon, tint }) {
  const D = tint || "rgba(26,26,46,";
  return (
    <div style={{ position: "relative" }}>
      {Icon && (
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
          }}
        >
          <Icon size={13} strokeWidth={1.2} color={D + "0.38)"} />
        </span>
      )}
      {children}
      {error && (
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 9,
            fontFamily: FONT_FAMILY,
            padding: "3px 10px",
            borderRadius: 10,
            background: "rgba(200,60,60,0.06)",
            border: "0.5px solid rgba(200,60,60,0.12)",
            color: "rgba(200,60,60,0.5)",
            fontWeight: 400,
            letterSpacing: "0.03em",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {error}
        </span>
      )}
      {!error && valid && (
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "rgba(40,160,100,0.08)",
            border: "0.5px solid rgba(40,160,100,0.18)",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="rgba(40,160,100,0.55)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 5.5L4 7.5L8 3" />
          </svg>
        </span>
      )}
    </div>
  );
}
