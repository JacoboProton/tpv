'use client';

import { useState, useEffect } from 'react';
import { Plus, Copy, X, Trash2, Clock, Tablet, CheckCircle } from 'lucide-react';

export default function PairingPanel({ colors: C }) {
  const [pairings, setPairings] = useState([]);
  const [label, setLabel] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPairings(); }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setGeneratedCode(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  async function loadPairings() {
    setLoading(true);
    try {
      const { fetchKDSPairings } = await import('../lib/api');
      const data = await fetchKDSPairings();
      setPairings(data || []);
    } catch {}
    setLoading(false);
  }

  async function handleGenerate() {
    try {
      const { generateKDSPairCode } = await import('../lib/api');
      const res = await generateKDSPairCode(label);
      if (res?.code) {
        setGeneratedCode(res.code);
        setCountdown(600);
        setLabel('');
      }
    } catch {}
  }

  async function handleRevoke(id) {
    if (!confirm('¿Revocar este dispositivo emparejado?')) return;
    try {
      const { revokeKDSPairing } = await import('../lib/api');
      await revokeKDSPairing(id);
      loadPairings();
    } catch {}
  }

  function copyCode() {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Emparejar pantalla de cocina</h2>
        <p className="text-xs mt-1" style={{ color: C.muted }}>
          Genera un código para emparejar una tablet o TV en la cocina.
          El código caduca en 10 minutos.
        </p>
      </div>

      {/* Generate code */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
        <label className="text-xs font-medium" style={{ color: C.cream }}>
          Etiqueta <span className="text-[10px]" style={{ color: C.muted }}>(opcional, para identificar el dispositivo)</span>
        </label>
        <input type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Ej: TV cocina, Tablet barra…"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
          className="w-full rounded-lg px-3 py-2 text-sm" />

        <button onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-80"
          style={{ background: C.brass, color: '#000' }}>
          <Plus className="w-4 h-4" /> Generar código
        </button>

        {generatedCode && (
          <div className="rounded-lg p-4 text-center space-y-2 animate-fade-in" style={{ background: C.surface, border: `2px dashed ${C.brass}` }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Código de emparejamiento</p>
            <p className="text-3xl font-mono font-bold tracking-[0.4em]" style={{ color: C.brassLight }}>
              {generatedCode}
            </p>
            <p className="text-xs flex items-center justify-center gap-1" style={{ color: countdown < 120 ? C.wineLight : C.muted }}>
              <Clock className="w-3.5 h-3.5" />
              Válido {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                style={{ background: C.brass + '30', color: C.brassLight }}>
                {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
              <button onClick={() => { setGeneratedCode(null); setCountdown(0); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                style={{ background: C.wine + '30', color: C.wineLight }}>
                <X className="w-3.5 h-3.5" /> Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paired devices */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>
          Dispositivos emparejados {pairings.length > 0 && <span className="text-xs font-normal" style={{ color: C.muted }}>({pairings.length})</span>}
        </h3>
        {loading && (
          <div className="text-center py-8" style={{ color: C.muted }}>
            <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p className="text-xs">Cargando…</p>
          </div>
        )}
        {!loading && pairings.length === 0 && (
          <div className="text-center py-8" style={{ color: C.muted }}>
            <Tablet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay dispositivos emparejados</p>
          </div>
        )}
        <div className="space-y-2">
          {pairings.map(p => {
            const expired = p.expiresAt < Date.now() && !p.deviceId;
            const active = p.deviceId && !p.revoked;
            return (
              <div key={p.id} className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: C.surfaceLight, border: `1px solid ${p.revoked ? C.wine : active ? C.sage : C.line}`, opacity: p.revoked ? 0.5 : 1 }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: active ? C.sageLight : C.cream }}>
                      {p.label || 'Sin etiqueta'}
                    </span>
                    {active && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: C.sage + '30', color: C.sageLight }}>Activo</span>}
                    {p.revoked && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: C.wine + '30', color: C.wineLight }}>Revocado</span>}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>
                    {p.deviceId ? (
                      <span>ID: {p.deviceId.slice(0, 12)}… · {new Date(p.createdAt).toLocaleDateString('es-ES')}</span>
                    ) : expired ? (
                      <span> Caducado — no emparejado</span>
                    ) : (
                      <span> Pendiente de emparejar · {new Date(p.expiresAt).toLocaleTimeString('es-ES')}</span>
                    )}
                  </div>
                </div>
                {active && (
                  <button onClick={() => handleRevoke(p.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80 shrink-0"
                    style={{ background: C.wine + '30', color: C.wineLight }}>
                    <Trash2 className="w-3 h-3" /> Revocar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
