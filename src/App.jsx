import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULTS, getCurrentSeason } from "./config/defaults";
// import { useIsMobile } from "./hooks/useIsMobile"; // uncomment when ShowcaseHTML exists
import GradientBackground from "./components/gradient/GradientBackground";
import Scene from "./components/scene/Scene";
import Reticle from "./components/reticle/Reticle";
import TextOverlay from "./components/text/TextOverlay";
import MenuOverlay from "./components/menu/MenuOverlay";
import ChatPanel from "./components/chat/ChatPanel";
import DebugPanel from "./components/debug/DebugPanel";
import ShowcaseCanvas from "./components/showcase/ShowcaseCanvas";
import PrintContent from "./components/print/PrintContent";
import "./App.css";

export default function App() {
  // const isMobile = useIsMobile(768); // uncomment when ShowcaseHTML exists
  // TODO: create ShowcaseHTML for a lightweight mobile fallback
  const Showcase = ShowcaseCanvas;
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
  const showcaseEverTriggered = useRef(false);
  const [showcaseInitSection, setShowcaseInitSection] = useState(0);
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

  const handleCubeShowcase = useCallback((section) => {
    showcaseEverTriggered.current = true;
    setShowcaseInitSection(section || 0);
    setShowcaseTransition(true);
    setTimeout(() => {
      setShowcaseOpen(true);
      setShowcaseTransition(false);
    }, 3200);
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
    <div className={`app-root${chatMode ? "" : " hide-cursor"}`}>
      <Showcase
        open={showcaseOpen}
        onClose={handleCloseShowcase}
        config={config}
        initialSection={showcaseInitSection}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: fading ? "none" : "auto",
        }}
      >
        <div
          style={{
            opacity: fading ? 0 : 1,
            transition: fading ? "opacity 1.2s ease" : "none",
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
            showcaseTriggered={showcaseEverTriggered.current}
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
        onShowcase={(section) => {
          setMenuOpen(false);
          setTimeout(() => handleCubeShowcase(section), 600);
        }}
      />
      <DebugPanel
        config={config}
        setConfig={setConfig}
        visible={debugVisible}
        setVisible={setDebugVisible}
      />
      <PrintContent />
    </div>
  );
}
