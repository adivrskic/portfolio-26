import { DARK_RGBA } from "../../constants/style";
import "./Field.css";

export default function Field({ children, error, valid, icon: Icon, tint }) {
  const D = tint || DARK_RGBA;
  return (
    <div className="field">
      {Icon && (
        <span className="field__icon">
          <Icon size={16} strokeWidth={1.2} color={D + "0.38)"} />
        </span>
      )}
      {children}
      {error && <span className="field__error">{error}</span>}
      {!error && valid && (
        <span className="field__valid">
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
  );
}
