'use client';

import { useState, useEffect } from 'react';
import { Eye, Check, Loader2 } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { AutoSettings, PreviewData, GenResult } from './types';

export function AutoTab({ C, onRefresh }: {
  C: Theme;
  onRefresh: () => void;
}) {
  const [settings, setSettings] = useState<AutoSettings>({ leadTimeDays: '2', safetyStockDays: '3', minOrderValue: '50', consolidateBySupplier: 'true' });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenResult | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const r = await fetch('/api/auto-order-settings');
      if (r.ok) setSettings(await r.json());
    } catch {}
    setLoading(false);
  }

  async function saveSettings() {
    try {
      await fetch('/api/auto-order-settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
    } catch {}
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreview(null);
    setGenResult(null);
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'auto-preview', ...settings }),
      });
      if (r.ok) setPreview(await r.json());
    } catch {}
    setPreviewLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenResult(null);
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'auto-generate', ...settings, createdBy: 'admin' }),
      });
      if (r.ok) {
        const data: GenResult = await r.json();
        setGenResult(data);
        setPreview(null);
        onRefresh();
      }
    } catch {}
    setGenerating(false);
  }

  if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>;

  const allProducts = preview?.preview?.flatMap(g => g.lines) || [];
  const allTotal = preview?.preview?.reduce((s, g) => s + g.total, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-3" style={{ background: C.surfaceLight }}>
        <h4 className="text-xs font-bold" style={{ color: C.cream }}>Ajustes</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label style={{ color: C.muted }}>Plazo de entrega (días)
            <input type="number" min={1} value={settings.leadTimeDays}
              onChange={e => setSettings(s => ({ ...s, leadTimeDays: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </label>
          <label style={{ color: C.muted }}>Stock de seguridad (días)
            <input type="number" min={0} value={settings.safetyStockDays}
              onChange={e => setSettings(s => ({ ...s, safetyStockDays: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </label>
          <label style={{ color: C.muted }}>Valor mínimo pedido (€)
            <input type="number" min={0} step={5} value={settings.minOrderValue}
              onChange={e => setSettings(s => ({ ...s, minOrderValue: e.target.value }))}
              className="w-full mt-1 rounded-lg px-3 py-2 text-xs"
              style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} />
          </label>
          <label className="flex items-center gap-2 pt-4" style={{ color: C.muted }}>
            <input type="checkbox" checked={settings.consolidateBySupplier === 'true'}
              onChange={e => setSettings(s => ({ ...s, consolidateBySupplier: e.target.checked ? 'true' : 'false' }))} />
            Consolidar por proveedor
          </label>
        </div>
        <button onClick={saveSettings}
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
          style={{ background: C.surface, color: C.brassLight }}>
          Guardar ajustes
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={handlePreview} disabled={previewLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-40"
          style={{ background: C.brass + '30', color: C.brassLight }}>
          {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          Previsualizar
        </button>
        {preview && (
          <button onClick={handleGenerate} disabled={generating || preview.preview.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-40"
            style={{ background: C.sage + '30', color: C.sage }}>
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Generar {preview.preview.length} pedidos
          </button>
        )}
      </div>

      {previewLoading && <p className="text-xs text-center" style={{ color: C.muted }}>Calculando previsión…</p>}

      {preview && (
        <div className="space-y-3">
          {preview.preview.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: C.muted }}>No se generará ningún pedido (todo por debajo del mínimo o sin necesidad).</p>
          )}

          {preview.preview.map(group => (
            <div key={group.supplierId} className="rounded-xl p-4 space-y-2" style={{ background: C.surfaceLight }}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm" style={{ color: C.cream }}>{group.supplierName}</span>
                <span className="text-sm font-mono" style={{ color: C.brassLight }}>{group.total.toFixed(2)}€</span>
              </div>
              <div className="space-y-1">
                {group.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span style={{ color: C.cream }}>{l.productName}</span>
                    <span style={{ color: C.muted }}>{l.quantity} ud × {l.pricePerUnit.toFixed(4)}€</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {preview.noOfferProducts?.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: C.wine + '20', border: `1px solid ${C.wineLight}40` }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: C.wineLight }}>Sin oferta de proveedor</p>
              {preview.noOfferProducts.map(p => (
                <p key={p.id} className="text-[10px]" style={{ color: C.muted }}>• {p.name}</p>
              ))}
            </div>
          )}

          {preview.skippedByMin?.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: C.brass + '20', border: `1px solid ${C.brass}40` }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: C.brassLight }}>Saltados por valor mínimo ({preview.skippedByMin[0]?.minOrderValue}€)</p>
              {preview.skippedByMin.map(s => (
                <p key={s.supplierName} className="text-[10px]" style={{ color: C.muted }}>• {s.supplierName} — {s.total.toFixed(2)}€</p>
              ))}
            </div>
          )}

          {preview.preview.length > 0 && (
            <p className="text-xs text-center" style={{ color: C.muted }}>
              {allProducts.length} productos · {preview.preview.length} proveedores · {allTotal.toFixed(2)}€ total
            </p>
          )}
        </div>
      )}

      {genResult && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: C.sage + '20', border: `1px solid ${C.sage}40` }}>
          <p className="text-xs font-bold" style={{ color: C.sage }}>Pedidos generados</p>
          {genResult.created.map(c => (
            <p key={c.id} className="text-[10px]" style={{ color: C.cream }}>✅ {c.supplierName} — {c.lineCount} líneas</p>
          ))}
          {genResult.noOfferProducts?.length > 0 && (
            <p className="text-[10px]" style={{ color: C.wineLight }}>⚠️ {genResult.noOfferProducts.length} artículos sin proveedor</p>
          )}
          {genResult.skippedByMin?.length > 0 && (
            <p className="text-[10px]" style={{ color: C.brassLight }}>⚠️ {genResult.skippedByMin.length} proveedores bajo mínimo</p>
          )}
        </div>
      )}
    </div>
  );
}
