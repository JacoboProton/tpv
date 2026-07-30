'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Search, X, FileText, Check, CheckCircle, Clock, Trash2 } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { GestoriaDocument, GestoriaLine } from './types';
import { ZONES, ZONE_LABELS, LINE_TYPES, TYPE_LABELS } from './types';
import { round2 } from './utils';

export function DocumentsTab({ type, title, docs, onDataChange, C }: {
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
        const res = await import('../../../lib/api').then(m => m.saveGestoriaDocument(doc));
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
              await import('../../../lib/api').then(m => m.deleteGestoriaDocument(doc.id));
              onDataChange();
            }}
            onToggleConfirm={async () => {
              await import('../../../lib/api').then(m => m.confirmGestoriaDocument(doc.id));
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
