'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import type { Theme } from '@/components/constants';
import type { GestoriaPayroll } from './types';
import { round2 } from './utils';

export function PayrollsTab({ payrolls, onDataChange, C }: {
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
        const res = await import('../../../lib/api').then(m => m.saveGestoriaPayroll(p));
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
          const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const monthName = monthNames[parseInt(month)];
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
                      await import('../../../lib/api').then(m => m.deleteGestoriaPayroll(p.id));
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
