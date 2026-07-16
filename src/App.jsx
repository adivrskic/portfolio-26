import {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { DEFAULTS, getCurrentSeason } from "./config/defaults";
import GradientBackground from "./components/gradient/GradientBackground";
import Scene from "./components/scene/Scene";
import Reticle from "./components/reticle/Reticle";
import TextOverlay from "./components/text/TextOverlay";
import MenuOverlay from "./components/menu/MenuOverlay";
import ChatPanel from "./components/chat/ChatPanel";
import ShowcaseHTML from "./components/showcase/ShowcaseHTML";
import PrintContent from "./components/print/PrintContent";
import "./App.css";

// Dev-only: ~1,100 lines of debug UI stripped from production bundle
const DebugPanel = import.meta.env.DEV
  ? lazy(() => import("./components/debug/DebugPanel"))
  : null;

export default function App() {
  // const isMobile = useIsMobile(768); // uncomment when ShowcaseHTML exists
  const [config, setConfig] = useState({ ...DEFAULTS });
  const [debugVisible, setDebugVisible] = useState(false);
  const [birthComplete, setBirthComplete] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);
  const cubeProximityRef = useRef(0);
  const [gradCanvas, setGradCanvas] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(getCurrentSeason);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [showcaseTransition, setShowcaseTransition] = useState(false);
  const [showcaseMounted, setShowcaseMounted] = useState(false);
  const showcaseEverTriggered = useRef(false);
  const [showcaseInitSection, setShowcaseInitSection] = useState(0);
  const showcaseUnmountTimer = useRef(null);
  const showcaseOpenTimer = useRef(null);
  const chatUnmountTimer = useRef(null);
  const menuShowcaseTimer = useRef(null);
  const configRef = useRef(config);

  // Clear any pending transition timers if the app unmounts mid-animation
  useEffect(() => {
    return () => {
      [
        showcaseUnmountTimer,
        showcaseOpenTimer,
        chatUnmountTimer,
        menuShowcaseTimer,
      ].forEach((t) => {
        if (t.current) clearTimeout(t.current);
      });
    };
  }, []);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const handleBirth = useCallback(
    (p) => {
      if (p >= (configRef.current.birthTextAt || 0.99) && !birthComplete)
        setBirthComplete(true);
    },
    [birthComplete]
  );

  const handleCanvasReady = useCallback((canvas) => setGradCanvas(canvas), []);

  const handleThemeChange = useCallback((colors, seasonId) => {
    setConfig((prev) => ({ ...prev, ...colors }));
    if (seasonId) setActiveSeason(seasonId);
  }, []);

  const handleCubeClick = useCallback(() => {
    if (!chatMode) {
      // Cancel a pending close-unmount so reopening within 1.4s of closing
      // doesn't unmount the freshly opened chat
      if (chatUnmountTimer.current) {
        clearTimeout(chatUnmountTimer.current);
        chatUnmountTimer.current = null;
      }
      setChatMode(true);
      setChatMounted(true);
    }
  }, [chatMode]);

  const handleCubeShowcase = useCallback((section) => {
    showcaseEverTriggered.current = true;
    setShowcaseInitSection(section || 0);
    // Mount immediately — chunk starts loading during the 3.2s transition
    if (showcaseUnmountTimer.current) {
      clearTimeout(showcaseUnmountTimer.current);
      showcaseUnmountTimer.current = null;
    }
    setShowcaseMounted(true);
    setShowcaseTransition(true);
    if (showcaseOpenTimer.current) clearTimeout(showcaseOpenTimer.current);
    showcaseOpenTimer.current = setTimeout(() => {
      showcaseOpenTimer.current = null;
      setShowcaseOpen(true);
      setShowcaseTransition(false);
    }, 3200);
  }, []);

  const handleCloseShowcase = useCallback(() => {
    if (showcaseOpenTimer.current) {
      clearTimeout(showcaseOpenTimer.current);
      showcaseOpenTimer.current = null;
      setShowcaseTransition(false);
    }
    setShowcaseOpen(false);
    // Keep mounted for 2.5s so the checker-grid close animation can finish
    showcaseUnmountTimer.current = setTimeout(() => {
      setShowcaseMounted(false);
      showcaseUnmountTimer.current = null;
    }, 2500);
  }, []);

  const handleCubeProximity = useCallback((p) => {
    cubeProximityRef.current = p;
  }, []);

  const handleCloseChat = useCallback(() => {
    setChatMode(false);
    if (chatUnmountTimer.current) clearTimeout(chatUnmountTimer.current);
    chatUnmountTimer.current = setTimeout(() => {
      chatUnmountTimer.current = null;
      setChatMounted(false);
    }, 1400);
  }, []);

  const handleMenuToggle = useCallback(() => setMenuOpen((v) => !v), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);
  const handleMenuShowcase = useCallback(
    (section) => {
      setMenuOpen(false);
      if (menuShowcaseTimer.current) clearTimeout(menuShowcaseTimer.current);
      menuShowcaseTimer.current = setTimeout(() => {
        menuShowcaseTimer.current = null;
        handleCubeShowcase(section);
      }, 600);
    },
    [handleCubeShowcase]
  );

  const fading = showcaseTransition || showcaseOpen;

  return (
    <div className={`app-root${chatMode ? "" : " hide-cursor"}`}>
      {showcaseMounted && (
        <ShowcaseHTML
          open={showcaseOpen}
          onClose={handleCloseShowcase}
          config={config}
          initialSection={showcaseInitSection}
        />
      )}

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: fading ? "none" : "auto",
        }}
      >
        {/* Gradient + reticle stay live behind the showcase's frosted glass */}
        <GradientBackground
          config={config}
          onCanvasReady={handleCanvasReady}
          active={birthComplete}
        />
        <Reticle
          proximityRef={cubeProximityRef}
          chatMode={chatMode}
          menuOpen={menuOpen}
          config={config}
          gradientCanvas={gradCanvas}
          scrollProgress={0}
          showcaseTriggered={showcaseEverTriggered.current}
        />
        <div
          style={{
            opacity: fading ? 0 : 1,
            transition: fading ? "opacity 1.2s ease" : "none",
            pointerEvents: fading ? "none" : "auto",
          }}
        >
          {!chatMode && (
            <TextOverlay
              config={config}
              birthComplete={birthComplete}
              fadeFactor={1}
              gradientCanvas={gradCanvas}
              menuOpen={menuOpen}
              onMenuToggle={handleMenuToggle}
            />
          )}
          {chatMounted && (
            <ChatPanel
              open={chatMode}
              onClose={handleCloseChat}
              activeSeason={activeSeason}
            />
          )}
        </div>
        <Scene
          configRef={configRef}
          onBirthProgress={handleBirth}
          gradientCanvas={gradCanvas}
          menuOpen={menuOpen}
          chatMode={chatMode}
          showcaseTransition={showcaseTransition}
          showcaseOpen={showcaseOpen}
          activeSeason={activeSeason}
          onCubeClick={handleCubeClick}
          onCubeHold={handleCubeShowcase}
          onCubeProximity={handleCubeProximity}
        />
      </div>

      <MenuOverlay
        open={menuOpen}
        onClose={handleMenuClose}
        config={config}
        onThemeChange={handleThemeChange}
        activeSeason={activeSeason}
        onShowcase={handleMenuShowcase}
      />
      {/* {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel
            config={config}
            setConfig={setConfig}
            visible={debugVisible}
            setVisible={setDebugVisible}
          />
        </Suspense>
      )} */}
      <PrintContent />
    </div>
  );
}
