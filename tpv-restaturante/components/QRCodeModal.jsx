"use client";

import { X } from 'lucide-react';

const C = {
  base: '#0f0d0a', surface: '#1a1714', surfaceLight: '#26221e',
  cream: '#efeae0', muted: '#8a8075', line: '#2e2a26',
  brass: '#c9a96e', brassLight: '#e0c898',
  sage: '#7a8b6a', sageLight: '#9eb08a',
  wine: '#6b3a3a', wineLight: '#a06050',
};

export default function QRCodeModal({ tableId, onClose }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/menu?mesa=${encodeURIComponent(tableId)}`;
  const qrSrc = `${origin}/api/qr?mesa=${encodeURIComponent(tableId)}`;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.base, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, maxWidth: 320, textAlign: 'center' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ color: C.cream, fontSize: 16, fontWeight: 600 }}>Mesa {tableId.toUpperCase()}</h3>
          <button onClick={onClose} style={{ color: C.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <img src={qrSrc} alt={`QR Mesa ${tableId}`} style={{ width: 220, height: 220, margin: '0 auto', borderRadius: 8, display: 'block' }} />

        <p style={{ color: C.muted, fontSize: 12, marginTop: 12, wordBreak: 'break-all' }}>{url}</p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = qrSrc;
              a.download = `qr-${tableId}.svg`;
              a.click();
            }}
            style={{ background: C.sage, color: '#fff', flex: 1 }}
            className="px-4 py-2 rounded-lg text-sm font-medium"
          >
            Descargar QR
          </button>
          <button
            onClick={() => { navigator.clipboard?.writeText(url); }}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, flex: 1 }}
            className="px-4 py-2 rounded-lg text-sm"
          >
            Copiar enlace
          </button>
        </div>
      </div>
    </div>
  );
}
