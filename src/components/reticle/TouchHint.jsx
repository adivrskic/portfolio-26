import { useEffect, useRef, useState } from "react";
import { IS_TOUCH } from "../../utils/device";
import "./TouchHint.css";

const SEEN_KEY = "av-touch-hint-seen";

/**
 * Touch-device counterpart to the cursor Reticle's hint pills.
 *
 * The Reticle returns null on touch, so without this a phone visitor sees a
 * floating blob with no indication that it is interactive at all.
 *
 * Renders a soft pulsing ring around the blob plus two labels in the site's
 * uppercase letterspaced style. Dismisses on first interaction and is
 * remembered for the session. Label copy follows the press flags so it stays
 * truthful if tap-to-chat / hold-to-explore are switched back on.
 */
export default function TouchHint({
  birthComplete,
  hidden,
  onDismiss,
  tapOpensChat = false,
  holdOpensShowcase = false,
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const timerRef = useRef(null);

  // Fade in shortly after the blob has settled
  useEffect(() => {
    if (!IS_TOUCH || !birthComplete || dismissed) return;
    timerRef.current = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(timerRef.current);
  }, [birthComplete, dismissed]);

  // Any touch on the blob dismisses it for the session
  useEffect(() => {
    if (!IS_TOUCH || dismissed || !visible) return;
    const dismiss = () => {
      setVisible(false);
      setDismissed(true);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      if (onDismiss) onDismiss();
    };
    window.addEventListener("touchstart", dismiss, { once: true, passive: true });
    // Safety net: never nag for more than 12s
    const t = setTimeout(dismiss, 12000);
    return () => {
      window.removeEventListener("touchstart", dismiss);
      clearTimeout(t);
    };
  }, [dismissed, visible, onDismiss]);

  if (!IS_TOUCH || dismissed) return null;

  const show = visible && !hidden;

  return (
    <div className={`touch-hint ${show ? "touch-hint--visible" : ""}`}>
      <div className="touch-hint__ring" aria-hidden="true" />
      <div className="touch-hint__labels">
        <span className="touch-hint__label">
          {tapOpensChat ? "Tap to chat" : "Tap to poke"}
        </span>
        <span className="touch-hint__sep" aria-hidden="true" />
        <span className="touch-hint__label">
          {holdOpensShowcase ? "Hold to explore" : "Hold to squish"}
        </span>
      </div>
    </div>
  );
}
