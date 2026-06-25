"use client";

/**
 * VerifactuBadge
 * Muestra el estado Verifactu de una venta: número de serie, huella y QR.
 * Props:
 *   registro  - objeto de verifactu_registros (puede ser null/undefined)
 *   colors    - paleta C de constants.js
 */
export default function VerifactuBadge({ registro, colors: C }) {
  if (!registro) {
    return (
      <div
        style={{
          background: C.surfaceLight,
          border: `1px solid ${C.line}`,
          color: C.muted,
        }}
        className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: C.muted }} />
        <span>Sin registro Verifactu</span>
      </div>
    );
  }

  const hashPreview = registro.huella
    ? registro.huella.slice(0, 16) + '...'
    : '—';

  const qrImgUrl = registro.qr_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(registro.qr_url)}`
    : null;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.line}`,
      }}
      className="rounded-xl p-3 flex flex-col gap-2"
    >
      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: C.sage }}
        />
        <span className="text-xs font-semibold" style={{ color: C.sageLight }}>
          Verifactu ✓
        </span>
        <span className="text-xs font-mono ml-auto" style={{ color: C.muted }}>
          {registro.num_serie}
        </span>
      </div>

      {/* Huella */}
      <div className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
        <span>Huella:</span>
        <span className="font-mono" style={{ color: C.cream }}>{hashPreview}</span>
      </div>

      {/* QR */}
      {qrImgUrl && (
        <div className="flex items-center gap-3">
          <img
            src={qrImgUrl}
            alt={`QR Verifactu ${registro.num_serie}`}
            width={64}
            height={64}
            className="rounded"
            style={{ border: `1px solid ${C.line}` }}
          />
          <div className="flex flex-col gap-0.5 text-xs" style={{ color: C.muted }}>
            <span>{registro.fecha_expedicion}</span>
            <span
              className="font-mono"
              style={{ color: registro.estado === 'simulado' ? C.brassLight : C.sageLight }}
            >
              {registro.estado}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
