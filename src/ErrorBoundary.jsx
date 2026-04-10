import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#e8e8ee",
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: "rgba(26,26,46,0.6)",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 300, letterSpacing: "0.05em" }}>
            Something went wrong rendering the scene.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "8px 24px",
              borderRadius: 20,
              border: "1px solid rgba(26,26,46,0.12)",
              background: "transparent",
              color: "rgba(26,26,46,0.5)",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
