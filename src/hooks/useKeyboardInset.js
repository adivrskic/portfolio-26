import { useEffect } from "react";

/**
 * Publishes the on-screen keyboard's height as `--kb-inset` on <html>.
 *
 * iOS Safari does not shrink the layout viewport when the keyboard opens, so
 * a `position: fixed; inset: 0` panel keeps its full height and its bottom-
 * anchored input ends up underneath the keyboard. visualViewport reports the
 * real visible area, so the difference is the keyboard height.
 *
 * Sets the value once on mount and clears it on unmount.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let raf = null;

    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        // Height lost to the keyboard, ignoring sub-pixel noise and any
        // offset from pinch-zoom scrolling
        const hidden = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop
        );
        root.style.setProperty("--kb-inset", `${hidden > 40 ? hidden : 0}px`);
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb-inset");
    };
  }, []);
}
