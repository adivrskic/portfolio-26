/**
 * expressionTriggers.js
 *
 * Updates the expression state object each frame based on user interaction.
 * Called from the animation loop in Scene.jsx.
 *
 * Returns { anyActive, dominant } so Scene can manage blinks and blending.
 */

// #G — Weighted expression priority: higher weight wins ties
export const EXPR_WEIGHTS = {
  love: 10,
  startled: 9,
  shy: 8,
  cheeky: 7,
  proud: 6,
  wink: 5,
  phew: 4,
  curious: 3,
};

export function createExpressionState() {
  return {
    hoverOnCubeTime: 0,
    closeHoverTime: 0,
    firstClickFired: false,
    scrollDirChanges: 0,
    lastScrollDir: 0,
    scrollDirResetTimer: 0,
    prevSeason: null,
    prevShowcaseOpen: false,
    lastExpressionTime: 0,
    // #J — Idle micro-expression state
    idleTime: 0, // running clock for noise
    eyeDriftX: 0,
    eyeDriftY: 0,
    mouthVar: 0,
    // #K — Smoothed look-at
    smoothLookX: 0,
    smoothLookY: 0,
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
    now,
    lookX,
    lookY,
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
  if (cubeProx > 0.7 && !isHolding && !chatMode) {
    ts.closeHoverTime += dt;
    if (ts.closeHoverTime > 3) {
      expr.shy = Math.min(1, expr.shy + dt * 1.2);
      expr.curious = Math.max(0, expr.curious - dt * 3);
    }
  } else {
    ts.closeHoverTime = 0;
    expr.shy = Math.max(0, expr.shy - DECAY);
  }

  // ── Startled: set externally in onDown, just decay here ──
  if (showcaseOpen) {
    expr.startled = Math.max(0, expr.startled - dt * 3);
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

  // #G — Weighted dominant expression
  let dominantName = null;
  let dominantScore = 0;
  for (const name in EXPR_WEIGHTS) {
    const score = (expr[name] || 0) * EXPR_WEIGHTS[name];
    if (score > dominantScore) {
      dominantScore = score;
      dominantName = name;
    }
  }
  const dominantValue = dominantName ? expr[dominantName] : 0;

  const anyActive = dominantValue > 0.1;

  if (anyActive) {
    ts.lastExpressionTime = now || performance.now();
  }

  // #J — Idle micro-expressions: gentle drift when no expression active
  ts.idleTime += dt;
  if (!anyActive) {
    // Smooth random eye drift (2-3 second period)
    ts.eyeDriftX +=
      (Math.sin(ts.idleTime * 0.7) * 2.5 - ts.eyeDriftX) * dt * 1.5;
    ts.eyeDriftY +=
      (Math.sin(ts.idleTime * 0.5 + 1.7) * 1.5 - ts.eyeDriftY) * dt * 1.5;
    // Subtle mouth curvature oscillation
    ts.mouthVar +=
      (Math.sin(ts.idleTime * 0.3 + 3.1) * 0.3 - ts.mouthVar) * dt * 1.2;
  } else {
    // Decay idle offsets when expression is active
    ts.eyeDriftX *= Math.max(0, 1 - dt * 4);
    ts.eyeDriftY *= Math.max(0, 1 - dt * 4);
    ts.mouthVar *= Math.max(0, 1 - dt * 4);
  }

  // #K — Look-at easing: spring toward mouse with slight lag
  const lx = lookX || 0;
  const ly = lookY || 0;
  ts.smoothLookX += (lx - ts.smoothLookX) * Math.min(1, dt * 6);
  ts.smoothLookY += (ly - ts.smoothLookY) * Math.min(1, dt * 6);

  return {
    anyActive,
    dominant: dominantName,
    dominantValue,
  };
}
