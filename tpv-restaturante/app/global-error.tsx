"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#0f1419", color: "#f7f7f5", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Algo salió mal</h1>
            <p style={{ opacity: 0.8, marginBottom: 16 }}>Se ha registrado el error. Recarga para reintentar.</p>
            <button onClick={() => window.location.reload()} style={{ background: "#c8a24b", border: "none", color: "#0f1419", padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}