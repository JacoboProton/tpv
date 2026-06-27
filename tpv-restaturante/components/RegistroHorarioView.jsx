'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Download, FileText, X, Save, ChevronLeft, ChevronRight, Clock, Users, Check, AlertTriangle, Loader2 } from 'lucide-react';

export default function RegistroHorarioView({ employees, colors: C }) {
  const [allLogs, setAllLogs] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [period, setPeriod] = useState('semana');
  const [fromDate, setFromDate] = useState(() => getPeriodRange('semana').from);
  const [toDate, setToDate] = useState(() => getPeriodRange('semana').to);
  const [editModal, setEditModal] = useState(null);
  const [subTab, setSubTab] = useState('registros');

  useEffect(() => {
    if (period === 'personalizado') return;
    const r = getPeriodRange(period);
    setFromDate(r.from);
    setToDate(r.to);
  }, [period]);

  useEffect(() => { loadData(); }, [employeeFilter, fromDate, toDate]);

  function getPeriodRange(p) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (p === 'semana') {
      const start = new Date(now); start.setDate(start.getDate() - start.getDay() + 1);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    if (p === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    if (p === 'mes-anterior') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    return { from: today, to: today };
  }

  async function loadData() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (employeeFilter) q.set('employeeId', employeeFilter);
      if (fromDate) q.set('from', fromDate);
      if (toDate) q.set('to', toDate);
      const r = await fetch(`/api/clockin?${q}`);
      if (r.ok) setAllLogs(await r.json());
    } catch {}
    try {
      const cr = await fetch('/api/clockin-corrections');
      if (cr.ok) setCorrections(await cr.json());
    } catch {}
    setLoading(false);
  }

  // Group logs into sessions
  const sessions = useMemo(() => {
    const byEmp = {};
    allLogs.forEach(log => {
      const key = log.employeeId + '|' + log.clockinDate;
      if (!byEmp[key]) byEmp[key] = { employeeId: log.employeeId, employeeName: log.employeeName, date: log.clockinDate, logs: [], entrada: null, salida: null, pausas: [] };
      byEmp[key].logs.push(log);
    });

    return Object.values(byEmp).map(session => {
      session.logs.sort((a, b) => a.createdAt - b.createdAt);
      let lastPausa = null;
      session.logs.forEach(l => {
        if (l.action === 'entrada') session.entrada = l;
        else if (l.action === 'salida') session.salida = l;
        else if (l.action === 'pausa') { lastPausa = l; session.pausas.push({ start: l, end: null }); }
        else if (l.action === 'vuelta' && lastPausa) {
          if (session.pausas.length > 0) session.pausas[session.pausas.length - 1].end = l;
          lastPausa = null;
        }
      });

      const start = session.entrada ? session.entrada.createdAt : 0;
      const end = session.salida ? session.salida.createdAt : Date.now();
      session.totalMinutes = start ? Math.round((end - start) / 60000) : 0;
      session.pauseMinutes = session.pausas.reduce((s, p) => s + (p.end ? Math.round((p.end.createdAt - p.start.createdAt) / 60000) : 0), 0);
      session.effectiveMinutes = session.totalMinutes - session.pauseMinutes;
      session.edited = session.logs.some(l => l.edited);
      return session;
    }).sort((a, b) => b.date.localeCompare(a.date) || (b.entrada?.createdAt || 0) - (a.entrada?.createdAt || 0));
  }, [allLogs]);

  function formatTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(d) {
    return new Date(d + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  function fmtMins(m) {
    if (!m && m !== 0) return '—';
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return `${h}h ${min}m`;
  }

  async function handleEditRecord(id, newCreatedAt, newAction, reason) {
    try {
      await fetch('/api/clockin', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'edit-record', id, createdAt: newCreatedAt,
          action: newAction, editedBy: 'admin', editReason: reason,
        }),
      });
      setEditModal(null);
      loadData();
    } catch {}
  }

  async function handleCloseOpen() {
    if (!confirm('¿Cerrar todos los fichajes abiertos del período?')) return;
    try {
      await fetch('/api/clockin', {
        method: 'PUT',
        body: JSON.stringify({ action: 'close-open', date: toDate, editedBy: 'admin' }),
      });
      loadData();
    } catch {}
  }

  async function handleResolveCorrection(id, status) {
    try {
      await fetch('/api/clockin', {
        method: 'PUT',
        body: JSON.stringify({ action: 'resolve-correction', correctionId: id, status, resolvedBy: 'admin' }),
      });
      loadData();
    } catch {}
  }

  function downloadCSV() {
    const rows = [
      ['Fecha', 'Empleado', 'Entrada', 'Salida', 'Total', 'Efectivas', 'Descanso', 'Editado'],
      ...sessions.map(s => [
        s.date, s.employeeName,
        formatTime(s.entrada?.createdAt), formatTime(s.salida?.createdAt),
        fmtMins(s.totalMinutes), fmtMins(s.effectiveMinutes), fmtMins(s.pauseMinutes),
        s.edited ? 'Sí' : '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `registro-horario-${fromDate}-${toDate}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function downloadPDF() {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import('jspdf'), import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.setTextColor(200, 169, 110);
    doc.text('Registro de Jornada', 14, 20);
    doc.setFontSize(8);
    doc.setTextColor(140, 130, 120);
    doc.text(`${fromDate} — ${toDate}`, 280, 20, { align: 'right' });
    doc.line(14, 24, 280, 24);

    const body = sessions.map(s => [
      s.date, s.employeeName,
      formatTime(s.entrada?.createdAt), formatTime(s.salida?.createdAt),
      fmtMins(s.totalMinutes), fmtMins(s.effectiveMinutes), fmtMins(s.pauseMinutes),
      s.edited ? 'Editado' : '',
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Fecha', 'Empleado', 'Entrada', 'Salida', 'Total', 'Efectivas', 'Descanso', 'Notas']],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [122, 139, 106], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 238, 235] },
    });

    doc.save(`registro-horario-${fromDate}-${toDate}.pdf`);
  }

  const totalEffective = sessions.reduce((s, x) => s + (x.effectiveMinutes || 0), 0);
  const openSessions = sessions.filter(s => s.entrada && !s.salida).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Registro Horario</h2>
        <div className="flex items-center gap-2">
          {openSessions > 0 && (
            <button onClick={handleCloseOpen}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: C.wine + '30', color: C.wineLight }}>
              <AlertTriangle className="w-3 h-3" /> Cerrar {openSessions} abiertos
            </button>
          )}
          {corrections.filter(c => c.status === 'pending').length > 0 && (
            <button onClick={() => setSubTab('solicitudes')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
              style={{ background: C.brass + '30', color: C.brassLight }}>
              {corrections.filter(c => c.status === 'pending').length} solicitudes
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b pb-2" style={{ borderColor: C.line }}>
        {['registros', 'solicitudes'].map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: subTab === t ? C.surfaceLight : 'transparent', color: subTab === t ? C.brassLight : C.muted }}>
            {t === 'registros' ? 'Registros' : 'Solicitudes'}
          </button>
        ))}
      </div>

      {subTab === 'solicitudes' ? (
        <div className="space-y-2">
          {corrections.filter(c => c.status === 'pending').length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: C.muted }}>No hay solicitudes de corrección pendientes</p>
          ) : (
            corrections.filter(c => c.status === 'pending').map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: C.surfaceLight }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: C.cream }}>{c.employee_name}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{c.reason}</p>
                </div>
                <button onClick={() => handleResolveCorrection(c.id, 'approved')}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: C.sage + '30', color: C.sage }}>
                  <Check className="w-3 h-3" /> Aprobar
                </button>
                <button onClick={() => handleResolveCorrection(c.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: C.wine + '30', color: C.wineLight }}>
                  <X className="w-3 h-3" /> Rechazar
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="rounded-lg px-3 py-2 text-xs">
              <option value="">Todos los empleados</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {['semana', 'mes', 'mes-anterior', 'personalizado'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium"
                style={{ background: period === p ? C.surfaceLight : 'transparent', color: period === p ? C.brassLight : C.muted }}>
                {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : p === 'mes-anterior' ? 'Mes ant.' : 'Personalizado'}
              </button>
            ))}
            {period === 'personalizado' && (
              <>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                  className="rounded-lg px-2 py-1.5 text-xs" />
                <span style={{ color: C.muted }} className="text-xs">→</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
                  className="rounded-lg px-2 py-1.5 text-xs" />
              </>
            )}
            <div className="flex-1" />
            <button onClick={downloadCSV} style={{ color: C.muted, background: C.surfaceLight }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] hover:opacity-80">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={downloadPDF} style={{ color: C.cream, background: C.brass + '30' }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] hover:opacity-80">
              <FileText className="w-3 h-3" /> PDF
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <p className="text-[10px] uppercase" style={{ color: C.muted }}>Registros</p>
              <p className="font-display text-lg" style={{ color: C.cream }}>{sessions.length}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <p className="text-[10px] uppercase" style={{ color: C.muted }}>Horas totales</p>
              <p className="font-display text-lg" style={{ color: C.brassLight }}>{fmtMins(totalEffective)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <p className="text-[10px] uppercase" style={{ color: C.muted }}>Abiertos</p>
              <p className="font-display text-lg" style={{ color: openSessions > 0 ? C.wineLight : C.sage }}>{openSessions}</p>
            </div>
          </div>

          {/* Sessions list */}
          {loading ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /></div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: C.muted }}>Sin registros en este período</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs" style={{ background: C.surfaceLight, borderLeft: `3px solid ${!s.salida ? C.wine : s.edited ? C.brass : C.sage}` }}>
                  <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-2 items-center">
                    <span className="font-medium" style={{ color: C.cream }}>{formatDate(s.date)}</span>
                    <span style={{ color: C.muted }}>{s.employeeName}</span>
                    <span className="font-mono" style={{ color: C.sageLight }}>{formatTime(s.entrada?.createdAt)}</span>
                    <span className="font-mono" style={{ color: s.salida ? C.wineLight : C.muted }}>{formatTime(s.salida?.createdAt)}</span>
                    <span className="font-mono" style={{ color: C.brassLight }}>{fmtMins(s.effectiveMinutes)}</span>
                    {s.edited && <span className="text-[8px] px-1 py-px rounded" style={{ background: C.brass + '30', color: C.brassLight }}>Editado</span>}
                    {!s.salida && <span className="text-[8px] px-1 py-px rounded" style={{ background: C.wine + '30', color: C.wineLight }}>Abierto</span>}
                  </div>
                  <button onClick={() => setEditModal(s)}
                    className="shrink-0 p-1 rounded hover:opacity-70" style={{ color: C.muted }}>
                    ✎
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      {editModal && (
        <EditRecordModal session={editModal} onSave={handleEditRecord} onClose={() => setEditModal(null)} C={C} />
      )}
    </div>
  );
}

function EditRecordModal({ session, onSave, onClose, C }) {
  const [entradaTime, setEntradaTime] = useState(() => session.entrada ? new Date(session.entrada.createdAt).toISOString().slice(0, 16) : '');
  const [salidaTime, setSalidaTime] = useState(() => session.salida ? new Date(session.salida.createdAt).toISOString().slice(0, 16) : '');
  const [pauseMinutes, setPauseMinutes] = useState(session.pauseMinutes || 0);
  const [reason, setReason] = useState('');

  async function handleSave() {
    if (entradaTime) {
      await onSave(session.entrada.id, new Date(entradaTime).getTime(), 'entrada', reason);
    }
    if (salidaTime) {
      await onSave(session.salida.id, new Date(salidaTime).getTime(), 'salida', reason);
    }
    if (pauseMinutes !== session.pauseMinutes) {
      // Adjust pause duration by modifying vuelta time
      const lastPause = session.pausas[session.pausas.length - 1];
      if (lastPause?.end && session.salida) {
        const currentPauseMins = Math.round((lastPause.end.createdAt - lastPause.start.createdAt) / 60000);
        if (currentPauseMins !== pauseMinutes) {
          const diff = pauseMinutes - currentPauseMins;
          const newVueltaTime = lastPause.end.createdAt + diff * 60000;
          await onSave(lastPause.end.id, newVueltaTime, 'vuelta', reason + ' (ajuste descanso)');
        }
      }
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: C.cream }}>Editar registro</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[10px]" style={{ color: C.muted }}>{session.employeeName} — {session.date}</p>
        <div className="text-[10px] p-2 rounded" style={{ background: C.wine + '15', color: C.wineLight }}>⚠️ Las correcciones quedan auditadas como «Editado manualmente».</div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase" style={{ color: C.muted }}>Entrada</label>
            <input type="datetime-local" value={entradaTime} onChange={e => setEntradaTime(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] uppercase" style={{ color: C.muted }}>Salida</label>
            <input type="datetime-local" value={salidaTime} onChange={e => setSalidaTime(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] uppercase" style={{ color: C.muted }}>Descanso (minutos)</label>
            <input type="number" min={0} value={pauseMinutes} onChange={e => setPauseMinutes(Number(e.target.value))}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] uppercase" style={{ color: C.muted }}>Motivo de la corrección *</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} required
              placeholder="Ej: olvidó fichar salida"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm mt-0.5" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!reason}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-40"
            style={{ background: C.brass, color: '#000' }}>
            <Save className="w-3.5 h-3.5 inline mr-1" /> Guardar cambios
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm" style={{ background: C.surfaceLight, color: C.muted }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
