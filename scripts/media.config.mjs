// Which source images (assets-src/<slug>/) become frames on each project page, in order.
// `cover` is the index of the frame used on the carousel card. `crop` is { left, top, width, height } in px.
// `focus` is the object-position used where a frame is cropped (e.g. the carousel card): 'left top' keeps
// left-aligned headlines whole.
export default {
  plumeform: {
    cover: 0,
    frames: [
      { src: 'live-desktop.png', device: 'desktop', alt: 'Plumeform homepage' },
      { src: 'gallery-2-modes.png', device: 'desktop', alt: 'Plumeform: one question at a time or all at once' },
      { src: '01-survey-builder.png', device: 'desktop', alt: 'The survey builder' },
      { src: '02-response-dashboard.png', device: 'desktop', alt: 'Response dashboard' },
      { src: 'live-mobile.png', device: 'mobile', alt: 'Plumeform on a phone' },
      { src: 'gallery-3-research.png', device: 'desktop', alt: 'Research-grade data quality features' },
      { src: '07-story-editor.png', device: 'desktop', alt: 'Story editor' },
      { src: 'gallery-4-results.png', device: 'desktop', alt: 'Live results' },
    ],
  },
  nautilus: {
    cover: 0,
    frames: [
      { src: 'live-desktop.png', device: 'desktop', alt: 'Nautilus homepage', focus: 'left top' },
      { src: 'live-desktop-3.png', device: 'desktop', alt: 'Scan once, done' },
      { src: 'live-desktop-4.png', device: 'desktop', alt: 'Your floor, modeled' },
      { src: 'live-mobile.png', device: 'mobile', alt: 'Nautilus on a phone' },
      { src: 'live-desktop-5.png', device: 'desktop', alt: 'Ask in plain English' },
      { src: 'og.png', device: 'desktop', alt: 'Nautilus Inventory' },
    ],
  },
  nimbus: {
    cover: 0,
    frames: [
      { src: 'nimbus3.webp', device: 'desktop', alt: 'A generated site in the live preview' },
      { src: 'live-desktop.png', device: 'desktop', alt: 'Nimbus prompt screen' },
      { src: 'nimbus2.webp', device: 'desktop', alt: 'The customise panel' },
      { src: 'live-mobile.png', device: 'mobile', alt: 'Nimbus on a phone' },
      { src: 'live-desktop-2.png', device: 'desktop', alt: 'How Nimbus works' },
    ],
  },
  ljiljan: {
    cover: 0,
    frames: [
      { src: 'og.png', device: 'desktop', alt: 'Ljiljan: learn the language your family speaks' },
      { src: 'live-desktop.png', device: 'desktop', alt: 'Choosing why you are learning' },
      { src: 'live-mobile.png', device: 'mobile', alt: 'Ljiljan on a phone' },
      { src: 'mark.png', device: 'art', alt: 'The Ljiljan lily mark' },
    ],
  },
  xsbl: {
    cover: 0,
    frames: [
      { src: 'xsbl2.webp', device: 'desktop', alt: 'From scan to pull request', focus: 'left top' },
      { src: 'live-desktop.png', device: 'desktop', alt: 'XSBL homepage' },
      { src: 'xsbl3.webp', device: 'desktop', alt: 'The XSBL dashboard' },
      { src: 'live-mobile.png', device: 'mobile', alt: 'XSBL on a phone' },
      { src: 'live-desktop-2.png', device: 'desktop', alt: 'Overlays do not work' },
    ],
  },
  keyfall: {
    cover: 0,
    frames: [
      { src: 'roll.png', device: 'desktop', alt: 'Notes falling onto an 88-key keyboard' },
      { src: 'roll-close.png', device: 'art', alt: 'Falling notes, close up' },
      { src: 'roll-tall.png', device: 'mobile', alt: 'Keyfall on an iPad-sized screen' },
    ],
  },
  halo: {
    cover: 0,
    frames: [
      { src: 'live-desktop-2.png', device: 'desktop', alt: 'Neon type orbiting a golden bust' },
      { src: 'halo3.webp', device: 'desktop', alt: 'Halo with its live controls' },
      { src: 'live-mobile.png', device: 'mobile', alt: 'Halo on a phone' },
    ],
  },
  afs: {
    cover: 0,
    frames: [
      { src: 'live-desktop.png', device: 'desktop', alt: 'American Flooring Services homepage', focus: 'left top' },
      { src: 'afs-3.png', device: 'desktop', alt: 'Interactive map of states served' },
      { src: 'afs-4.png', device: 'mobile', alt: 'The state map on a phone' },
      { src: 'afs-1.png', device: 'desktop', alt: 'Brand partners and company figures' },
      { src: 'live-desktop-2.png', device: 'desktop', alt: 'The American Flooring advantage' },
    ],
  },
}
