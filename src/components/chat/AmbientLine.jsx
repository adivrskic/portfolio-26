import { FONT_FAMILY } from "../../constants/style";

export default function AmbientLine({ text, index, total }) {
  const floatDur = 5.5 + (index % 4) * 0.7;
  const floatDelay = index * 0.3;
  const fontSize = total <= 2 ? 24 : total <= 4 ? 21 : 18;

  return (
    <div
      className="ambient-line"
      style={{
        fontFamily: FONT_FAMILY,
        fontSize,
        color: "rgba(18,18,40,0.55)",
        animation: `ambLineIn 0.4s ease ${index * 0.05}s both, ambFloat${
          index % 5
        } ${floatDur}s ${floatDelay}s ease-in-out infinite`,
      }}
    >
      {text}
    </div>
  );
}
