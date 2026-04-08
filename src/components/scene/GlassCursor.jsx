import LiquidGlass from "liquid-glass-react";

export default function GlassCursor({ config: c }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "60%",
        left: "50%",
        zIndex: 10000,
      }}
    >
      <LiquidGlass
        displacementScale={100}
        blurAmount={0.5}
        saturation={140}
        aberrationIntensity={2}
        elasticity={0}
        cornerRadius={32}
        overLight={true}
      >
        <div
          style={{
            padding: "40px 60px",
            color: "white",
            fontSize: "20px",
            fontWeight: 600,
            fontFamily: "system-ui",
            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          Glass Test
        </div>
      </LiquidGlass>
    </div>
  );
}
