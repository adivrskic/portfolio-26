import { useState, useRef, useEffect, useCallback } from "react";
import { FONT_FAMILY } from "../../constants/style";
import { SEASON_META } from "../../constants/themes";
import { splitIntoLines } from "../../utils/text";
import AmbientLine from "./AmbientLine";
import UserPill from "./UserPill";
import { TypingIndicator, SuggestionPill } from "./ChatWidgets";

const F = FONT_FAMILY;

// ── Personal context for the AI ──
// Paste your real info here — the more detail, the better the AI answers.
// This is sent as the system prompt with every message.
const PERSONAL_CONTEXT = `
You are a friendly, concise AI assistant on Adi Vrskic's portfolio website.
Keep answers short (2-3 sentences) unless asked for detail. Be warm but professional.

ABOUT:
- Creative developer specializing in interactive 3D web experiences
- Works with React, Three.js, WebGL, GLSL shaders, and AI integration
- Designs and builds immersive interfaces that blend art and technology
- Available for freelance projects and collaboration
- Based in the US

PROJECTS:
- Nimbus: AI-powered warehouse intelligence with voice commands and spatial mapping (React, Three.js, AI/ML)
- Meridian: Real-time generative design tool for architects (WebGL, WASM, Node)
- Pulse: Ambient health monitoring dashboard for clinical insights (React Native, D3, FHIR)

SKILLS:
React, Three.js, WebGL, GLSL, Node.js, Python, AI/ML integration, interaction design, creative coding, generative design

LINKS:
- GitHub: https://github.com/YOUR_USERNAME
- LinkedIn: https://linkedin.com/in/YOUR_PROFILE
- Email: your@email.com

RESUME:
(Paste your full resume text here — education, experience, etc.)

RULES:
- If you don't know something about Adi, say so and suggest they reach out directly
- If asked about availability, say Adi is open to interesting projects and to get in touch
- Never make up information that isn't in this context
`;

// ── Suggestion pills ──
const SUGGESTIONS = [
  { label: "What does Adi do?", query: "What does Adi do?" },
  { label: "His projects", query: "Tell me about Adi's projects" },
  { label: "Tech stack", query: "What technologies does Adi work with?" },
  { label: "Available?", query: "Is Adi available for freelance work?" },
];

const HELP_OPTIONS = [
  "What's Adi's design process?",
  "Can I see case studies?",
  "What kind of projects does he take on?",
  "How do I get in touch?",
  "What makes his work unique?",
  "Does he do AI integration?",
];

export default function ChatPanel({ open, onClose, activeSeason }) {
  const seasonName = (SEASON_META[activeSeason] || SEASON_META.winter).label;
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hey — I'm ${seasonName}, Adi's AI assistant. Ask me anything about his work, projects, or availability.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [entering, setEntering] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [revealedMsgs, setRevealedMsgs] = useState(new Set([0]));
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setEntering(true)));
  }, []);
  const closing = !open;
  const active = entering && !closing;
  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 1500);
  }, [active]);
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [messages, typing]);
  useEffect(() => {
    const t = setTimeout(
      () => setRevealedMsgs(new Set(messages.map((_, i) => i))),
      50
    );
    return () => clearTimeout(t);
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const txt = text.trim();
    if (!txt) return;
    setMessages((m) => [...m, { role: "user", text: txt }]);
    setInput("");
    setShowHelp(false);
    setTyping(true);

    // Build conversation history for the API
    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: txt },
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: PERSONAL_CONTEXT,
          messages: historyRef.current,
        }),
      });
      const data = await response.json();
      const reply =
        data.content?.map((b) => (b.type === "text" ? b.text : "")).join("") ||
        "Sorry, I couldn't process that.";
      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: reply },
      ];
      setTyping(false);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Having trouble connecting right now. Try again in a moment.",
        },
      ]);
    }
  }, []);

  const send = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showSuggestions = messages.length <= 3 && !typing;

  return (
    <>
      <style>{`
        @keyframes ambFloat0{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes ambFloat1{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes ambFloat2{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}
        @keyframes ambFloat3{0%,100%{transform:translateY(0)}50%{transform:translateY(-3.5px)}}
        @keyframes ambFloat4{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @keyframes tdot{0%,60%,100%{opacity:0.15}30%{opacity:0.5}}
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          bottom: 16,
          width: "calc(50% - 24px)",
          zIndex: 8,
          display: "flex",
          flexDirection: "column",
          pointerEvents: active ? "auto" : "none",
        }}
      >
        {/* Background — matches menu panel glass */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(232,232,238,0.74)",
            backdropFilter: "blur(50px) saturate(1.15)",
            WebkitBackdropFilter: "blur(50px) saturate(1.15)",
            borderRadius: 20,
            transform: active ? "translateX(0)" : "translateX(105%)",
            opacity: active ? 1 : 0,
            transition: active
              ? "transform 1.4s cubic-bezier(0.16,1,0.3,1), opacity 1s ease"
              : "transform 1s cubic-bezier(0.5,0,0.75,0) 0.15s, opacity 0.8s ease 0.1s",
          }}
        />

        {/* Header */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "28px 32px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(6px)",
            transition: active
              ? "opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s"
              : "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          <div
            style={{
              animation: active ? "ambFloat0 7s ease-in-out infinite" : "none",
            }}
          >
            {(() => {
              const s = SEASON_META[activeSeason] || SEASON_META.winter;
              const Ic = s.icon;
              return (
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 300,
                    color: "rgba(18,18,40,0.2)",
                    fontFamily: F,
                    margin: 0,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ic size={13} strokeWidth={1.2} color="rgba(18,18,40,0.2)" />
                  {s.label}
                </p>
              );
            })()}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.4)",
              border: "0.5px solid rgba(18,18,40,0.04)",
              borderRadius: 8,
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: F,
              color: "rgba(18,18,40,0.3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "rgba(18,18,40,0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "rgba(18,18,40,0.3)";
            }}
          >
            close
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            position: "relative",
            zIndex: 1,
            overflowY: "auto",
            padding: "24px 32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 2,
            opacity: active ? 1 : 0,
            transition: active ? "opacity 0.7s ease 0.7s" : "opacity 0.3s ease",
          }}
        >
          {messages.map((m, i) => {
            const isNew = !revealedMsgs.has(i);
            return (
              <div key={i}>
                {m.role === "assistant" ? (
                  <div style={{ padding: "6px 0" }}>
                    {splitIntoLines(m.text).map((line, li) => (
                      <AmbientLine
                        key={li}
                        text={line}
                        index={li}
                        total={splitIntoLines(m.text).length}
                        isNew={isNew}
                      />
                    ))}
                  </div>
                ) : (
                  <UserPill text={m.text} />
                )}
              </div>
            );
          })}
          {typing && <TypingIndicator />}

          {/* Help options */}
          {showHelp && (
            <div
              style={{
                padding: "8px 0",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(18,18,40,0.25)",
                  fontFamily: F,
                  fontWeight: 300,
                  letterSpacing: "0.1em",
                  margin: "4px 0",
                  textTransform: "uppercase",
                }}
              >
                Try asking about:
              </p>
              {HELP_OPTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setShowHelp(false);
                    sendMessage(q);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: "0.5px solid rgba(18,18,40,0.04)",
                    background: "rgba(255,255,255,0.3)",
                    fontFamily: F,
                    fontSize: 11,
                    fontWeight: 300,
                    color: "rgba(18,18,40,0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.55)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.3)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions + Input */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0 32px 32px",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(10px)",
            transition: active
              ? "opacity 0.7s ease 0.9s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.9s"
              : "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          {/* Suggestion pills */}
          {showSuggestions && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
              }}
            >
              {SUGGESTIONS.map((s, i) => (
                <SuggestionPill
                  key={i}
                  label={s.label}
                  onClick={() => sendMessage(s.query)}
                />
              ))}
              <SuggestionPill
                label="Help ?"
                onClick={() => setShowHelp(!showHelp)}
              />
            </div>
          )}

          {/* Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.4)",
              border: "0.5px solid rgba(18,18,40,0.04)",
              backdropFilter: "blur(12px)",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="ask anything..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontFamily: F,
                fontSize: 13,
                fontWeight: 200,
                color: "rgba(18,18,40,0.55)",
                letterSpacing: "0.02em",
              }}
            />
            <button
              onClick={send}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: input.trim()
                  ? "rgba(18,18,40,0.06)"
                  : "transparent",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={
                  input.trim() ? "rgba(18,18,40,0.4)" : "rgba(18,18,40,0.1)"
                }
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
