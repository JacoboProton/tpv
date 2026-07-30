'use client';

import { FileText, FileSpreadsheet, Download, Clock, AlertTriangle } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { GestoriaSettings, TaxModel } from './types';
import { QUARTERS } from './types';

export function PanelTab({ settings, taxModels, currentYear, calculating, getModelStatus, onCalculate, onDownloadPDF, onDownloadJSON, onDownloadCSV, C }: {
  settings: GestoriaSettings;
  taxModels: TaxModel[];
  currentYear: number;
  calculating: string | null;
  getModelStatus: (code: string, year: number, quarter: number) => TaxModel | null;
  onCalculate: (code: string, year: number, quarter: number) => void;
  onDownloadPDF: (code: string, year: number, quarter: number) => void;
  onDownloadJSON: (code: string, year: number, quarter: number) => void;
  onDownloadCSV: (code: string, year: number, quarter: number) => void;
  C: Theme;
}) {
  const regimeLabel: string = ({ autonomo: 'Autónomo (Estimación Directa)', modulos: 'Módulos', sl: 'Sociedad (SL)' } as Record<string, string>)[settings.taxRegime] || 'Autónomo';
  const show130 = settings.taxRegime === 'autonomo';
  const years = [currentYear - 1, currentYear, currentYear + 1];
  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg text-xs flex items-center gap-2 flex-wrap" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
        <FileText className="w-4 h-4 shrink-0" style={{ color: C.sageLight }} />
        <span style={{ color: C.muted }}>Régimen: <strong style={{ color: C.cream }}>{regimeLabel}</strong></span>
        {settings.criterionOfCash === 'true' && (
          <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: C.brass + '30', color: C.brassLight }}>Criterio de caja</span>
        )}
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Trimestrales</h2>
        {years.map(year => (
          <div key={year} className="space-y-2">
            {QUARTERS.map(({ q, label, months, deadline }) => {
              const quarterlyModels = [
                { code: '303', label: '303 · IVA' },
                { code: '111', label: '111 · IRPF trabajo' },
                { code: '115', label: '115 · IRPF alquiler' },
                ...(show130 ? [{ code: '130', label: '130 · Pago fraccionado' }] : []),
                { code: '349', label: '349 · Intracomunitario' },
              ];
              return (
                <div key={`${year}-${q}`} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}`, background: C.surface + '60' }}>
                  <div className="flex items-center justify-between px-3 py-2" style={{ background: C.surfaceLight }}>
                    <span className="text-sm font-medium" style={{ color: C.brassLight }}>{label}</span>
                    <span className="text-[10px]" style={{ color: C.muted }}>{months} · vence {deadline}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: C.line }}>
                    {quarterlyModels.map(({ code, label: ml }) => {
                      const tm = getModelStatus(code, year, q);
                      const isCalc = calculating === `${code}-${year}-${q}`;
                      return (
                        <div key={code} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: C.cream }}>{ml}</span>
                            {tm && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${tm.status === 'presented' ? 'text-green-400 bg-green-900/30' : tm.status === 'reviewed' ? 'text-yellow-400 bg-yellow-900/30' : 'text-gray-400 bg-gray-700/30'}`}>
                                {tm.status === 'presented' ? 'Presentado' : tm.status === 'reviewed' ? 'Revisado' : 'Borrador'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isCalc ? (
                              <span className="text-[10px] px-2 py-1 rounded" style={{ color: C.muted, background: C.surfaceLight }}>
                                <Clock className="w-3 h-3 inline animate-spin mr-1" />Calculando…
                              </span>
                            ) : tm ? (
                              <>
                                <button onClick={() => onDownloadPDF(code, year, q)} className="p-1 rounded hover:opacity-70" style={{ color: C.sageLight }} title="Descargar PDF"><Download className="w-3.5 h-3.5" /></button>
                                <button onClick={() => onDownloadJSON(code, year, q)} className="p-1 rounded hover:opacity-70" style={{ color: C.brassLight }} title="Descargar JSON"><FileText className="w-3.5 h-3.5" /></button>
                                <button onClick={() => onDownloadCSV(code, year, q)} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }} title="Descargar CSV"><FileSpreadsheet className="w-3.5 h-3.5" /></button>
                              </>
                            ) : (
                              <button onClick={() => onCalculate(code, year, q)}
                                className="text-[10px] px-2 py-1 rounded hover:opacity-80"
                                style={{ background: C.brass + '30', color: C.brassLight }}>Calcular borrador</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: C.cream }}>Anuales (resúmenes)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { code: '390', label: '390 · IVA anual' },
            { code: '190', label: '190 · IRPF anual' },
            { code: '180', label: '180 · Alquileres anual' },
          ].map(({ code, label: ml }) => {
            const tm = getModelStatus(code, currentYear, 0);
            const isCalc = calculating === `${code}-${currentYear}-0`;
            return (
              <div key={code} className="rounded-lg p-3" style={{ border: `1px solid ${C.line}`, background: C.surface + '60' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: C.cream }}>{ml}</span>
                  {tm && <span className={`text-[10px] px-1.5 py-0.5 rounded ${tm.status === 'presented' ? 'text-green-400 bg-green-900/30' : tm.status === 'reviewed' ? 'text-yellow-400 bg-yellow-900/30' : 'text-gray-400 bg-gray-700/30'}`}>{tm.status === 'presented' ? 'Presentado' : tm.status === 'reviewed' ? 'Revisado' : 'Borrador'}</span>}
                </div>
                <div className="flex gap-1">
                  {isCalc ? <span className="text-[10px]" style={{ color: C.muted }}><Clock className="w-3 h-3 inline animate-spin" /></span>
                  : tm ? <>
                    <button onClick={() => onDownloadPDF(code, currentYear, 0)} className="p-1 rounded hover:opacity-70" style={{ color: C.sageLight }}><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDownloadJSON(code, currentYear, 0)} className="p-1 rounded hover:opacity-70" style={{ color: C.brassLight }}><FileText className="w-3.5 h-3.5" /></button>
                  </>
                  : <button onClick={() => onCalculate(code, currentYear, 0)}
                      className="text-[10px] px-2 py-1 rounded w-full hover:opacity-80"
                      style={{ background: C.brass + '30', color: C.brassLight }}>Calcular borrador</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-3 rounded-lg text-xs" style={{ background: C.brass + '15', border: `1px solid ${C.brass}40`, color: C.brassLight }}>
        <AlertTriangle className="w-4 h-4 inline mr-1" />
        Los borradores son orientativos. Tu gestoría los revisa y presenta ante la AEAT.
      </div>
    </div>
  );
}
