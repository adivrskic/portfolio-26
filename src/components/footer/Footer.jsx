import { useState } from "react";
import { FONT_FAMILY, DARK_RGBA } from "../../constants/style";
import GoldCoin from "./GoldCoin";

const F = FONT_FAMILY;
const D = DARK_RGBA;

export default function Footer({
  helixProgress,
  shatterProgress,
  onGoldUnlock,
  goldUnlocked,
}) {
  const [showMessage, setShowMessage] = useState(false);
  const vis = Math.max(0, Math.min(1, (helixProgress - 0.85) / 0.15));
  if (vis < 0.01 || shatterProgress < 0.5) return null;

  const handleCoinClick = () => {
    if (goldUnlocked) return;
    setShowMessage(true);
    if (onGoldUnlock) onGoldUnlock();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        opacity: vis,
        pointerEvents: vis > 0.5 ? "auto" : "none",
        fontFamily: F,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          paddingBottom: 60,
        }}
      >
        {/* Unlock message */}
        {showMessage && (
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#b8860b",
              fontWeight: 400,
              padding: "8px 20px",
              borderRadius: 20,
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.2)",
              animation: "fadeInUp 0.5s ease forwards",
            }}
          >
            ✦ Gold Theme Unlocked ✦
          </div>
        )}

        {/* Gold coin */}
        <GoldCoin onClick={handleCoinClick} unlocked={goldUnlocked} />

        {/* Hint text */}
        {!goldUnlocked && !showMessage && (
          <p
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              color: D + "0.15)",
              fontWeight: 300,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            A hidden treasure awaits
          </p>
        )}

        {/* Copyright */}
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.25em",
            color: D + "0.12)",
            fontWeight: 300,
            margin: "20px 0 0",
          }}
        >
          © 2025 ADI VRSKIC
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
