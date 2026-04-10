import { SPECS } from "../../constants/projects";
import "./MenuSections.css";

export default function MenuAbout() {
  return (
    <div className="menu-about">
      <div data-stg style={{ marginBottom: 20 }}>
        <h2 className="menu-about__headline">
          I build things
          <br />
          that feel alive.
        </h2>
      </div>
      <div data-stg style={{ marginBottom: 14 }}>
        <p className="menu-about__bio menu-about__bio--primary">
          Full-stack creative developer with 8+ years of experience in React,
          TypeScript, Three.js, and AI integration. Currently engineering
          front-end solutions at The Home Depot, building features used by
          millions of customers.
        </p>
      </div>
      <div data-stg style={{ marginBottom: 28 }}>
        <p className="menu-about__bio menu-about__bio--secondary">
          I ship AI-powered products, build immersive 3D web experiences, and
          care deeply about performance and clean architecture. Every project is
          a chance to push the craft forward.
        </p>
      </div>
      <div data-stg className="menu-about__specs">
        {SPECS.map((s) => (
          <span key={s} className="menu-about__spec">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
