import { FONT_FAMILY } from "../../constants/style";

export default function AmbientLine({ text, index, total, isNew }) {
  const floatDur = 5.5 + (index % 4) * 0.7;
  const floatDelay = index * 0.3;
  const fadeProgress = Math.min(1, (index + 1) / Math.max(total, 1));
  const opacity = 0.2 + fadeProgress * 0.5;
  const fontSize = total <= 2 ? 24 : total <= 4 ? 21 : 18;

  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontSize,
        fontWeight: 200,
        color: `rgba(18,18,40,${opacity})`,
        letterSpacing: "0.01em",
        lineHeight: 1.45,
        padding: "2px 0",
        animation: `ambFloat${index % 5} ${floatDur}s ${floatDelay}s ease-in-out infinite`,
        opacity: isNew ? 0 : 1,
        transform: isNew ? "translateY(8px)" : "none",
        transition: `opacity 0.6s ease ${index * 0.08}s, transform 0.6s ease ${index * 0.08}s`,
      }}
    >
      {text}
    </div>
  );
}
