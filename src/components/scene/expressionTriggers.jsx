/**
 * expressionTriggers.js
 *
 * Updates the expression state object each frame based on user interaction.
 * Called from the animation loop in Scene.jsx.
 *
 * Returns { anyActive } so Scene can reset blink timer during expressions.
 */

export function createExpressionState() {
  return {
    hoverOnCubeTime: 0,
    closeHoverTime: 0, // BUG5 FIX: separate timer for shy (close proximity)
    firstClickFired: false,
    scrollDirChanges: 0,
    lastScrollDir: 0,
    scrollDirResetTimer: 0,
    prevSeason: null,
    prevShowcaseOpen: false,
    lastExpressionTime: 0, // BUG4 FIX: tracks when last expression was active
  };
}

export function updateExpressions(expr, ts, ctx) {
  const {
    dt,
    cubeProx,
    isHolding,
    chatMode,
    activeSeason,
    angVelY,
    showcaseOpen,
    now, // performance.now() passed from Scene
  } = ctx;

  const DECAY = dt * 0.5;

  // ── Curious: mouse near cube (1-3s hover, then fades) ──
  if (cubeProx > 0.3 && !isHolding && !chatMode) {
    ts.hoverOnCubeTime += dt;
    if (ts.hoverOnCubeTime > 1 && ts.hoverOnCubeTime < 3) {
      expr.curious = Math.min(1, expr.curious + dt * 2);
    } else if (ts.hoverOnCubeTime >= 3) {
      expr.curious = Math.max(0, expr.curious - dt * 1.5);
    }
  } else {
    ts.hoverOnCubeTime = 0;
    expr.curious = Math.max(0, expr.curious - dt * 1.5);
  }

  // ── Shy: mouse very close for 3+ seconds ──
  // BUG5 FIX: separate closeHoverTime resets when proximity drops below 0.7
  if (cubeProx > 0.7 && !isHolding && !chatMode) {
    ts.closeHoverTime += dt;
    if (ts.closeHoverTime > 3) {
      expr.shy = Math.min(1, expr.shy + dt * 1.2);
      expr.curious = Math.max(0, expr.curious - dt * 3);
    }
  } else {
    ts.closeHoverTime = 0; // resets independently of hoverOnCubeTime
    expr.shy = Math.max(0, expr.shy - DECAY);
  }

  // ── Startled: set externally in onDown, just decay here ──
  // BUG3 FIX: suppress startled when showcase is open (scZoom handles it)
  if (showcaseOpen) {
    expr.startled = Math.max(0, expr.startled - dt * 3); // fast decay if showcase open
  } else {
    expr.startled = Math.max(0, expr.startled - dt * 0.8);
  }

  // ── Wink: theme changes to gold ──
  if (activeSeason !== ts.prevSeason) {
    if (activeSeason === "gold") expr.wink = 1;
    ts.prevSeason = activeSeason;
  }
  expr.wink = Math.max(0, expr.wink - dt * 0.4);

  // ── Cheeky: rapid angular velocity direction changes ──
  // BUG2 FIX: lower threshold (0.04 from 0.1), require 3 changes (from 4)
  const curDir = angVelY > 0.04 ? 1 : angVelY < -0.04 ? -1 : 0;
  if (curDir !== 0 && curDir !== ts.lastScrollDir && ts.lastScrollDir !== 0) {
    ts.scrollDirChanges++;
  }
  ts.lastScrollDir = curDir || ts.lastScrollDir;
  ts.scrollDirResetTimer += dt;
  if (ts.scrollDirResetTimer > 2) {
    ts.scrollDirChanges = Math.max(0, ts.scrollDirChanges - 1);
    ts.scrollDirResetTimer = 0;
  }
  if (ts.scrollDirChanges >= 3) {
    expr.cheeky = Math.min(1, expr.cheeky + dt * 2);
  } else {
    expr.cheeky = Math.max(0, expr.cheeky - DECAY);
  }

  // ── Proud: showcase just closed ──
  if (!showcaseOpen && ts.prevShowcaseOpen) {
    expr.proud = 1;
  }
  ts.prevShowcaseOpen = showcaseOpen;
  expr.proud = Math.max(0, expr.proud - dt * 0.25);

  // ── Love: set externally via event, just decay ──
  expr.love = Math.max(0, expr.love - dt * 0.3);

  // ── Phew: birth complete, just decay ──
  expr.phew = Math.max(0, expr.phew - dt * 0.25);

  // BUG1+4 FIX: track whether any expression is active
  const anyActive =
    expr.curious > 0.3 ||
    expr.shy > 0.3 ||
    expr.startled > 0.3 ||
    expr.wink > 0.3 ||
    expr.cheeky > 0.3 ||
    expr.proud > 0.3 ||
    expr.love > 0.3 ||
    expr.phew > 0.3;

  // BUG4 FIX: track last time an expression was active (used by Scene to delay sleep)
  if (anyActive) {
    ts.lastExpressionTime = now || performance.now();
  }

  return { anyActive };
}
