import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import gsap from "gsap";
import { X } from "lucide-react";
import { SEASON_META } from "../../constants/themes";
import { splitIntoLines } from "../../utils/text";
import AmbientLine from "./AmbientLine";
import UserPill from "./UserPill";
import { TypingIndicator, SuggestionPill } from "./ChatWidgets";
import { checkerReveal, checkerDissolve } from "../../utils/checkerTransition";
import "./ChatPanel.css";

// System prompt lives in netlify/functions/chat.js — the endpoint only
// accepts { messages, theme, localTime } so visitors can't override it.

// ── Suggestion pills ──
const SUGGESTIONS = [
  { label: "What does Adi do?", query: "What does Adi do?" },
  {
    label: "Tell me about Nimbus",
    query: "Tell me about the Nimbus AI website generator",
  },
  {
    label: "How was this site built?",
    query: "How was this portfolio site built?",
  },
  {
    label: "Available?",
    query: "Is Adi available for freelance or contract work?",
  },
];

const HELP_OPTIONS = [
  "What's the tech stack behind this site?",
  "What's Adi's enterprise experience?",
  "Can he build AI-powered features?",
  "What kind of projects excite him?",
  "How do I get in touch?",
  "Tell me about the glass cube and themes",
];

// #23 — Persist messages across panel open/close
const defaultGreeting = () => {
  const h = new Date().getHours();
  const g =
    h < 5
      ? "Late night, huh?"
      : h < 8
      ? "Early start."
      : h < 12
      ? "Morning."
      : h < 17
      ? "Hey."
      : h < 22
      ? "Evening."
      : "Night owl?";
  return `${g} I'm Qb — ask me anything about Adi's work, projects, or how this site was built.`;
};
let persistedMessages = [{ role: "assistant", text: defaultGreeting() }];
let persistedHistory = [];

export default function ChatPanel({ open, onClose, activeSeason }) {
  const isMobile = useIsMobile();
  const seasonName = (SEASON_META[activeSeason] || SEASON_META.winter).label;
  const [messages, setMessages] = useState(persistedMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [streamingText, setStreamingText] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef(persistedHistory);
  const panelRef = useRef(null);

  useEffect(() => {
    persistedMessages = messages;
    persistedHistory = historyRef.current;
  }, [messages]);
  const bgRef = useRef(null);
  const headerRef = useRef(null);
  const msgsRef = useRef(null);
  const inputAreaRef = useRef(null);
  const closeBtnRef = useRef(null);
  const tlRef = useRef(null);
  const checkerRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const bg = bgRef.current;
    const hdr = headerRef.current;
    const msgs = msgsRef.current;
    const inp = inputAreaRef.current;
    const cb = closeBtnRef.current;
    const panel = panelRef.current;
    if (!bg || !panel) return;

    if (tlRef.current) tlRef.current.kill();
    if (checkerRef.current) {
      checkerRef.current();
      checkerRef.current = null;
    }

    if (open) {
      setActive(true);
      panel.style.pointerEvents = "auto";
      gsap.set(bg, { opacity: 0 });
      if (hdr) gsap.set(hdr, { opacity: 0, y: 10 });
      if (msgs) gsap.set(msgs, { opacity: 0, y: 12 });
      if (inp) gsap.set(inp, { opacity: 0, y: 14 });
      if (cb) gsap.set(cb, { scale: 0, opacity: 0 });

      const checker = checkerReveal(panel, {
        color: "rgba(232,232,238,0.2)",
        blur: 30,
        maxDelay: 250,
        onComplete: () => {
          checkerRef.current = null;
          bg.style.removeProperty("backdrop-filter");
          bg.style.removeProperty("-webkit-backdrop-filter");
          bg.style.removeProperty("background");
          gsap.set(bg, { opacity: 1 });
          checker.cleanup();
        },
      });
      checkerRef.current = checker.cleanup;

      setTimeout(() => {
        const tl = gsap.timeline();
        tlRef.current = tl;
        if (hdr)
          tl.to(
            hdr,
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            0
          );
        if (msgs)
          tl.to(
            msgs,
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            0.06
          );
        if (inp)
          tl.to(
            inp,
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            0.12
          );
        if (cb)
          tl.to(
            cb,
            { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" },
            0.08
          );
        tl.call(() => inputRef.current?.focus(), [], 0.4);
      }, 450);
    } else {
      const tl = gsap.timeline();
      tlRef.current = tl;
      if (cb)
        tl.to(
          cb,
          { scale: 0, opacity: 0, duration: 0.15, ease: "power2.in" },
          0
        );
      if (inp)
        tl.to(inp, { opacity: 0, y: -6, duration: 0.15, ease: "power2.in" }, 0);
      if (msgs)
        tl.to(
          msgs,
          { opacity: 0, y: -6, duration: 0.15, ease: "power2.in" },
          0.03
        );
      if (hdr)
        tl.to(
          hdr,
          { opacity: 0, y: -6, duration: 0.15, ease: "power2.in" },
          0.06
        );
      tl.call(
        () => {
          const checker = checkerDissolve(panel, {
            color: "rgba(232,232,238,0.2)",
            blur: 30,
            maxDelay: 250,
            onComplete: () => {
              checkerRef.current = null;
              panel.style.pointerEvents = "none";
              setActive(false);
            },
          });
          gsap.set(bg, { opacity: 0 });
          checkerRef.current = checker.cleanup;
        },
        [],
        0.2
      );
    }
  }, [open]);
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [messages, typing, streamingText]);

  const sendMessage = useCallback(
    async (text) => {
      const txt = text.trim();
      if (!txt) return;
      setMessages((m) => [...m, { role: "user", text: txt }]);
      setInput("");
      setShowHelp(false);
      setTyping(true);

      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: txt },
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stream: true,
            theme: activeSeason,
            localTime: new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            messages: historyRef.current,
          }),
        });

        if (!response.ok) throw new Error("API error");

        setTyping(false);
        setStreamingText("");

        let fullReply = "";
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const evt = JSON.parse(json);
              if (evt.type === "content_block_delta" && evt.delta?.text) {
                fullReply += evt.delta.text;
                const display = fullReply
                  .replace(/<!--EMAIL:.*?-->/, "")
                  .trim();
                setStreamingText(display);
              }
            } catch (e) {
              console.warn("SSE parse error:", e);
            }
          }
        }

        const emailMatch = fullReply.match(/<!--EMAIL:(.*?)-->/);
        if (emailMatch) {
          try {
            const emailData = JSON.parse(emailMatch[1]);
            await fetch(
              import.meta.env.VITE_CONTACT_ENDPOINT ||
                "https://xpyjqeghjxucubtaakda.supabase.co/functions/v1/contact",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: emailData.name,
                  email: emailData.email,
                  message: emailData.message,
                  source: "qb-chat",
                }),
              }
            ).catch((e) => console.warn("Contact send failed:", e));
          } catch (e) {
            console.warn("Email tag parse error:", e);
          }
          fullReply = fullReply.replace(/<!--EMAIL:.*?-->/, "").trim();
        }

        setStreamingText(null);
        setMessages((m) => [...m, { role: "assistant", text: fullReply }]);

        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: fullReply },
        ];
      } catch {
        setTyping(false);
        setStreamingText(null);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: "Having trouble connecting right now. Try again in a moment.",
          },
        ]);
      }
    },
    [activeSeason]
  );

  const send = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showSuggestions =
    messages.length <= 3 && !typing && streamingText == null;

  return (
    <>
      <div
        ref={panelRef}
        className={`chat-panel ${
          isMobile ? "chat-panel--mobile" : "chat-panel--desktop"
        }`}
      >
        <div
          ref={bgRef}
          className={`chat-panel__bg ${
            isMobile ? "chat-panel__bg--mobile" : "chat-panel__bg--desktop"
          }`}
          style={{ opacity: 0 }}
        />

        <div
          ref={headerRef}
          className={`chat-panel__season-icon ${
            isMobile
              ? "chat-panel__season-icon--mobile"
              : "chat-panel__season-icon--desktop"
          }`}
        >
          {(() => {
            const s = SEASON_META[activeSeason] || SEASON_META.winter;
            const Ic = s.icon;
            return (
              <Ic
                size={isMobile ? 140 : 750}
                strokeWidth={0.5}
                color="#e4e4ea"
              />
            );
          })()}
        </div>

        <div ref={msgsRef} className="chat-panel__messages">
          <div
            ref={scrollRef}
            className={`chat-panel__scroll ${
              isMobile
                ? "chat-panel__scroll--mobile"
                : "chat-panel__scroll--desktop"
            }`}
          >
            <div className="chat-panel__spacer" />
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "assistant" ? (
                  <div className="chat-panel__assistant-msg">
                    {(() => {
                      const lines = splitIntoLines(m.text);
                      return lines.map((line, li) => (
                        <AmbientLine
                          key={li}
                          text={line}
                          index={li}
                          total={lines.length}
                        />
                      ));
                    })()}
                  </div>
                ) : (
                  <UserPill text={m.text} />
                )}
              </div>
            ))}
            {streamingText != null && streamingText.length > 0 && (
              <div className="chat-panel__assistant-msg">
                {(() => {
                  const lines = splitIntoLines(streamingText);
                  return lines.map((line, li) => (
                    <AmbientLine
                      key={li}
                      text={line}
                      index={li}
                      total={lines.length}
                    />
                  ));
                })()}
              </div>
            )}
            {typing && <TypingIndicator />}

            {showHelp && (
              <div className="chat-panel__help">
                <p className="chat-panel__help-label">Try asking about:</p>
                {HELP_OPTIONS.map((q, i) => (
                  <button
                    key={i}
                    className="chat-panel__help-btn"
                    onClick={() => {
                      setShowHelp(false);
                      sendMessage(q);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          ref={inputAreaRef}
          className={`chat-panel__input-area ${
            isMobile
              ? "chat-panel__input-area--mobile"
              : "chat-panel__input-area--desktop"
          }`}
        >
          {showSuggestions && (
            <div className="chat-panel__suggestions">
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

          <div
            className="chat-panel__input-row"
            onClick={() => inputRef.current?.focus()}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="ask anything..."
              aria-label="Ask a question about Adi's work"
              className="chat-panel__text-input"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                send();
              }}
              className={`chat-panel__send-btn ${
                input.trim() ? "chat-panel__send-btn--active" : ""
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        <button
          ref={closeBtnRef}
          onClick={onClose}
          className={`chat-panel__close ${
            isMobile
              ? "chat-panel__close--mobile"
              : "chat-panel__close--desktop"
          }`}
        >
          <X size={18} strokeWidth={1.5} color="#585878" />
        </button>
      </div>
    </>
  );
}
