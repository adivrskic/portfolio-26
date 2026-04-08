import { Flower2, Sun, Leaf, Snowflake, Crown } from "lucide-react";

/**
 * Theme definitions used by MenuOverlay and ChatPanel.
 */
export const THEMES = [
  {
    id: "spring",
    label: "Spring",
    colors: ["#1a4a2e", "#e8a0bf", "#3d9e5c", "#d4f0c6"],
    icon: (c) => <Flower2 size={18} strokeWidth={1.2} color={c} />,
  },
  {
    id: "summer",
    label: "Summer",
    colors: ["#f5a623", "#1a8fe0", "#ff6b35", "#08b4a8"],
    icon: (c) => <Sun size={18} strokeWidth={1.2} color={c} />,
  },
  {
    id: "fall",
    label: "Autumn",
    colors: ["#8b2500", "#d85a30", "#f5a623", "#4a1b0c"],
    icon: (c) => <Leaf size={18} strokeWidth={1.2} color={c} />,
  },
  {
    id: "winter",
    label: "Winter",
    colors: ["#2c3e6b", "#a0c4e8", "#4a6fa5", "#d0e8f5"],
    icon: (c) => <Snowflake size={18} strokeWidth={1.2} color={c} />,
  },
  {
    id: "gold",
    label: "Gold",
    colors: ["#b8860b", "#ffd700", "#daa520", "#cd853f"],
    icon: (c) => <Crown size={18} strokeWidth={1.2} color={c} />,
  },
];

export const SEASON_META = {
  spring: { label: "Spring", icon: Flower2 },
  summer: { label: "Summer", icon: Sun },
  fall: { label: "Autumn", icon: Leaf },
  winter: { label: "Winter", icon: Snowflake },
  gold: { label: "Gold", icon: Crown },
};
