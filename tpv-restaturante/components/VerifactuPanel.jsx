"use client";

import { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, QrCode, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { fetchVerifactuRegistros, verifyVerifactuChain, registerVerifactu } from '../lib/api';

/**
 * VerifactuPanel
 * Panel de administración del módulo Verifactu.
 * Props:
 *   colors - paleta C de constants.js
 *   sales  - array de ventas (opcional, para registrar manualmente)
 */
export default function VerifactuPanel({ colors: C, sales = [] }) {
  const [registros, setRegistros]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [verifying, setVerifying]       = useState(false);
  const [verResults, setVerResults]     = useState({});
  const [qrVisible, setQrVisible]       = useState(null);
  const [manualSaleId, setManualSaleId] = useState('');
  const [registering, setRegistering]   = useState(false);
  const [toast, setToast]               = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadRegistros() {
    setLoading(true);
    try {
      const data = await fetchVerifactuRegistros();
      setRegistros(data);
    } catch {
      showToast('Error al cargar registros Verifactu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVerifactuRegistros()
      .then(data => setRegistros(data))
      .catch(() => showToast('Error al cargar registros Verifactu'))
      .finally(() => setLoading(false));
  }, []);

  // ---------- Verificar cadena ----------
  async function verifyAll() {
    setVerifying(true);
    const results = {};
    for (const reg of registros) {
      try {
        const res = await verifyVerifactuChain(reg.sale_id);
        results[reg.sale_id] = res;
      } catch {
        results[reg.sale_id] = { valid: false, details: { error: 'Error de red' } };
      }
    }
    setVerResults(results);
    setVerifying(false);
    const allValid = Object.values(results).every(r => r.valid);
    showToast(allValid ? '✓ Cadena de huellas válida' : '⚠ Se encontraron inconsistencias en la cadena');
  }

  // ---------- Registro manual ----------
  async function handleManualRegister() {
    if (!manualSaleId.trim()) return;
    const sale = sales.find(s => s.id === manualSaleId.trim());
    if (!sale) { showToast('Venta no encontrada: ' + manualSaleId); return; }
    setRegistering(true);
    try {
      await registerVerifactu(sale.id, sale);
      showToast('Registro Verifactu creado correctamente');
      setManualSaleId('');
      await loadRegistros();
    } catch (err) {
      showToast('Error al registrar: ' + err.message);
    } finally {
      setRegistering(false);
    }
  }

  // ---------- Stats ----------
  const totalRegistros = registros.length;
  const lastHash       = registros[0]?.huella ?? '—';
  const lastHashPreview = lastHash !== '—' ? lastHash.slice(0, 16) + '...' : '—';

  const chainOk = Object.keys(verResults).length > 0
    ? Object.values(verResults).every(r => r.valid)
    : null;

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <ShieldCheck className="w-5 h-5" style={{ color: C.brassLight }} />
        <h3 className="font-display text-xl" style={{ color: C.cream }}>VERIFACTU</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: C.surfaceLight, color: C.muted }}
        >
          Simulación
        </span>
        <div className="flex-1" />
        <button
          onClick={loadRegistros}
          style={{ background: C.surfaceLight, color: C.muted }}
          className="p-2 rounded-lg hover:opacity-80"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Registros</p>
          <p className="font-display text-3xl" style={{ color: C.brassLight }}>{totalRegistros}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Última huella</p>
          <p className="font-mono text-xs mt-1 truncate" style={{ color: C.cream }}>{lastHashPreview}</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="rounded-xl p-4 col-span-2 sm:col-span-1">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1">Estado cadena</p>
          {chainOk === null ? (
            <p className="text-xs mt-1" style={{ color: C.muted }}>Sin verificar</p>
          ) : chainOk ? (
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4" style={{ color: C.sage }} />
              <span className="text-xs" style={{ color: C.sageLight }}>Válida</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-1">
              <XCircle className="w-4 h-4" style={{ color: C.wine }} />
              <span className="text-xs" style={{ color: C.wineLight }}>Inconsistente</span>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={verifyAll}
          disabled={verifying || registros.length === 0}
          style={{ background: C.brass, color: C.base }}
          className="text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-40"
        >
          {verifying ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          Verificar cadena
        </button>

        {/* Registro manual */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            value={manualSaleId}
            onChange={e => setManualSaleId(e.target.value)}
            placeholder="ID de venta manual..."
            style={{
              background: C.surfaceLight,
              color: C.cream,
              border: `1px solid ${C.line}`,
            }}
            className="rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
          />
          <button
            onClick={handleManualRegister}
            disabled={registering || !manualSaleId.trim()}
            style={{ background: C.surfaceLight, color: C.cream }}
            className="text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap disabled:opacity-40"
          >
            {registering ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </div>

      {/* Tabla de registros */}
      {loading ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-8">Cargando registros...</p>
      ) : registros.length === 0 ? (
        <div
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-8 text-center"
        >
          <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: C.muted }} />
          <p style={{ color: C.muted }} className="text-sm">
            No hay registros Verifactu. Se crean automáticamente al cerrar una venta.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {registros.map(reg => {
            const vr = verResults[reg.sale_id];
            return (
              <div
                key={reg.id}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-xl p-3"
              >
                <div className="flex flex-wrap items-start gap-2">
                  {/* Serie + fecha */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold" style={{ color: C.brassLight }}>
                      {reg.num_serie}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {reg.fecha_expedicion} · {Number(reg.importe_total).toFixed(2)} €
                    </p>
                    <p className="font-mono text-xs mt-1 truncate" style={{ color: C.muted }}>
                      {reg.huella.slice(0, 20)}...
                    </p>
                  </div>

                  {/* Estado + verificación */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: C.surfaceLight,
                        color: reg.estado === 'simulado' ? C.brassLight : C.sageLight,
                      }}
                    >
                      {reg.estado}
                    </span>
                    {vr && (
                      vr.valid
                        ? <CheckCircle2 className="w-4 h-4" style={{ color: C.sage }} />
                        : <XCircle className="w-4 h-4" style={{ color: C.wine }} />
                    )}
                  </div>

                  {/* Botón QR */}
                  <button
                    onClick={() => setQrVisible(qrVisible === reg.id ? null : reg.id)}
                    style={{ background: C.surfaceLight, color: C.muted }}
                    className="p-2 rounded-lg hover:opacity-80 shrink-0"
                    title="Ver QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                {/* QR expandido */}
                {qrVisible === reg.id && (
                  <div className="mt-3 flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(reg.qr_url)}`}
                      alt={`QR ${reg.num_serie}`}
                      width={120}
                      height={120}
                      className="rounded"
                      style={{ border: `1px solid ${C.line}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-1" style={{ color: C.muted }}>URL de validación</p>
                      <p className="font-mono text-xs break-all" style={{ color: C.cream }}>
                        {reg.qr_url}
                      </p>
                      {vr && !vr.valid && (
                        <div className="mt-2">
                          <p className="text-xs" style={{ color: C.wineLight }}>
                            ⚠ Hash no coincide
                          </p>
                          <p className="font-mono text-xs mt-0.5 break-all" style={{ color: C.muted }}>
                            Esperado: {vr.details?.expectedHash?.slice(0, 16)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm shadow-lg z-50"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
