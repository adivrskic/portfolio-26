// PrintContent.jsx — hidden on screen, visible when printing
// Add to App.jsx: import PrintContent from "./components/PrintContent"
// Then inside the app-root div: <PrintContent />

export default function PrintContent() {
  return (
    <div
      className="print-content"
      style={{ display: "none" }} // hidden on screen, print.css shows it
    >
      <h1>Adi Vrskic</h1>
      <p className="subtitle">Creative Developer &amp; Software Engineer</p>
      <div className="links">
        <a href="https://adivrskic.dev">adivrskic.dev</a> ·{" "}
        <a href="https://github.com/adivrskic">github.com/adivrskic</a> ·{" "}
        <a href="https://linkedin.com/in/adi-vrskic">
          linkedin.com/in/adi-vrskic
        </a>
      </div>

      <hr />

      <h2>About</h2>
      <p>
        Full-stack creative developer with 8+ years of experience building
        large-scale web applications, immersive 3D experiences, and AI-powered
        products. Currently engineering front-end solutions at a Fortune 50
        retailer.
      </p>

      <hr />

      <h2>Experience</h2>
      <div className="project">
        <h3>Fortune 50 Retailer — Software Engineer</h3>
        <p>
          Led front-end development of exchange subdomain ($20M+ revenue). Built
          prompt engineering workflows for AI-assisted development. Mentored
          junior engineers with 18% sprint velocity improvement. Best in
          Technology award recipient.
        </p>
      </div>

      <hr />

      <h2>Selected Projects</h2>
      <div className="project">
        <h3>Nimbus — AI Website Generator</h3>
        <p className="tech">React · Supabase · Claude API · Stripe</p>
      </div>
      <div className="project">
        <h3>XSBL — Web Accessibility Suite</h3>
        <p className="tech">AI Analysis · Slack · WCAG Compliance</p>
      </div>
      <div className="project">
        <h3>Nimbus WMS — AI Warehouse Management</h3>
        <p className="tech">Demand Forecasting · Mobile Apps</p>
      </div>
      <div className="project">
        <h3>Pillow — Neumorphism Component Library</h3>
        <p className="tech">React · Soft UI · Theming</p>
      </div>

      <hr />

      <h2>Skills</h2>
      <p>
        React, TypeScript, Three.js, WebGL, GLSL, R3F, GSAP, Node.js, Supabase,
        Anthropic Claude, OpenAI, Stripe, Next.js, Tailwind
      </p>
    </div>
  );
}
