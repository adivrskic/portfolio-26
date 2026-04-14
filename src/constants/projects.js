/**
 * Project data used across the 3D scene cards, helix project overlay, and menu.
 */

// Used by Scene.jsx for 3D card rendering
export const SCENE_PROJECTS = [
  {
    id: "nimbus",
    number: "01",
    title: "Nimbus",
    subtitle: "AI WEBSITE GENERATOR",
    tags: ["React", "Supabase", "Claude API"],
    year: "2025",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "xsbl",
    number: "02",
    title: "XSBL",
    subtitle: "WEB ACCESSIBILITY SUITE",
    tags: ["React", "AI", "Slack"],
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "nimbus-wms",
    number: "03",
    title: "Nimbus WMS",
    subtitle: "AI WAREHOUSE MANAGEMENT",
    tags: ["React", "Mobile", "AI"],
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=520&fit=crop&q=80",
  },
];

// Used by HelixProjects.jsx for the detail modal
export const HELIX_PROJECTS = [
  {
    id: "nimbus",
    number: "01",
    title: "Nimbus",
    subtitle: "AI Website Generator",
    tags: ["React", "Supabase", "Claude API"],
    year: "2025",
  },
  {
    id: "xsbl",
    number: "02",
    title: "XSBL",
    subtitle: "Web Accessibility Suite",
    tags: ["React", "AI", "Slack"],
    year: "2024",
  },
  {
    id: "nimbus-wms",
    number: "03",
    title: "Nimbus WMS",
    subtitle: "AI Warehouse Management",
    tags: ["React", "Mobile", "AI"],
    year: "2024",
  },
];

// Used by MenuOverlay.jsx Work section
export const MENU_PROJECTS = [
  {
    title: "Nimbus",
    desc: "Full-stack AI application that generates production-ready websites from plain-English prompts with real-time streaming, 60+ design options, and multi-format export",
    tech: "React · Supabase · Claude API · Stripe",
    year: "2025",
    featured: true,
    showcaseSection: 1,
    url: "https://nimbuswebsites.com",
  },
  {
    title: "XSBL",
    desc: "Web accessibility auditing and monitoring suite with AI analysis, Slack notifications, and email reporting",
    tech: "React · AI · Slack API",
    year: "2024",
    showcaseSection: 2,
    url: "https://xsbl.io",
  },
  {
    title: "Nimbus WMS",
    desc: "AI-powered inventory and warehouse management with web dashboard and native mobile apps for Android and iOS",
    tech: "React · React Native · AI/ML",
    year: "2024",
    showcaseSection: 3,
    url: "https://nimbus-landing.netlify.app",
  },
  {
    title: "Pillow",
    desc: "Neumorphism-style React component library with soft UI design system, customizable theming, and clean API",
    tech: "React · SCSS",
    year: "2023",
    showcaseSection: 4,
    url: "https://pillow-ui.netlify.app",
  },
  {
    title: "Halo",
    desc: "Creative coding — neon text around a 3D object with dynamic lighting in WebGL",
    tech: "Three.js · WebGL · GLSL",
    year: "2023",
    showcaseSection: 5,
    url: "https://halo-effect.netlify.app",
  },
];

export const SPECS = [
  "React & Next.js",
  "Three.js & WebGL",
  "AI & Agentic Dev",
  "TypeScript",
  "Performance",
  "GLSL Shaders",
  "Node.js & Python",
  "Creative Coding",
];

// Scene card layout constants
export const CARD_T = [0.125, 0.25, 0.375];
export const CARD_PHASE = [0, Math.PI * 1.5, Math.PI];
export const CARD_W_3D = 4.0;
export const CARD_H_3D = 2.4;
export const CARD_SEGS = 32;
