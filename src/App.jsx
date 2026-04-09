import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULTS, getCurrentSeason } from "./config/defaults";
import GradientBackground from "./components/gradient/GradientBackground";
import Scene from "./components/scene/Scene";
import Reticle from "./components/reticle/Reticle";
import TextOverlay from "./components/text/TextOverlay";
import MenuOverlay from "./components/menu/MenuOverlay";
import ChatPanel from "./components/chat/ChatPanel";
import DebugPanel from "./components/debug/DebugPanel";
import ShowcaseCanvas from "./components/showcase/ShowcaseCanvas";
import ShowcaseHTML from "./components/showcase/Showcase";
import "./App.css";

const IS_MOBILE =
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || "ontouchstart" in window);
const Showcase = IS_MOBILE ? ShowcaseHTML : ShowcaseCanvas;

export default function App() {
  const [config, setConfig] = useState({ ...DEFAULTS });
  const [debugVisible, setDebugVisible] = useState(false);
  const [birthComplete, setBirthComplete] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);
  const [cubeProximity, setCubeProximity] = useState(0);
  const [gradCanvas, setGradCanvas] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(getCurrentSeason);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [showcaseTransition, setShowcaseTransition] = useState(false);
  const configRef = useRef(config);

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
      setChatMode(true);
      setChatMounted(true);
    }
  }, [chatMode]);

  const handleCubeShowcase = useCallback(() => {
    setShowcaseTransition(true);
    setTimeout(() => {
      setShowcaseOpen(true);
      setShowcaseTransition(false);
    }, 2200);
  }, []);

  const handleCloseShowcase = useCallback(() => {
    setShowcaseOpen(false);
  }, []);

  const handleCubeProximity = useCallback((p) => setCubeProximity(p), []);

  const handleCloseChat = useCallback(() => {
    setChatMode(false);
    setTimeout(() => setChatMounted(false), 1400);
  }, []);

  const fading = showcaseTransition || showcaseOpen;

  return (
    <div className="app-root hide-cursor">
      <Showcase open={showcaseOpen} onClose={handleCloseShowcase} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          transform: showcaseOpen ? "translateY(-100vh)" : "translateY(0)",
          transition: showcaseOpen
            ? "transform 1.4s cubic-bezier(0.45, 0, 0.15, 1)"
            : "transform 1.4s cubic-bezier(0.45, 0, 0.15, 1) 0.3s",
          pointerEvents: fading ? "none" : "auto",
          willChange: "transform",
        }}
      >
        <div
          style={{
            opacity: fading ? 0 : 1,
            transition: "opacity 1.8s ease",
            pointerEvents: fading ? "none" : "auto",
          }}
        >
          <GradientBackground
            config={config}
            onCanvasReady={handleCanvasReady}
            active={birthComplete}
          />
          {!chatMode && (
            <TextOverlay
              config={config}
              birthComplete={birthComplete}
              fadeFactor={1}
              gradientCanvas={gradCanvas}
              menuOpen={menuOpen}
              onMenuToggle={() => setMenuOpen((v) => !v)}
            />
          )}
          <Reticle
            proximity={cubeProximity}
            chatMode={chatMode}
            menuOpen={menuOpen}
            config={config}
            gradientCanvas={gradCanvas}
            scrollProgress={0}
          />
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
        onClose={() => setMenuOpen(false)}
        config={config}
        onThemeChange={handleThemeChange}
        activeSeason={activeSeason}
        goldUnlocked={true}
        onShowcase={() => {
          setMenuOpen(false);
          setTimeout(() => handleCubeShowcase(), 600);
        }}
      />
      <DebugPanel
        config={config}
        setConfig={setConfig}
        visible={debugVisible}
        setVisible={setDebugVisible}
      />
    </div>
  );
}
