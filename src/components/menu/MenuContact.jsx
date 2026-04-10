import ContactForm from "../contact/ContactForm";
import { hexToRgba } from "../../utils/color";
import "./MenuSections.css";

export default function MenuContact({ config }) {
  const textColor = hexToRgba(config.menuTextColor || "#1a1a2e");
  return (
    <div className="menu-contact">
      <div data-stg style={{ marginBottom: 24 }}>
        <p className="menu-contact__intro">
          Have a project in mind or want to collaborate? I'd love to hear about
          it.
        </p>
      </div>
      <div data-stg>
        <ContactForm textColor={textColor} inputColor={config.menuInputColor} />
      </div>
      <div data-stg className="menu-contact__socials">
        {[
          {
            label: "GitHub",
            href: "https://github.com/adivrskic",
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            ),
          },
          {
            label: "LinkedIn",
            href: "https://linkedin.com/in/adi-vrskic",
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            ),
          },
        ].map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            title={s.label}
            className="menu-contact__social"
          >
            {s.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
