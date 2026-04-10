import "./UserPill.css";

export default function UserPill({ text }) {
  return (
    <div className="user-pill">
      <div className="user-pill__bubble">{text}</div>
    </div>
  );
}
