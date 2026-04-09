import { useState, useEffect } from "react";
import {
  Snail,
  Rabbit,
  Send,
  User,
  Mail,
  DollarSign,
  Clock,
} from "lucide-react";
import { FONT_FAMILY, DARK_RGBA } from "../../constants/style";
import {
  SERVICES,
  BUDGET_LABELS,
  TIMELINE_LABELS,
} from "../../constants/services";
import Field from "./Field";
import SliderRow from "./SliderRow";

const F = FONT_FAMILY;
const D = DARK_RGBA;

export default function ContactForm({ compact, textColor, inputColor }) {
  const D = textColor || "rgba(26,26,46,";
  const IC = inputColor || "#e8e8ee";
  // Convert input color hex to rgba prefix for opacity usage
  const icR = parseInt(IC.slice(1, 3), 16) || 232;
  const icG = parseInt(IC.slice(3, 5), 16) || 232;
  const icB = parseInt(IC.slice(5, 7), 16) || 238;
  const ICR = `rgba(${icR},${icG},${icB},`;
  const [form, setForm] = useState({
    name: "",
    email: "",
    services: [],
    budget: 1,
    timeline: 2,
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "required";
    if (!form.email.trim()) e.email = "required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "invalid";
    if (form.services.length === 0) e.services = true;
    if (!form.message.trim()) e.message = "required";
    else if (form.message.trim().length < 10) e.message = "too short";
    return e;
  };

  const toggleService = (s) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s)
        ? f.services.filter((x) => x !== s)
        : [...f.services, s],
    }));
  };

  // ── CHANGE THIS to your Supabase project URL ──
  const CONTACT_URL =
    "https://YOUR_PROJECT_REF.supabase.co/functions/v1/contact";

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const submit = async () => {
    const e = validate();
    setErrors(e);
    setSubmitted(true);
    setSendError(null);
    if (Object.keys(e).length > 0) return;

    setSending(true);
    try {
      const res = await fetch(CONTACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          services: form.services,
          budget: BUDGET_LABELS[form.budget] || "",
          timeline: TIMELINE_LABELS[form.timeline] || "",
          message: form.message.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setForm({
          name: "",
          email: "",
          services: [],
          budget: 1,
          timeline: 2,
          message: "",
        });
        setSubmitted(false);
        setErrors({});
        setCharCount(0);
      }, 2500);
    } catch (err) {
      setSendError("Something went wrong — try emailing directly.");
    } finally {
      setSending(false);
    }
  };

  // Live-clear errors as user fixes them after submit
  useEffect(() => {
    if (submitted) setErrors(validate());
  }, [form.name, form.email, form.services, form.message, submitted]);

  const base = {
    fontFamily: F,
    fontSize: 13,
    fontWeight: 300,
    color: D + "0.6)",
    background: ICR + "0.15)",
    borderRadius: 4,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border 0.2s, background 0.2s",
  };
  const inp = (field, hasIcon) => ({
    ...base,
    padding: hasIcon ? "12px 16px 12px 36px" : "12px 16px",
    border: `1px solid ${
      submitted && errors[field] ? "rgba(200,60,60,0.4)" : D + "0.22)"
    }`,
    paddingRight: submitted && errors[field] ? 80 : 16,
  });
  const fi = (e) => {
    e.target.style.borderColor = D + "0.38)";
    e.target.style.background = ICR + "0.25)";
  };
  const fo = (field) => (e) => {
    e.target.style.borderColor =
      submitted && errors[field] ? "rgba(200,60,60,0.4)" : D + "0.22)";
    e.target.style.background = ICR + "0.15)";
  };

  const gap = compact ? 14 : 18;
  const sw = 1.2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        width: "100%",
        maxWidth: 460,
      }}
    >
      {/* Name */}
      <Field
        error={submitted && errors.name}
        valid={!errors.name && form.name.trim().length > 0}
        icon={User}
        tint={D}
      >
        <input
          type="text"
          placeholder="Name *"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          style={inp("name", true)}
          onFocus={fi}
          onBlur={fo("name")}
        />
      </Field>

      {/* Email */}
      <Field
        error={submitted && errors.email}
        valid={!errors.email && form.email.trim().length > 0}
        icon={Mail}
        tint={D}
      >
        <input
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          style={inp("email", true)}
          onFocus={fi}
          onBlur={fo("email")}
        />
      </Field>

      {/* Services — multi-select pills with icons */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: D + "0.45)",
              fontFamily: F,
              fontWeight: 300,
              letterSpacing: "0.1em",
            }}
          >
            INTERESTED IN *
          </span>
          {submitted && errors.services && (
            <span
              style={{
                fontSize: 9,
                fontFamily: F,
                padding: "3px 10px",
                borderRadius: 10,
                background: "rgba(200,60,60,0.06)",
                border: "0.5px solid rgba(200,60,60,0.12)",
                color: "rgba(200,60,60,0.5)",
                fontWeight: 400,
                letterSpacing: "0.03em",
              }}
            >
              pick at least one
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SERVICES.map(({ label, icon: Ic }) => {
            const on = form.services.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleService(label)}
                style={{
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: on ? 400 : 300,
                  padding: "7px 13px 7px 10px",
                  borderRadius: 20,
                  background: on ? D + "0.10)" : "transparent",
                  border: `1px solid ${on ? D + "0.32)" : D + "0.18)"}`,
                  color: D + (on ? "0.7)" : "0.40)"),
                  cursor: "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onMouseEnter={(e) => {
                  if (!on) {
                    e.currentTarget.style.borderColor = D + "0.28)";
                    e.currentTarget.style.color = D + "0.55)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!on) {
                    e.currentTarget.style.borderColor = D + "0.18)";
                    e.currentTarget.style.color = D + "0.40)";
                  }
                }}
              >
                <Ic size={12} strokeWidth={on ? 1.4 : sw} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget slider */}
      <SliderRow
        label="BUDGET"
        labelIcon={DollarSign}
        value={form.budget}
        onChange={(v) => setForm((s) => ({ ...s, budget: v }))}
        labels={BUDGET_LABELS}
        min={0}
        max={3}
        tint={D}
        inputBg={IC}
      />

      {/* Timeline slider — snail to rabbit */}
      <SliderRow
        label="TIMELINE"
        labelIcon={Clock}
        value={form.timeline}
        onChange={(v) => setForm((s) => ({ ...s, timeline: v }))}
        labels={TIMELINE_LABELS}
        min={0}
        max={3}
        leftIcon={<Snail size={16} strokeWidth={sw} color={D + "0.35)"} />}
        rightIcon={<Rabbit size={16} strokeWidth={sw} color={D + "0.35)"} />}
        tint={D}
        inputBg={IC}
      />

      {/* Message + char count */}
      <div style={{ position: "relative" }}>
        <textarea
          placeholder="Tell me about your project... *"
          rows={compact ? 3 : 4}
          value={form.message}
          onChange={(e) => {
            setForm((s) => ({ ...s, message: e.target.value }));
            setCharCount(e.target.value.length);
          }}
          style={{
            ...inp("message", false),
            height: "auto",
            minHeight: compact ? 70 : 100,
            resize: "none",
            padding: "12px 16px",
            paddingBottom: 36,
          }}
          onFocus={fi}
          onBlur={fo("message")}
        />
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            width: 28,
            height: 28,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="14"
              cy="14"
              r="11"
              fill="none"
              stroke={D + "0.12)"}
              strokeWidth="1.5"
            />
            <circle
              cx="14"
              cy="14"
              r="11"
              fill="none"
              stroke={
                charCount > 500
                  ? "rgba(200,60,60,0.3)"
                  : charCount > 10
                  ? "rgba(40,160,120,0.25)"
                  : D + "0.15)"
              }
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(1, charCount / 500) * 69.1} 69.1`}
              style={{ transition: "stroke-dasharray 0.15s, stroke 0.2s" }}
            />
          </svg>
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 7,
              fontFamily: F,
              fontWeight: 300,
              color: D + "0.35)",
            }}
          >
            {charCount || ""}
          </span>
        </div>
        {submitted && errors.message && (
          <span
            style={{
              position: "absolute",
              right: 12,
              top: 10,
              fontSize: 9,
              fontFamily: F,
              padding: "3px 10px",
              borderRadius: 10,
              background: "rgba(200,60,60,0.06)",
              border: "0.5px solid rgba(200,60,60,0.12)",
              color: "rgba(200,60,60,0.5)",
              fontWeight: 400,
              letterSpacing: "0.03em",
              pointerEvents: "none",
            }}
          >
            {errors.message}
          </span>
        )}
        {!errors.message && form.message.trim().length >= 10 && (
          <span
            style={{
              position: "absolute",
              right: 12,
              top: 10,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(40,160,100,0.08)",
              border: "0.5px solid rgba(40,160,100,0.18)",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="rgba(40,160,100,0.55)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 5.5L4 7.5L8 3" />
            </svg>
          </span>
        )}
      </div>

      {/* Send */}
      <button
        onClick={submit}
        disabled={sending || sent}
        style={{
          ...base,
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          textAlign: "center",
          padding: "12px 16px",
          color: sent ? "rgba(40,160,120,0.7)" : D + "0.50)",
          background: sent ? "rgba(40,160,120,0.04)" : ICR + "0.15)",
          border: sent
            ? "1px solid rgba(40,160,120,0.25)"
            : "1px solid " + D + "0.22)",
          transition: "all 0.3s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onMouseEnter={(e) => {
          if (!sent) e.currentTarget.style.background = ICR + "0.25)";
        }}
        onMouseLeave={(e) => {
          if (!sent)
            e.currentTarget.style.background = sent
              ? "rgba(40,160,120,0.04)"
              : ICR + "0.15)";
        }}
      >
        <Send size={12} strokeWidth={sw} />
        {sent
          ? "Message sent — I'll be in touch"
          : sending
          ? "Sending..."
          : "Send message"}
      </button>
      {sendError && (
        <p
          style={{
            fontSize: 11,
            fontFamily: F,
            fontWeight: 300,
            color: "rgba(200,60,60,0.6)",
            textAlign: "center",
            margin: "4px 0 0",
          }}
        >
          {sendError}
        </p>
      )}
    </div>
  );
}
