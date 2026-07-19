'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  FileText, Download, CheckCircle, Clock, AlertTriangle, Plus, Trash2,
  FileSpreadsheet, Euro, Users, Building2, Settings,
  Upload, Search, X, ChevronDown, Check, Shield,
} from 'lucide-react';
import type { Theme } from '@/components/constants';

const TAX_MODELS = [
  { code: '303', label: 'IVA', period: 'Trimestral', desc: 'Impuesto sobre el Valor Añadido' },
  { code: '111', label: 'IRPF (trabajadores)', period: 'Trimestral', desc: 'Retenciones IRPF trabajo' },
  { code: '115', label: 'IRPF (alquileres)', period: 'Trimestral', desc: 'Retenciones IRPF alquiler' },
  { code: '130', label: 'Pago fraccionado', period: 'Trimestral', desc: 'Pago fraccionado IRPF autónomos' },
  { code: '349', label: 'Intracomunitario', period: 'Trimestral', desc: 'Declaración recapitulativa intracomunitaria' },
  { code: '347', label: 'Terceros', period: 'Anual', desc: 'Operaciones con terceros >3.005€' },
  { code: '390', label: 'IVA anual', period: 'Anual', desc: 'Resumen anual IVA' },
  { code: '190', label: 'IRPF anual', period: 'Anual', desc: 'Resumen anual retenciones IRPF' },
  { code: '180', label: 'Alquileres anual', period: 'Anual', desc: 'Resumen anual retenciones alquiler' },
];

const QUARTERS: { q: number; label: string; months: string; deadline: string }[] = [
  { q: 1, label: '1T', months: 'Ene–Mar', deadline: '20 abril' },
  { q: 2, label: '2T', months: 'Abr–Jun', deadline: '20 julio' },
  { q: 3, label: '3T', months: 'Jul–Sep', deadline: '20 octubre' },
  { q: 4, label: '4T', months: 'Oct–Dic', deadline: '30 enero' },
];

const ZONES = ['spain', 'eu', 'outside_eu'] as const;
type Zone = typeof ZONES[number];
const ZONE_LABELS: Record<Zone, string> = { spain: 'España', eu: 'UE', outside_eu: 'Fuera de la UE' };
const LINE_TYPES = ['good', 'service'] as const;
type LineType = typeof LINE_TYPES[number];
const TYPE_LABELS: Record<LineType, string> = { good: 'Bien', service: 'Servicio' };

interface GestoriaSettings {
  taxRegime: string;
  criterionOfCash: string;
  socialSecurityRed: string;
}

interface GestoriaLine {
  description: string;
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  withholding: number;
  zone: Zone;
  type: LineType;
  category: string;
}

interface GestoriaDocument {
  id: string;
  provider_name?: string;
  provider_nif?: string;
  file_name?: string;
  document_date?: string;
  documentDate?: string;
  notes?: string;
  is_periodic?: boolean;
  confirmed?: boolean;
  lines: string | GestoriaLine[];
}

interface GestoriaPayroll {
  id: string;
  employeeName?: string;
  employee_name?: string;
  employeeNif?: string;
  employee_nif?: string;
  month: number;
  year: number;
  grossAmount?: number;
  gross_amount?: number;
  irpfWithholding?: number;
  irpf_withholding?: number;
  ssWorker?: number;
  ssCompany?: number;
  social_security_company?: number;
  netAmount?: number;
  net_amount?: number;
  notes?: string;
}

interface TaxModel {
  model_code: string;
  year: number;
  quarter: number;
  status: string;
  data: Record<string, unknown>;
}

interface Authorization {
  accountant_name: string;
  accountant_nif: string;
  social_security_red: boolean;
  signed_at: number;
  revoked?: boolean;
}

interface GestoriaViewProps {
  sales: unknown[];
  colors: Theme;
}

export default function GestoriaView({ sales, colors: C }: GestoriaViewProps) {
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
        import('../../lib/api').then(m => m.fetchGestoriaSettings()),
        import('../../lib/api').then(m => m.fetchGestoriaTaxModels()),
      ]);
      setSettings((s as GestoriaSettings) || { taxRegime: 'autonomo', criterionOfCash: 'false', socialSecurityRed: '' });
      setTaxModels((tx as TaxModel[]) || []);
      const [ex, inc, pr, auth] = await Promise.all([
        import('../../lib/api').then(m => m.fetchGestoriaDocuments('expense')),
        import('../../lib/api').then(m => m.fetchGestoriaDocuments('income')),
        import('../../lib/api').then(m => m.fetchGestoriaPayrolls()),
        import('../../lib/api').then(m => m.fetchGestoriaAuthorization()),
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
    await import('../../lib/api').then(m => m.saveGestoriaSettings({ [key]: value }));
  }

  async function handleCalculate(modelCode: string, year = new Date().getFullYear(), quarter = 1) {
    setCalculating(`${modelCode}-${year}-${quarter}`);
    try {
      const res = await import('../../lib/api').then(m => m.calculateGestoriaTaxModel(modelCode, year, quarter));
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
      showToast(`${modelCode} ${QUARTERS[quarter - 1]?.label || ''} — borrador generado`);
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

  const tabs: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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

// ============ PANEL TAB ============
function PanelTab({ settings, taxModels, currentYear, calculating, getModelStatus, onCalculate, onDownloadPDF, onDownloadJSON, onDownloadCSV, C }: {
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

// ============ DOCUMENTS TAB ============
function DocumentsTab({ type, title, docs, onDataChange, C }: {
  type: string;
  title: string;
  docs: GestoriaDocument[];
  onDataChange: () => void;
  C: Theme;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = docs.filter(d =>
    !searchTerm || d.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.provider_nif?.includes(searchTerm)
  );
  const confirmedCount = docs.filter(d => d.confirmed).length;
  const totalBase = docs.reduce((s, d) => {
    const lines: GestoriaLine[] = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
    return s + lines.reduce((sl, l) => sl + Number(l.baseAmount || 0), 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs" style={{ color: C.muted }}>
          <span>{docs.length} documentos</span>
          <span style={{ color: C.sageLight }}>{confirmedCount} confirmados</span>
          <span style={{ color: C.brassLight }}>{title === 'Gastos' ? 'Total base: ' : 'Total ingresos: '}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBase)}</span>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.brass + '30', color: C.brassLight }}>
          <Plus className="w-3.5 h-3.5" /> {showForm ? 'Cerrar' : 'Añadir'}
        </button>
      </div>
      {showForm && <DocumentForm type={type} onSave={async (doc: Record<string, unknown>) => {
        const res = await import('../../lib/api').then(m => m.saveGestoriaDocument(doc));
        if ((res as { ok?: boolean })?.ok) { setShowForm(false); onDataChange(); }
      }} C={C} />}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.muted }} />
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por proveedor, NIF o archivo…"
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}`, paddingLeft: '2.5rem' }}
          className="w-full rounded-lg px-3 py-2 text-sm" />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }}><X className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ color: C.muted }}>
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay {title.toLowerCase()} registrados</p>
          </div>
        )}
        {filtered.map(doc => (
          <DocumentCard key={doc.id} doc={doc} type={type}
            onDelete={async () => {
              if (!confirm('¿Eliminar este documento?')) return;
              await import('../../lib/api').then(m => m.deleteGestoriaDocument(doc.id));
              onDataChange();
            }}
            onToggleConfirm={async () => {
              await import('../../lib/api').then(m => m.confirmGestoriaDocument(doc.id));
              onDataChange();
            }} C={C} />
        ))}
      </div>
    </div>
  );
}

function DocumentForm({ type, onSave, C }: {
  type: string;
  onSave: (doc: Record<string, unknown>) => Promise<void>;
  C: Theme;
}) {
  const [providerName, setProviderName] = useState('');
  const [providerNif, setProviderNif] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [lines, setLines] = useState<GestoriaLine[]>([{ description: '', baseAmount: 0, vatRate: 21, vatAmount: 0, withholding: 0, zone: 'spain', type: 'good', category: '' }]);

  function updateLine(idx: number, field: string, value: string | number) {
    setLines(prev => {
      const next = [...prev];
      (next[idx] as unknown as Record<string, unknown>)[field] = value;
      if (field === 'baseAmount' || field === 'vatRate') {
        const base = Number(next[idx].baseAmount || 0);
        const rate = Number(next[idx].vatRate || 0);
        next[idx].vatAmount = round2(base * rate / 100);
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validLines = lines.filter(l => l.description && Number(l.baseAmount) > 0);
    if (validLines.length === 0) return;
    await onSave({ type, fileName, providerName, providerNif, documentDate, notes, isPeriodic, lines: validLines });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Proveedor</label>
          <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Nombre del proveedor"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>NIF</label>
          <input type="text" value={providerNif} onChange={e => setProviderNif(e.target.value)} placeholder="B12345678"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Fecha del documento</label>
          <input type="date" value={documentDate} onChange={e => setDocumentDate(e.target.value)}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Archivo (opcional)</label>
          <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="factura_2026_01.pdf"
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
          <input type="checkbox" checked={isPeriodic} onChange={e => setIsPeriodic(e.target.checked)} className="rounded" style={{ accentColor: C.brass }} />
          Gasto/ingreso periódico (alquiler, suministro…)
        </label>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Líneas</span>
          <button type="button" onClick={() => setLines(prev => [...prev, { description: '', baseAmount: 0, vatRate: 21, vatAmount: 0, withholding: 0, zone: 'spain', type: 'good', category: '' }])}
            className="text-[10px] px-2 py-0.5 rounded hover:opacity-80" style={{ color: C.sageLight, background: C.sage + '20' }}>
            + Añadir línea
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {lines.map((l, i) => (
            <div key={i} className="rounded-lg p-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <div className="col-span-2 sm:col-span-4">
                  <input type="text" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Descripción del concepto"
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-2 py-1 text-xs" />
                </div>
                <div>
                  <span className="text-[9px]" style={{ color: C.muted }}>Base</span>
                  <input type="number" step="0.01" min="0" value={l.baseAmount} onChange={e => updateLine(i, 'baseAmount', Number(e.target.value))}
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-2 py-1 text-xs" />
                </div>
                <div>
                  <span className="text-[9px]" style={{ color: C.muted }}>IVA %</span>
                  <select value={l.vatRate} onChange={e => updateLine(i, 'vatRate', Number(e.target.value))}
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-2 py-1 text-xs">
                    {[21, 10, 4, 0].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div>
                  <span className="text-[9px]" style={{ color: C.muted }}>Ret. %</span>
                  <select value={l.withholding} onChange={e => updateLine(i, 'withholding', Number(e.target.value))}
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-2 py-1 text-xs">
                    {[0, 7, 15, 19].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div>
                  <span className="text-[9px]" style={{ color: C.muted }}>Zona</span>
                  <select value={l.zone} onChange={e => updateLine(i, 'zone', e.target.value)}
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-2 py-1 text-xs">
                    {ZONES.map(z => <option key={z} value={z}>{ZONE_LABELS[z]}</option>)}
                  </select>
                </div>
                <div>
                  <span className="text-[9px]" style={{ color: C.muted }}>Tipo</span>
                  <select value={l.type} onChange={e => updateLine(i, 'type', e.target.value)}
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-2 py-1 text-xs">
                    {LINE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                    className="flex items-center justify-center rounded-lg hover:opacity-70" style={{ color: C.wineLight, background: C.wine + '20' }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button type="submit" className="w-full rounded-lg py-2 text-sm font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>
        Guardar {type === 'expense' ? 'gasto' : 'ingreso'}
      </button>
    </form>
  );
}

function DocumentCard({ doc, type, onDelete, onToggleConfirm, C }: {
  doc: GestoriaDocument;
  type: string;
  onDelete: () => Promise<void>;
  onToggleConfirm: () => Promise<void>;
  C: Theme;
}) {
  const lines: GestoriaLine[] = typeof doc.lines === 'string' ? JSON.parse(doc.lines) : (doc.lines || []);
  const totalBase = lines.reduce((s, l) => s + Number(l.baseAmount || 0), 0);
  const totalVat = lines.reduce((s, l) => s + Number(l.vatAmount || 0), 0);
  const hasEu = lines.some(l => (l.zone || 'spain') !== 'spain');
  const docDate = doc.document_date || doc.documentDate || '';

  return (
    <div className="rounded-lg p-3" style={{ background: C.surfaceLight, border: `1px solid ${doc.confirmed ? C.sage : C.line}` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate" style={{ color: C.cream }}>
              {doc.provider_name || doc.file_name || 'Sin nombre'}
            </span>
            {doc.confirmed ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: C.sageLight }} />
              : <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: C.muted }} />}
            {doc.is_periodic && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.brass + '30', color: C.brassLight }}>Periódico</span>}
            {hasEu && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: C.sage + '30', color: C.sageLight }}>UE / Extranjero</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ color: C.muted }}>
            {doc.provider_nif && <span>NIF: {doc.provider_nif}</span>}
            {docDate && <span>{docDate}</span>}
            {doc.file_name && <span className="truncate max-w-[200px]">{doc.file_name}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span style={{ color: C.brassLight }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBase)}</span>
            <span style={{ color: C.muted }}>IVA: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalVat)}</span>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="text-[10px]" style={{ color: C.muted }}>
              {l.description} — {ZONE_LABELS[l.zone || 'spain']} ({TYPE_LABELS[l.type || 'good']})
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggleConfirm} className="p-1.5 rounded-lg hover:opacity-70"
            style={{ color: doc.confirmed ? C.sageLight : C.muted, background: doc.confirmed ? C.sage + '20' : 'transparent' }}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: C.wineLight }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PAYROLLS TAB ============
function PayrollsTab({ payrolls, onDataChange, C }: {
  payrolls: GestoriaPayroll[];
  onDataChange: () => void;
  C: Theme;
}) {
  const [showForm, setShowForm] = useState(false);

  const byMonth: Record<string, GestoriaPayroll[]> = {};
  for (const p of payrolls) {
    const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(p);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: C.muted }}>{payrolls.length} nóminas registradas</span>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
          style={{ background: C.brass + '30', color: C.brassLight }}>
          <Plus className="w-3.5 h-3.5" /> {showForm ? 'Cerrar' : 'Añadir nómina'}
        </button>
      </div>
      {showForm && <PayrollForm onSave={async (p: Record<string, unknown>) => {
        const res = await import('../../lib/api').then(m => m.saveGestoriaPayroll(p));
        if ((res as { ok?: boolean })?.ok) { setShowForm(false); onDataChange(); }
      }} C={C} />}
      {Object.keys(byMonth).length === 0 ? (
        <div className="text-center py-10" style={{ color: C.muted }}>
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay nóminas registradas</p>
          <p className="text-xs mt-1">Añade las nóminas del mes para que los modelos 111 y 130 las incluyan</p>
        </div>
      ) : (
        Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([key, noms]) => {
          const [year, month] = key.split('-');
          const monthName = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][parseInt(month)];
          const totalGross = noms.reduce((s, p) => s + Number(p.grossAmount || p.gross_amount || 0), 0);
          const totalIrpf = noms.reduce((s, p) => s + Number(p.irpfWithholding || p.irpf_withholding || 0), 0);
          const totalSs = noms.reduce((s, p) => s + Number(p.ssCompany || p.social_security_company || 0), 0);
          return (
            <div key={key} className="rounded-lg" style={{ border: `1px solid ${C.line}`, background: C.surface + '60' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background: C.surfaceLight }}>
                <span className="text-sm font-medium" style={{ color: C.brassLight }}>{monthName} {year}</span>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: C.muted }}>
                  <span>Bruto: <strong style={{ color: C.cream }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalGross)}</strong></span>
                  <span>IRPF: <strong style={{ color: C.cream }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIrpf)}</strong></span>
                  <span>SS: <strong style={{ color: C.cream }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalSs)}</strong></span>
                </div>
              </div>
              {noms.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div>
                    <span className="text-sm" style={{ color: C.cream }}>{p.employeeName || p.employee_name}</span>
                    <span className="text-[10px] ml-2" style={{ color: C.muted }}>{p.employeeNif || p.employee_nif}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: C.muted }}>
                    <span>Bruto: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(p.grossAmount || p.gross_amount || 0))}</span>
                    <span>Neto: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(p.netAmount || p.net_amount || 0))}</span>
                    <button onClick={async () => {
                      if (!confirm('¿Eliminar esta nómina?')) return;
                      await import('../../lib/api').then(m => m.deleteGestoriaPayroll(p.id));
                      onDataChange();
                    }} className="p-1 rounded hover:opacity-70" style={{ color: C.wineLight }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

function PayrollForm({ onSave, C }: {
  onSave: (p: Record<string, unknown>) => Promise<void>;
  C: Theme;
}) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNif, setEmployeeNif] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [grossAmount, setGrossAmount] = useState(0);
  const [irpfWithholding, setIrpfWithholding] = useState(0);
  const [ssWorker, setSsWorker] = useState(0);
  const [ssCompany, setSsCompany] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [notes, setNotes] = useState('');

  return (
    <form onSubmit={async (e: FormEvent) => {
      e.preventDefault();
      const net = Number(netAmount) || round2(Number(grossAmount) - Number(irpfWithholding) - Number(ssWorker));
      await onSave({ employeeName, employeeNif, month, year, grossAmount: Number(grossAmount), irpfWithholding: Number(irpfWithholding), ssWorker: Number(ssWorker), ssCompany: Number(ssCompany), netAmount: net, notes });
    }}
      className="rounded-lg p-4 space-y-3" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Empleado</label>
          <input type="text" value={employeeName} onChange={e => setEmployeeName(e.target.value)} required
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>NIF</label>
          <input type="text" value={employeeNif} onChange={e => setEmployeeNif(e.target.value)} required
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Mes</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][i]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Año</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Bruto</label>
          <input type="number" step="0.01" value={grossAmount} onChange={e => setGrossAmount(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>IRPF</label>
          <input type="number" step="0.01" value={irpfWithholding} onChange={e => setIrpfWithholding(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>SS trab.</label>
          <input type="number" step="0.01" value={ssWorker} onChange={e => setSsWorker(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>SS empresa</label>
          <input type="number" step="0.01" value={ssCompany} onChange={e => setSsCompany(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Neto</label>
          <input type="number" step="0.01" value={netAmount} onChange={e => setNetAmount(Number(e.target.value))}
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
        </div>
      </div>
      <button type="submit" className="w-full rounded-lg py-2 text-sm font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>Guardar nómina</button>
    </form>
  );
}

// ============ RÉGIMEN TAB ============
function RegimenTab({ settings, onUpdate, C }: {
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

// ============ AUTHORIZATION TAB ============
function AuthorizationTab({ authorization, onDataChange, C }: {
  authorization: Authorization | null;
  onDataChange: () => void;
  C: Theme;
}) {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [socialRed, setSocialRed] = useState(false);

  useEffect(() => {
    if (authorization) {
      setName(authorization.accountant_name || '');
      setNif(authorization.accountant_nif || '');
      setSocialRed(authorization.social_security_red || false);
    }
  }, [authorization]);

  const isAuthorized = authorization?.signed_at && !authorization?.revoked;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg p-4" style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: C.cream }}>Tu gestoría</h3>
        <p className="text-xs mb-4" style={{ color: C.muted }}>
          Autoriza a tu gestoría a presentar tus impuestos y gestionar la Seguridad Social.
          Una vez firmado, puedes descargar el mandato y revocarlo cuando quieras.
        </p>
        {isAuthorized ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: C.sage + '20', border: `1px solid ${C.sage}40` }}>
              <Shield className="w-5 h-5" style={{ color: C.sageLight }} />
              <div>
                <p className="text-sm font-medium" style={{ color: C.sageLight }}>Gestoría autorizada</p>
                <p className="text-xs" style={{ color: C.muted }}>
                  {authorization.accountant_name} ({authorization.accountant_nif}) · Desde {new Date(authorization.signed_at).toLocaleDateString('es-ES')}
                </p>
                {authorization.social_security_red && <p className="text-[10px]" style={{ color: C.sageLight }}>✓ Asignación RED de la Seguridad Social confirmada</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                const auth = await import('../../lib/api').then(m => m.fetchGestoriaAuthorization()) as Authorization;
                const html = generateAuthorizationPDF(auth);
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.brass + '30', color: C.brassLight }}>
                <Download className="w-3.5 h-3.5" /> Descargar mandato
              </button>
              <button onClick={async () => {
                if (!confirm('¿Revocar la autorización? Tu gestoría ya no podrá presentar impuestos en tu nombre.')) return;
                await import('../../lib/api').then(m => m.saveGestoriaAuthorization({ revoke: true }));
                onDataChange();
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.wine + '30', color: C.wineLight }}>
                Revocar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Nombre de la gestoría</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>NIF de la gestoría</label>
                <input type="text" value={nif} onChange={e => setNif(e.target.value)}
                  style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }} className="w-full rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs" style={{ color: C.cream }}>
              <input type="checkbox" checked={socialRed} onChange={e => setSocialRed(e.target.checked)} className="rounded" style={{ accentColor: C.brass }} />
              Confirmar asignación RED de la Seguridad Social
            </label>
            <p className="text-[10px]" style={{ color: C.muted }}>
              Al autorizar, firmas el mandato de colaboración social de Hacienda. Tu gestoría podrá presentar
              tus modelos tributarios y tramitar altas y bajas de trabajadores en tu nombre.
            </p>
            <button onClick={async () => {
              if (!name || !nif) return;
              if (!confirm('¿Confirmas la autorización? Tu gestoría podrá presentar tus impuestos.')) return;
              await import('../../lib/api').then(m => m.saveGestoriaAuthorization({ name, nif, signedAt: Date.now(), socialRed }));
              onDataChange();
            }} className="w-full rounded-lg py-2 text-sm font-medium hover:opacity-80" style={{ background: C.sage, color: '#000' }}>
              <Shield className="w-4 h-4 inline mr-1.5" /> Autorizar gestoría
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ PDF GENERATION ============

function generateModelPDF(code: string, data: Record<string, unknown>, year: number, quarter: number) {
  const quarterLabel = quarter > 0 ? `${quarter}º trimestre` : 'Resumen anual';
  const title = `Modelo ${code} — ${year} ${quarterLabel}`;
  const rows = Object.entries(data || {}).filter(([k]) => !['anual', 'trimestres', 'nota'].includes(k));
  const nota = data?.nota || '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; padding: 0; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #222; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 3px 0; font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-size: 10px; border: 1px solid #ccc; }
    td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
    .r { text-align: right; }
    .result { font-weight: bold; background: #f5f5f5; }
    .nota { margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 10px; }
    .footer { margin-top: 30px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
  </style></head><body>
    <div class="header">
      <h1>Modelo ${code}</h1>
      <p><strong>${title}</strong></p>
      <p>Borrador — Revisado y presentado por tu gestoría</p>
    </div>
    <table>
      <tr><th>Casilla</th><th>Importe</th></tr>
      ${rows.map(([k, v]) => {
        const label = formatFieldName(k);
        const val = typeof v === 'number' ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v) : String(v);
        return `<tr${k.startsWith('resultado') ? ' class="result"' : ''}><td>${label}</td><td class="r">${val}</td></tr>`;
      }).join('\n')}
    </table>
    ${(nota as string) ? `<div class="nota">⚠️ ${nota}</div>` : ''}
    <div class="footer">
      Mesero · Borrador informativo · Tu gestoría revisa y presenta ante la AEAT<br>
      Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </div>
  </body></html>`;
}

function generateModelCSV(code: string, data: Record<string, unknown>) {
  const rows = Object.entries(data || {}).filter(([k]) => !['anual', 'trimestres', 'nota'].includes(k));
  return ['casilla,valor', ...rows.map(([k, v]) => `${k},${typeof v === 'number' ? v.toFixed(2) : String(v)}`)].join('\n');
}

function generateAuthorizationPDF(auth: Authorization) {
  if (!auth) return '<html><body>No hay autorización</body></html>';
  const d = new Date(auth.signed_at);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 20mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
    .content { max-width: 500px; margin: 0 auto; }
    .signature { margin-top: 40px; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
    table { width: 100%; margin: 15px 0; }
    td { padding: 4px 8px; }
    .label { font-weight: bold; width: 140px; }
  </style></head><body>
    <h1>Mandato de Colaboración Social</h1>
    <div class="content">
      <p>Por el presente documento, el contribuyente autoriza a su gestoría a presentar declaraciones tributarias y realizar trámites ante la Administración.</p>
      <table>
        <tr><td class="label">Gestoría:</td><td>${auth.accountant_name || '—'}</td></tr>
        <tr><td class="label">NIF Gestoría:</td><td>${auth.accountant_nif || '—'}</td></tr>
        <tr><td class="label">Fecha firma:</td><td>${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td class="label">Seguridad Social RED:</td><td>${auth.social_security_red ? 'Sí ✓' : 'No'}</td></tr>
        <tr><td class="label">Estado:</td><td>${auth.revoked ? 'REVOCADO' : 'Activo'}</td></tr>
      </table>
      <div class="signature"><div style="margin-top:20px; border-top: 1px solid #222; padding-top: 5px;">Firma del contribuyente</div></div>
    </div>
    <div class="footer">Mesero · Documento generado el ${new Date().toLocaleDateString('es-ES')}</div>
  </body></html>`;
}

function formatFieldName(key: string) {
  const map: Record<string, string> = {
    casilla_01: 'Base imponible general', casilla_03: 'IVA devengado 21%',
    casilla_07: 'IVA devengado UE', casilla_08: 'Total IVA devengado',
    casilla_09: 'Base imponible deducible', casilla_11: 'IVA deducible',
    casilla_13: 'IVA deducible UE', casilla_14: 'Total IVA deducible',
    resultado: 'Resultado (a ingresar / a devolver)',
    ingresos: 'Ingresos computables', gastos: 'Gastos deducibles',
    rendimiento: 'Rendimiento neto', base_imponible: 'Base imponible',
    cuota_integra: 'Cuota íntegra (20%)', retenciones: 'Retenciones soportadas',
    trabajadores: 'Nº trabajadores', total_remuneraciones: 'Total remuneraciones',
    retencion_trabajo: 'Retención IRPF trabajo', retencion_profesionales: 'Retención IRPF profesionales',
    total_retenciones: 'Total retenciones ingresadas',
    alquileres: 'Nº alquileres', base_retencion: 'Base de retención',
    retencion_ingresada: 'Retención ingresada',
    entregas_intra: 'Entregas intracomunitarias', adquisiciones_intra: 'Adquisiciones intracomunitarias',
    total_operaciones: 'Total operaciones', nota: 'Nota',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function round2(n: number) { return Math.round(Number(n) * 100) / 100; }
