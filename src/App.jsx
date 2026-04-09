import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULTS, getCurrentSeason } from "./config/defaults";
import GradientBackground from "./components/gradient/GradientBackground";
import Scene from "./components/scene/Scene";
import Reticle from "./components/reticle/Reticle";
import HelixProjects from "./components/projects/HelixProjects";
import TextOverlay from "./components/text/TextOverlay";
import MenuOverlay from "./components/menu/MenuOverlay";
import ChatPanel from "./components/chat/ChatPanel";
import DebugPanel from "./components/debug/DebugPanel";
import Footer from "./components/footer/Footer";
import Showcase from "./components/showcase/ShowcaseCanvas";
import "./App.css";

export default function App() {
  const [config, setConfig] = useState({ ...DEFAULTS });
  const [debugVisible, setDebugVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [birthComplete, setBirthComplete] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);
  const [cubeProximity, setCubeProximity] = useState(0);
  const [gradCanvas, setGradCanvas] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helixProgress, setHelixProgress] = useState(0);
  const [shatterProg, setShatterProg] = useState(0);
  const [goldUnlocked, setGoldUnlocked] = useState(true);
  const [activeProject, setActiveProject] = useState(null);
  const helixStateRef = useRef(null);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const prevShatterRef = useRef(0);
  const [activeSeason, setActiveSeason] = useState(getCurrentSeason);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [showcaseTransition, setShowcaseTransition] = useState(false);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const handleScroll = useCallback((p) => setScrollProgress(p), []);

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
    // Phase 1: transition — cube zooms, main fades
    setShowcaseTransition(true);
    // Phase 2: after animation, open showcase
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

  const handleGoldUnlock = useCallback(() => {
    setGoldUnlocked(true);
    setConfig((prev) => ({
      ...prev,
      gradColor1: "#b8860b",
      gradColor2: "#ffd700",
      gradColor3: "#daa520",
      gradColor4: "#cd853f",
    }));
    setActiveSeason("gold");
  }, []);

  const fading = showcaseTransition || showcaseOpen;

  return (
    <div className="app-root hide-cursor">
      {/* Showcase sits behind everything — revealed when main content slides away */}
      <Showcase open={showcaseOpen} onClose={handleCloseShowcase} />

      {/* Main content wrapper — slides up only after showcase fully opens */}
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
        {/* UI layer — fades out in sync with the cube expanding */}
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
              fadeFactor={Math.max(
                0,
                1 - scrollProgress / (config.shatterThreshold || 0.15)
              )}
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
            scrollProgress={scrollProgress}
          />
          <HelixProjects
            shatterProgress={shatterProg}
            activeProject={activeProject}
            setActiveProject={setActiveProject}
          />
          <Footer
            helixProgress={helixProgress}
            shatterProgress={shatterProg}
            onGoldUnlock={handleGoldUnlock}
            goldUnlocked={goldUnlocked}
          />
          {chatMounted && (
            <ChatPanel
              open={chatMode}
              onClose={handleCloseChat}
              activeSeason={activeSeason}
            />
          )}
        </div>
        {/* Scene (3D canvas with cube) — stays visible during zoom, slides with wrapper */}
        <Scene
          configRef={configRef}
          onScrollProgress={handleScroll}
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
          onCardClick={useCallback((id) => setActiveProject(id), [])}
          onHelixProgress={useCallback((hp, sp, hs) => {
            setHelixProgress(hp);
            setShatterProg(sp);
            if (hs) helixStateRef.current = hs;
            prevShatterRef.current = sp;
          }, [])}
        />
      </div>

      {/* These overlay everything — always on top */}
      <MenuOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        config={config}
        onThemeChange={handleThemeChange}
        activeSeason={activeSeason}
        goldUnlocked={goldUnlocked}
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
