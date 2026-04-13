/**
 * checkerTransition.js
 *
 * Checkerboard tile transition applied INSIDE a panel container.
 * The panel's own overflow:hidden + border-radius clips the tiles
 * to the panel's shape — no fullscreen overlay.
 *
 * Tiles can be solid-colored or frosted glass (backdrop-filter).
 *
 * checkerReveal   — tiles scale 0→1 inside the container
 * checkerDissolve — tiles scale 1→0 inside the container
 */

const COLS = 10;
const ROWS = 8;

// Pre-compute radial delays (normalized 0–1, center-out)
const DELAYS = (() => {
  const cx = COLS / 2;
  const cy = ROWS / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const d = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      d.push(Math.sqrt((c - cx) ** 2 + (r - cy) ** 2) / maxR);
  return d;
})();

function createGrid(color, blur) {
  const grid = document.createElement("div");
  grid.style.cssText =
    "position:absolute;inset:0;z-index:0;display:grid;pointer-events:none;" +
    `grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr);`;

  const blurCSS = blur
    ? `backdrop-filter:blur(${blur}px) saturate(1.15);-webkit-backdrop-filter:blur(${blur}px) saturate(1.15);`
    : "";

  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement("div");
    cell.style.cssText =
      `background:${color};${blurCSS}` +
      "transition:transform 0.5s cubic-bezier(0.25,0,0.2,1);";
    grid.appendChild(cell);
    cells.push(cell);
  }
  return { grid, cells };
}

/**
 * Tiles grow from center out inside the container.
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string} opts.color       - tile background (use semi-transparent for glass)
 * @param {number} [opts.blur]      - backdrop blur in px (omit for solid tiles)
 * @param {number} [opts.maxDelay]  - max stagger in ms (default 400)
 * @param {Function} [opts.onComplete]
 * @returns {{ cleanup: Function }}
 */
export function checkerReveal(
  container,
  { color, blur, maxDelay = 400, onComplete }
) {
  const { grid, cells } = createGrid(color, blur);

  cells.forEach((c) => (c.style.transform = "scale(0)"));
  container.appendChild(grid);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (let i = 0; i < cells.length; i++) {
        cells[i].style.transitionDelay = DELAYS[i] * maxDelay + "ms";
        cells[i].style.transform = "scale(1)";
      }
    });
  });

  const totalDuration = maxDelay + 500;
  let timer = setTimeout(() => {
    if (onComplete) onComplete();
  }, totalDuration);

  function cleanup() {
    clearTimeout(timer);
    if (grid.parentNode) grid.remove();
  }

  return { cleanup, grid };
}

/**
 * Tiles shrink edges-inward inside the container.
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string} opts.color
 * @param {number} [opts.blur]
 * @param {number} [opts.maxDelay]
 * @param {Function} [opts.onComplete]
 * @returns {{ cleanup: Function }}
 */
export function checkerDissolve(
  container,
  { color, blur, maxDelay = 400, onComplete }
) {
  const { grid, cells } = createGrid(color, blur);

  cells.forEach((c) => (c.style.transform = "scale(1)"));
  container.appendChild(grid);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (let i = 0; i < cells.length; i++) {
        cells[i].style.transitionDelay = (1 - DELAYS[i]) * maxDelay + "ms";
        cells[i].style.transform = "scale(0)";
      }
    });
  });

  const totalDuration = maxDelay + 500;
  let timer = setTimeout(() => {
    if (grid.parentNode) grid.remove();
    if (onComplete) onComplete();
  }, totalDuration);

  function cleanup() {
    clearTimeout(timer);
    if (grid.parentNode) grid.remove();
  }

  return { cleanup, grid };
}
