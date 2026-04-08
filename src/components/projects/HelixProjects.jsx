import { FONT_FAMILY } from "../../constants/style";
import { HELIX_PROJECTS } from "../../constants/projects";

const F = FONT_FAMILY;
const PROJECTS = HELIX_PROJECTS;

export default function HelixProjects({
  shatterProgress,
  activeProject,
  setActiveProject,
}) {
  if (shatterProgress < 0.01) return null;
  if (!activeProject) return null;

  const proj = PROJECTS.find((p) => p.id === activeProject);
  if (!proj) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(232,232,238,0.85)",
        backdropFilter: "blur(20px)",
        pointerEvents: "auto",
        cursor: "pointer",
        fontFamily: F,
      }}
      onClick={() => setActiveProject(null)}
    >
      <div style={{ maxWidth: 480, padding: 48, textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.4em",
            color: "rgba(26,26,46,0.2)",
            fontWeight: 300,
            marginBottom: 20,
          }}
        >
          {proj.number} — {proj.year}
        </div>
        <h2
          style={{
            fontSize: 42,
            fontWeight: 100,
            color: "#1a1a2e",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          {proj.title}
        </h2>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.2em",
            color: "rgba(26,26,46,0.3)",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          {proj.subtitle}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {proj.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: 3,
                border: "1px solid rgba(26,26,46,0.1)",
                color: "rgba(26,26,46,0.35)",
                fontWeight: 400,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(26,26,46,0.2)",
            marginTop: 32,
            letterSpacing: "0.15em",
          }}
        >
          CLICK TO CLOSE
        </div>
      </div>
    </div>
  );
}
