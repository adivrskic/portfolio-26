import { FONT_FAMILY } from "../../constants/style";

// Keywords that get theme-color accent
const TECH_WORDS = new Set([
  "react",
  "vue",
  "three.js",
  "threejs",
  "supabase",
  "claude",
  "vite",
  "typescript",
  "javascript",
  "python",
  "node",
  "next.js",
  "nextjs",
  "tailwind",
  "gsap",
  "openai",
  "gpt",
  "stripe",
  "vercel",
  "figma",
  "css",
  "html",
  "api",
  "ai",
  "sql",
  "aws",
  "r3f",
  "webgl",
  "glsl",
]);

function parseRichText(text) {
  // Split text into tokens, preserving spaces
  const parts = [];
  // Match: emails, tech words, or regular words
  const regex = /(\S+@\S+\.\S+)|(\S+)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    // Add any whitespace before this match
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    const word = match[0];
    const cleanWord = word.replace(/[.,!?;:'"()]/g, "").toLowerCase();

    if (match[1]) {
      // Email address
      parts.push({ type: "email", value: word });
    } else if (TECH_WORDS.has(cleanWord)) {
      // Tech keyword
      parts.push({ type: "tech", value: word });
    } else {
      parts.push({ type: "text", value: word });
    }

    lastIndex = match.index + word.length;
  }

  // Trailing whitespace
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export default function AmbientLine({ text, index, total }) {
  const floatDur = 5.5 + (index % 4) * 0.7;
  const floatDelay = index * 0.3;
  const fontSize = total <= 2 ? 22 : total <= 4 ? 19 : 16;

  const parts = parseRichText(text);

  return (
    <div
      className="ambient-line"
      style={{
        fontFamily: FONT_FAMILY,
        fontSize,
        animation: `ambLineIn 0.4s ease ${index * 0.05}s both, ambFloat${
          index % 5
        } ${floatDur}s ${floatDelay}s ease-in-out infinite`,
      }}
    >
      {parts.map((p, i) => {
        if (p.type === "email") {
          return (
            <span key={i} className="ambient-line__email">
              {p.value}
            </span>
          );
        }
        if (p.type === "tech") {
          return (
            <span key={i} className="ambient-line__tech">
              {p.value}
            </span>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </div>
  );
}
