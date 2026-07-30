'use client';

import type { Theme } from '@/components/constants';
import type { GestoriaSettings } from './types';

export function RegimenTab({ settings, onUpdate, C }: {
  settings: GestoriaSettings;
  onUpdate: (key: string, value: string) => void;
  C: Theme;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg p-4 space-y-4" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: C.cream }}>Régimen fiscal</label>
          <select value={settings.taxRegime} onChange={e => onUpdate('taxRegime', e.target.value)}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm">
            <option value="autonomo">Autónomo — Estimación Directa Simplificada</option>
            <option value="modulos">Autónomo — Módulos</option>
            <option value="sl">Sociedad Limitada (SL)</option>
          </select>
          <p className="text-[10px] mt-1" style={{ color: C.muted }}>
            {settings.taxRegime === 'autonomo' && 'Modelo 130 disponible. IVA trimestral con modelo 303.'}
            {settings.taxRegime === 'modulos' && 'No se genera Modelo 130. IVA trimestral con modelo 303.'}
            {settings.taxRegime === 'sl' && 'Impuesto de Sociedades gestionado por tu gestoría. No se genera Modelo 130.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="criterionOfCash" checked={settings.criterionOfCash === 'true'}
            onChange={e => onUpdate('criterionOfCash', e.target.checked ? 'true' : 'false')} className="rounded" style={{ accentColor: C.brass }} />
          <label htmlFor="criterionOfCash" className="text-xs" style={{ color: C.cream }}>Criterio de caja</label>
        </div>
        <p className="text-[10px]" style={{ color: C.muted }}>
          Con el criterio de caja, declaras los ingresos cuando los cobras (no cuando facturas). Afecta al cálculo del Modelo 130.
        </p>
      </div>
      <div className="rounded-lg p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
        <h3 className="text-xs font-medium" style={{ color: C.cream }}>Seguridad Social</h3>
        <p className="text-[10px]" style={{ color: C.muted }}>Si tienes número de afiliación RED (SILTRA), indícalo aquí para que tu gestoría pueda presentar los TC2.</p>
        <input type="text" value={settings.socialSecurityRed} onChange={e => onUpdate('socialSecurityRed', e.target.value)}
          placeholder="Nº RED / SILTRA (opcional)"
          style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
