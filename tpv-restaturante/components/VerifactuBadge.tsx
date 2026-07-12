"use client";

import type { Theme } from './constants';

interface VerifactuRegistro {
  huella: string;
  qr_url: string;
  num_serie: string;
  fecha_expedicion: string;
  estado: string;
}

interface VerifactuBadgeProps {
  registro: VerifactuRegistro | null | undefined;
  colors: Theme;
}

export default function VerifactuBadge({ registro, colors: C }: VerifactuBadgeProps) {
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

      <div className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
        <span>Huella:</span>
        <span className="font-mono" style={{ color: C.cream }}>{hashPreview}</span>
      </div>

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
