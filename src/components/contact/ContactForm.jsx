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
import { DARK_RGBA, BG_HEX } from "../../constants/style";
import {
  SERVICES,
  BUDGET_LABELS,
  TIMELINE_LABELS,
} from "../../constants/services";
import Field from "./Field";
import SliderRow from "./SliderRow";
import "./ContactForm.css";

export default function ContactForm({ compact, textColor, inputColor }) {
  const D = textColor || DARK_RGBA;
  const IC = inputColor || BG_HEX;
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

  const CONTACT_URL =
    import.meta.env.VITE_CONTACT_ENDPOINT ||
    "https://xpyjqeghjxucubtaakda.supabase.co/functions/v1/contact";

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

      // Scene.jsx listens for this to play the smiley "love" expression
      window.dispatchEvent(new Event("contact-sent"));

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

  useEffect(() => {
    if (submitted) setErrors(validate());
  }, [form.name, form.email, form.services, form.message, submitted]);

  const inputStyle = (field, hasIcon) => ({
    color: D + "0.6)",
    background: ICR + "0.15)",
    padding: hasIcon ? "12px 16px 12px 36px" : "12px 16px",
    border: `1px solid ${
      submitted && errors[field] ? "rgba(200,60,60,0.4)" : D + "0.22)"
    }`,
    paddingRight: submitted && errors[field] ? 80 : 16,
  });

  const onFocus = (e) => {
    e.target.style.borderColor = D + "0.38)";
    e.target.style.background = ICR + "0.25)";
  };
  const onBlur = (field) => (e) => {
    e.target.style.borderColor =
      submitted && errors[field] ? "rgba(200,60,60,0.4)" : D + "0.22)";
    e.target.style.background = ICR + "0.15)";
  };

  const gap = compact ? 14 : 18;
  const sw = 1.2;

  return (
    <div className="contact-form" style={{ gap }}>
      {/* Name + Email on one line */}
      <div className="contact-form__row">
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
            className="contact-form__input"
            style={inputStyle("name", true)}
            onFocus={onFocus}
            onBlur={onBlur("name")}
          />
        </Field>

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
            className="contact-form__input"
            style={inputStyle("email", true)}
            onFocus={onFocus}
            onBlur={onBlur("email")}
          />
        </Field>
      </div>

      {/* Services */}
      <div>
        <div className="contact-form__section-header">
          <span
            className="contact-form__section-label"
            style={{ color: D + "0.45)" }}
          >
            INTERESTED IN *
          </span>
          {submitted && errors.services && (
            <span className="contact-form__error-badge">pick at least one</span>
          )}
        </div>
        <div className="contact-form__services">
          {SERVICES.map(({ label, icon: Ic }) => {
            const on = form.services.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleService(label)}
                className="contact-form__service-pill"
                style={{
                  fontWeight: on ? 400 : 300,
                  background: on ? D + "0.10)" : "transparent",
                  border: `1px solid ${on ? D + "0.32)" : D + "0.18)"}`,
                  color: D + (on ? "0.7)" : "0.40)"),
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

      {/* Timeline slider */}
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

      {/* Message */}
      <div className="contact-form__textarea-wrap">
        <textarea
          placeholder="Tell me about your project... *"
          rows={compact ? 3 : 4}
          value={form.message}
          onChange={(e) => {
            setForm((s) => ({ ...s, message: e.target.value }));
            setCharCount(e.target.value.length);
          }}
          className="contact-form__input contact-form__textarea"
          style={{
            ...inputStyle("message", false),
            minHeight: compact ? 70 : 100,
          }}
          onFocus={onFocus}
          onBlur={onBlur("message")}
        />
        <div className="contact-form__char-ring">
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
            className="contact-form__char-count"
            style={{ color: D + "0.35)" }}
          >
            {charCount || ""}
          </span>
        </div>
        {submitted && errors.message && (
          <span className="contact-form__error-badge contact-form__error-badge--absolute">
            {errors.message}
          </span>
        )}
        {!errors.message && form.message.trim().length >= 10 && (
          <span className="contact-form__valid-check">
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
        className="contact-form__submit"
        style={{
          color: sent ? "rgba(40,160,120,0.7)" : D + "0.50)",
          background: sent ? "rgba(40,160,120,0.04)" : ICR + "0.15)",
          border: sent
            ? "1px solid rgba(40,160,120,0.25)"
            : "1px solid " + D + "0.22)",
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
      {sendError && <p className="contact-form__send-error">{sendError}</p>}
    </div>
  );
}
