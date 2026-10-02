/**
 * Settings for the cube and the equalizer.
 */
export const config = {
  cube: {
    // ---- size and pose
    /** size relative to its spot in the layout */
    size: 0.97,
    /** resting turn and tilt (radians): which faces show */
    yaw: -0.61,
    pitch: 0.86,
    /** slow idle drift around the resting pose (0 = still) */
    sway: 2.25,
    /** how much it leans towards the pointer (it is heavy: a little goes a long way) */
    lean: 0.3,

    // ---- blocks
    /** the groove between blocks, as a share of a block */
    gap: 0.015,
    /** corner rounding, as a share of a block */
    rounding: 0.1,
    color: '#f7f4ef',
    roughness: 1,
    /** velvety highlight at grazing angles */
    sheen: 0,
    /** how deep the letters are pressed in, and how strongly their walls catch the light */
    letterDepth: 2,
    letterRelief: 0.5,
    /** how dark the joints between blocks are */
    groove: 0.1,

    // ---- light
    keyLight: 0.15,
    fillLight: 0.45,
    /** the two lights in the project's colours that orbit the cube, and their speed */
    tintLight: 0,
    tintOrbit: 0.1,
    /** while the cube is open, its centre glows in the project's colour this much (0 = not at all) */
    coreGlow: 1.85,
    /** and blooms: how much brighter than white the glowing sphere burns (only what is brighter than white
     *  blooms, so nothing else on the page does), how strongly it blooms, and how far the bloom spreads */
    coreHeat: 3,
    coreBloom: 1.5,
    coreBloomRadius: 0.84,

    // ---- spin: once it has landed it keeps turning
    /** how fast it is spinning as it lands (radians a second: the intro's turn carries on) */
    spinLanding: 0.12,
    /** the slow spin it settles to */
    spin: 0.1,
    /** how long its momentum takes to settle (after the landing, or a fling), seconds */
    momentum: 6.3,
    /** while it is parted (About, Contact, the chat, a project's case study) the cube stops and each
     *  block turns on its own instead, this fast (radians a second) */
    partSpin: 0.5,

    // ---- motion
    /** how far a hovered block (and its neighbours) lifts out */
    hoverPop: 0.31,
    /** turn one slice a full turn per project scrolled in the gallery */
    scrollSpin: true,
    /** how far the blocks part while About/Contact is open */
    open: 0.29,
    /** strongest blur of the tilt-shift lens, px */
    tiltShift: 26,
    /** how soft the whole cube goes behind a project's case study (Info), px */
    infoBlur: 16,

    // ---- the floor under the cube, and the shadow on it (from a light of its own)
    /** how dark the shadow is (0 = none), and its colour */
    shadow: 0.25,
    shadowColor: '#2a241e',
    /** how soft its edge is, and the detail it is drawn at (a smaller map blurs wider and softer) */
    shadowSoftness: 5,
    shadowMap: 256,
    /** how far below the cube the floor is, as a share of the cube's size */
    shadowDrop: 3,
    /** the floor's tilt on top of the cube's resting pitch (radians): more, and it is seen more from above */
    floorTilt: -0.1,
    /** where the shadow's light comes from: its direction around the cube (radians), and how slanted it is
     *  (0 = straight down, under the cube; more, a longer shadow falling further away) */
    shadowAngle: -3.14,
    shadowSlant: 0,
    /** while the cube is open, its glowing centre lights the floor under it in the project's colour */
    floorGlow: 0.8,

    // ---- the loading puzzle (applies on reload)
    /** quarter turns to undo while the page loads (0 = starts solved) */
    scramble: 8,
    /** seconds per turn, and the pause between turns */
    moveSeconds: 0.26,
    movePause: 0.06,

    // ---- the intro flight from the loader ring to its spot (applies on reload)
    flightSeconds: 2.8,
    /** how far it draws back into the scene on the way (its size at the deepest point: 1 - this) */
    flightDepth: 0.28,
    /** how far the path bows off a straight line (a parabola), as a share of the distance */
    flightBow: 0.09,
    /** full turns on the way */
    flightTurns: 1,
  },

  equalizer: {
    /** where it shows: with the gallery only, on every page, or nowhere */
    show: 'always' as 'home' | 'always' | 'never',
    /** the edge of the screen the bars come in from, or the middle of it ('center': the bars line up across
     *  the page and grow up and down from there at once, mirrored; on a phone they line up down the middle
     *  of the screen instead, top to bottom, and grow left and right) */
    edge: 'center' as 'right' | 'left' | 'top' | 'bottom' | 'center',
    /** how far in from the edge the longest bars reach, px (from the middle, each way) */
    reach: 115,
    /** how many bars along the edge (100+ for tiny cubes) */
    lines: 400,
    /** how many on a phone: far fewer, so its cubes are bigger */
    phoneLines: 120,
    /** the gap between cubes, as a share of the spacing */
    gap: 0,
    /** corner rounding of each cube, as a share of its size */
    rounding: 0.23,
    /** how much shorter the bars at the ends of the edge reach than the middle ones (a parabola) */
    taper: 0,
    /** how much smaller the cubes get by the far end (0.5 = half size) */
    shrink: 0.78,
    /** where along the reach the cubes start to fade and to blur (0 = at the edge, 1 = at the end) */
    fadeFrom: 0,
    blurFrom: 0.77,
    /** strongest blur at the far end, px */
    blur: 24,
    opacity: 0.2,

    // ---- depth: the band as a ring seen from inside it, its middle the furthest part
    /** how much nearer (bigger) its ends are than its middle (1 = flat) */
    depth: 2.4,
    /** how much fainter its far middle is, as if through a haze (0 = not at all, 1 = gone) */
    haze: 0.35,
    /** the ring seen from a little above, its nearer parts lower: how far its ends drop below its middle,
     *  px (0 = level; negative, seen from below, they rise). From the middle across the page only (not
     *  from an edge, nor down a phone's screen) */
    arch: 40,

    // ---- motion
    /** how full the bars run on average */
    energy: 0.2,
    /** how much the bars swell and ebb in slow waves */
    waves: 0.85,
    /** overall tempo */
    speed: 0.26,
    /** how often beats ripple through the bars, and how hard */
    beats: 3,
    beatStrength: 2.6,
    /** how much scrolling the gallery pumps them up */
    scrollPump: 0.8,
    /** how fast the bars jump up, and fall back */
    attack: 21,
    release: 14.4,
    /** how ragged the tips are (cubes dropping out near the end of a bar) */
    ragged: 0.15,
    /** a held peak cube past each bar, how long it holds and how fast it falls */
    peaks: true,
    peakHold: 0,
    peakFall: 200,

    // ---- colour (shades of the project in focus)
    /** lightness of the darkest and the lightest shade */
    deep: 0.3,
    light: 0.7,
    saturation: 1.63,
    /** hue shift of the sparkle shade */
    sparkle: 0.18,
  },
}
