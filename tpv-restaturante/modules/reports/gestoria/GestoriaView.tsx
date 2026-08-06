'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, Euro, Users, Building2, Settings, Shield, Clock } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { GestoriaSettings, TaxModel, GestoriaDocument, GestoriaPayroll, Authorization } from './types';
import { generateModelPDF, generateModelCSV } from './utils';
import { useUi } from '@/modules/core/app-contexts';
import { PanelTab } from './PanelTab';
import { DocumentsTab } from './DocumentsTab';
import { PayrollsTab } from './PayrollsTab';
import { RegimenTab } from './RegimenTab';
import { AuthorizationTab } from './AuthorizationTab';

export default function GestoriaView() {
  const { colors: C } = useUi()
  const [tab, setTab] = useState('panel');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<GestoriaSettings>({ taxRegime: 'autonomo', criterionOfCash: 'false', socialSecurityRed: '' });
  const [expenses, setExpenses] = useState<GestoriaDocument[]>([]);
  const [incomes, setIncomes] = useState<GestoriaDocument[]>([]);
  const [payrolls, setPayrolls] = useState<GestoriaPayroll[]>([]);
  const [taxModels, setTaxModels] = useState<TaxModel[]>([]);
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [calculating, setCalculating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function loadAll() {
    setLoading(true);
    try {
      const [s, tx] = await Promise.all([
        import('../../../lib/api').then(m => m.fetchGestoriaSettings()),
        import('../../../lib/api').then(m => m.fetchGestoriaTaxModels()),
      ]);
      setSettings((s as GestoriaSettings) || { taxRegime: 'autonomo', criterionOfCash: 'false', socialSecurityRed: '' });
      setTaxModels((tx as TaxModel[]) || []);
      const [ex, inc, pr, auth] = await Promise.all([
        import('../../../lib/api').then(m => m.fetchGestoriaDocuments('expense')),
        import('../../../lib/api').then(m => m.fetchGestoriaDocuments('income')),
        import('../../../lib/api').then(m => m.fetchGestoriaPayrolls()),
        import('../../../lib/api').then(m => m.fetchGestoriaAuthorization()),
      ]);
      setExpenses((ex as GestoriaDocument[]) || []);
      setIncomes((inc as GestoriaDocument[]) || []);
      setPayrolls((pr as GestoriaPayroll[]) || []);
      setAuthorization((auth as Authorization) || null);
    } catch (e) { showToast((e as Error).message); }
    setLoading(false);
  }

  async function updateSettings(key: string, value: string) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await import('../../../lib/api').then(m => m.saveGestoriaSettings({ [key]: value }));
  }

  async function handleCalculate(modelCode: string, year = new Date().getFullYear(), quarter = 1) {
    setCalculating(`${modelCode}-${year}-${quarter}`);
    try {
      const res = await import('../../../lib/api').then(m => m.calculateGestoriaTaxModel(modelCode, year, quarter));
      const { data } = res as { data: Record<string, unknown> };
      setTaxModels(prev => {
        const idx = prev.findIndex(t => t.model_code === modelCode && t.year === year && t.quarter === quarter);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], data, status: 'draft' };
          return next;
        }
        return [...prev, { model_code: modelCode, year, quarter, status: 'draft', data }];
      });
      const quarterLabels = ['', '1T', '2T', '3T', '4T'];
      showToast(`${modelCode} ${quarterLabels[quarter] || ''} — borrador generado`);
    } catch (e) { showToast((e as Error).message); }
    setCalculating(null);
  }

  function getModelStatus(code: string, year: number, quarter: number): TaxModel | null {
    return taxModels.find(t => t.model_code === code && t.year === year && t.quarter === quarter) || null;
  }

  function downloadModelJSON(code: string, year: number, quarter: number) {
    const m = getModelStatus(code, year, quarter);
    if (!m || !m.data) return;
    const blob = new Blob([JSON.stringify(m.data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `modelo_${code}_${year}_Q${quarter}.json`);
    showToast(`Descargado ${code} — formato JSON`);
  }

  function downloadModelPDF(code: string, year: number, quarter: number) {
    const m = getModelStatus(code, year, quarter);
    if (!m || !m.data) return;
    const html = generateModelPDF(code, m.data, year, quarter);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    else showToast('Permite ventanas emergentes para descargar el PDF');
  }

  function downloadModelCSV(code: string, year: number, quarter: number) {
    const m = getModelStatus(code, year, quarter);
    if (!m || !m.data) return;
    const csv = generateModelCSV(code, m.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `modelo_${code}_${year}_Q${quarter}.csv`);
    showToast(`Descargado ${code} — formato CSV`);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const currentYear = new Date().getFullYear();

  if (loading) return (
    <div className="flex items-center justify-center py-20" style={{ color: C.muted }}>
      <Clock className="w-5 h-5 animate-spin mr-2" /> Cargando gestoría…
    </div>
  );

  const tabs = [
    { id: 'panel', label: 'Modelos', icon: FileText },
    { id: 'gastos', label: 'Gastos', icon: Euro },
    { id: 'ingresos', label: 'Ingresos', icon: Euro },
    { id: 'nominas', label: 'Nóminas', icon: Users },
    { id: 'regimen', label: 'Régimen', icon: Settings },
    { id: 'autorizacion', label: 'Tu gestoría', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in" style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
          {toast}
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold" style={{ color: C.cream }}>Gestoría</h1>
        <p className="text-xs mt-1" style={{ color: C.muted }}>
          Tus ventas, gastos y nóminas convertidos en borradores de impuestos.
          Tu gestoría los revisa y presenta.
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 border-b" style={{ borderColor: C.line }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? C.surfaceLight : 'transparent',
                color: tab === t.id ? C.brassLight : C.muted,
                borderBottom: tab === t.id ? `2px solid ${C.brass}` : '2px solid transparent',
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors shrink-0">
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="fade-up" key={tab} style={{ maxHeight: 'calc(100vh - 190px)', overflowY: 'auto' }}>
        {tab === 'panel' && <PanelTab
          settings={settings} taxModels={taxModels} currentYear={currentYear}
          calculating={calculating} getModelStatus={getModelStatus}
          onCalculate={handleCalculate}
          onDownloadPDF={downloadModelPDF} onDownloadJSON={downloadModelJSON} onDownloadCSV={downloadModelCSV}
          C={C} />}
        {tab === 'gastos' && <DocumentsTab type="expense" title="Gastos" docs={expenses} onDataChange={loadAll} C={C} />}
        {tab === 'ingresos' && <DocumentsTab type="income" title="Ingresos fuera del TPV" docs={incomes} onDataChange={loadAll} C={C} />}
        {tab === 'nominas' && <PayrollsTab payrolls={payrolls} onDataChange={loadAll} C={C} />}
        {tab === 'regimen' && <RegimenTab settings={settings} onUpdate={updateSettings} C={C} />}
        {tab === 'autorizacion' && <AuthorizationTab authorization={authorization} onDataChange={loadAll} C={C} />}
      </div>
    </div>
  );
}
