/**
 * Project data used across the 3D scene cards, helix project overlay, and menu.
 */

// Used by Scene.jsx for 3D card rendering
export const SCENE_PROJECTS = [
  {
    id: "nimbus",
    number: "01",
    title: "Nimbus",
    subtitle: "WAREHOUSE INTELLIGENCE",
    tags: ["React", "Three.js", "AI/ML"],
    year: "2025",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "meridian",
    number: "02",
    title: "Meridian",
    subtitle: "GENERATIVE DESIGN TOOL",
    tags: ["WebGL", "WASM", "Node"],
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&h=520&fit=crop&q=80",
  },
  {
    id: "pulse",
    number: "03",
    title: "Pulse",
    subtitle: "HEALTH DATA PLATFORM",
    tags: ["React Native", "D3", "FHIR"],
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
    subtitle: "Warehouse Intelligence",
    tags: ["React", "Three.js", "AI/ML"],
    year: "2025",
  },
  {
    id: "meridian",
    number: "02",
    title: "Meridian",
    subtitle: "Generative Design Tool",
    tags: ["WebGL", "WASM", "Node"],
    year: "2024",
  },
  {
    id: "pulse",
    number: "03",
    title: "Pulse",
    subtitle: "Health Data Platform",
    tags: ["React Native", "D3", "FHIR"],
    year: "2024",
  },
];

// Used by MenuOverlay.jsx Work section
export const MENU_PROJECTS = [
  {
    title: "Neural Terrain",
    desc: "Generative landscapes driven by neural networks and real-time audio reactive visuals",
    tech: "Three.js · TensorFlow.js",
    year: "2024",
    featured: true,
  },
  {
    title: "Liquid Interface",
    desc: "GPU-accelerated fluid simulation UI for a Series B fintech platform",
    tech: "WebGL · React",
    year: "2024",
  },
  {
    title: "Particle Commerce",
    desc: "Product configurator rendering 100k+ instanced particles at 60fps",
    tech: "Three.js · GLSL",
    year: "2023",
  },
  {
    title: "Synth Garden",
    desc: "Audiovisual installation combining Web Audio with procedural organic growth",
    tech: "Web Audio · Canvas",
    year: "2023",
  },
  {
    title: "Void Protocol",
    desc: "Creative coding toolkit for generative identity systems",
    tech: "Node.js · SVG",
    year: "2022",
  },
  {
    title: "Chromatic Drift",
    desc: "Real-time color grading engine with ML-driven palette extraction",
    tech: "WebGL · Python",
    year: "2022",
  },
];

export const SPECS = [
  "3D & WebGL",
  "Interaction Design",
  "AI Integration",
  "React & Next.js",
  "GLSL Shaders",
  "Generative Systems",
  "Spatial Interfaces",
  "Creative Engineering",
];

// Scene card layout constants
export const CARD_T = [0.125, 0.25, 0.375];
export const CARD_PHASE = [0, Math.PI * 1.5, Math.PI];
export const CARD_W_3D = 4.0;
export const CARD_H_3D = 2.4;
export const CARD_SEGS = 32;
