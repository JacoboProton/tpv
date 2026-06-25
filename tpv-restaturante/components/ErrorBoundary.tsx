"use client";

import { Component } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ background: "#1a1d23", color: "#e6e1d6", minHeight: "100vh" }}
          className="flex items-center justify-center p-6"
        >
          <div className="text-center max-w-sm">
            <p className="font-semibold text-lg mb-2">Algo salió mal</p>
            <p style={{ color: "#9c958a" }} className="text-sm mb-4">
              {this.state.error?.message || "Error inesperado"}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{ background: "#c4a04a", color: "#1a1d23" }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}