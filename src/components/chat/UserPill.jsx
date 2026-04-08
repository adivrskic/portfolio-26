import { FONT_FAMILY } from "../../constants/style";

export default function UserPill({ text }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "4px 0",
        animation: "ambFloat3 6.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          padding: "8px 18px",
          borderRadius: 20,
          maxWidth: "75%",
          background: "rgba(255,255,255,0.45)",
          border: "0.5px solid rgba(18,18,40,0.04)",
          backdropFilter: "blur(10px)",
          fontFamily: FONT_FAMILY,
          fontSize: 12,
          fontWeight: 300,
          color: "rgba(18,18,40,0.4)",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
}
