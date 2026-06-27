'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, QrCode, Share2, MessageCircle, Clock, Loader2, User } from 'lucide-react';

const ROLES = [
  { id: 'camarero', label: 'Camarero' },
  { id: 'manager',  label: 'Manager' },
  { id: 'admin',    label: 'Admin / Propietario' },
  { id: 'cocina',   label: 'Cocina' },
];

export default function EmpleadosView({
  employees, colors: C, onAdd, onUpdateField, onDelete,
  confirmDeleteId, setConfirmDeleteId,
}) {
  const [showForm, setShowForm] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [codes, setCodes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [clockinLogs, setClockinLogs] = useState({});
  const [expandedLogs, setExpandedLogs] = useState(null);

  const [form, setForm] = useState({ name: '', pin: '', role: 'camarero', position: '', workType: '', workPct: 100, dni: '', notes: '' });

  function resetForm() { setForm({ name: '', pin: '', role: 'camarero', position: '', workType: '', workPct: 100, dni: '', notes: '' }); }

  function handleAdd() {
    if (!form.name || !/^\d{4}$/.test(form.pin)) return;
    onAdd({ ...form, id: 'e_' + Date.now() });
    resetForm();
    setShowForm(false);
  }

  async function loadClockin(empId) {
    try {
      const r = await fetch(`/api/clockin?employeeId=${empId}&date=${new Date().toISOString().slice(0, 10)}`);
      if (r.ok) {
        const data = await r.json();
        setClockinLogs(prev => ({ ...prev, [empId]: data || [] }));
      }
    } catch {}
  }

  function toggleLogs(empId) {
    if (expandedLogs === empId) {
      setExpandedLogs(null);
    } else {
      setExpandedLogs(empId);
      if (!clockinLogs[empId]) loadClockin(empId);
    }
  }

  async function generateCodes() {
    setGenerating(true);
    try {
      const r = await fetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate-codes' }),
      });
      const data = await r.json();
      if (data.ok) setCodes(data.codes || []);
    } catch {}
    setGenerating(false);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);

  function ficharUrl(empId) {
    return typeof window !== 'undefined' ? `${window.location.origin}/fichar/${empId}` : '';
  }

  function copyLink(empId) {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(ficharUrl(empId));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>Empleados</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { generateCodes(); setShowCodes(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
            style={{ background: C.brass + '20', color: C.brassLight }}>
            <MessageCircle className="w-3.5 h-3.5" /> Códigos WhatsApp
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
            style={{ background: C.brass + '30', color: C.brassLight }}>
            <Plus className="w-3.5 h-3.5" /> Nuevo empleado
          </button>
        </div>
      </div>

      {/* WhatsApp codes modal */}
      {showCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowCodes(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl p-5 space-y-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <h3 className="text-sm font-bold" style={{ color: C.cream }}>💬 Códigos de vinculación WhatsApp</h3>
            <p className="text-[10px]" style={{ color: C.muted }}>Reparte estos códigos a cada empleado. Deben escribir <strong>vincular CÓDIGO</strong> al WhatsApp de Mesero.</p>
            {generating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: C.brassLight }} /> : codes.length === 0 ? (
              <button onClick={generateCodes} className="w-full py-2 rounded-lg text-xs font-medium hover:opacity-80" style={{ background: C.brass, color: '#000' }}>
                Generar códigos
              </button>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {codes.map(c => (
                  <div key={c.employeeId} className="flex items-center justify-between p-2 rounded-lg" style={{ background: C.surfaceLight }}>
                    <span className="text-xs" style={{ color: C.cream }}>{c.name}</span>
                    <span className="text-sm font-mono font-bold px-2 py-0.5 rounded" style={{ background: C.base, color: C.brassLight }}>{c.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-2">
        {employees.map(emp => {
          const remaining = emp.monthlyLimit - (emp.monthlyUsedMonth === currentMonth ? (emp.monthlyUsed || 0) : 0);
          const todayLogs = clockinLogs[emp.id] || [];
          const lastAction = todayLogs.length > 0 ? todayLogs[0].action : null;
          return (
            <div key={emp.id}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: C.surfaceLight, borderLeft: `4px solid ${emp.role === 'admin' ? C.brass : emp.role === 'manager' ? C.sage : emp.role === 'cocina' ? C.wineLight : C.muted}` }}>
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Name + Role */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={emp.name} onChange={e => onUpdateField(emp.id, 'name', e.target.value)}
                    className="text-sm font-medium bg-transparent border-none outline-none min-w-0 flex-1"
                    style={{ color: C.cream }} />
                  <select value={emp.role} onChange={e => onUpdateField(emp.id, 'role', e.target.value)}
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium border-none outline-none"
                    style={{ background: C.surface, color: C.brassLight }}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>

                {/* Detail fields */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <input value={emp.position || ''} onChange={e => onUpdateField(emp.id, 'position', e.target.value)}
                    placeholder="Puesto" className="bg-transparent border-none outline-none" style={{ color: C.muted, minWidth: 60 }} />
                  <select value={emp.workType || ''} onChange={e => onUpdateField(emp.id, 'workType', e.target.value)}
                    className="bg-transparent border-none outline-none" style={{ color: C.muted }}>
                    <option value="">Jornada</option>
                    <option value="completa">Completa</option>
                    <option value="parcial">Parcial</option>
                    <option value="fijo_discontinuo">Fijo discontinuo</option>
                  </select>
                  <input value={emp.workPct || 100} onChange={e => onUpdateField(emp.id, 'workPct', Number(e.target.value))}
                    type="number" min={0} max={100} className="bg-transparent border-none outline-none w-12 text-right"
                    style={{ color: C.muted }} placeholder="%" />
                  <span style={{ color: C.muted }}>%</span>
                  <input value={emp.dni || ''} onChange={e => onUpdateField(emp.id, 'dni', e.target.value)}
                    placeholder="DNI/NIE" className="bg-transparent border-none outline-none" style={{ color: C.muted, minWidth: 70 }} />
                </div>

                <input value={emp.notes || ''} onChange={e => onUpdateField(emp.id, 'notes', e.target.value)}
                  placeholder="Notas…" className="w-full bg-transparent border-none outline-none text-[10px]"
                  style={{ color: C.muted }} />

                {/* PIN + Discount + Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] flex items-center gap-1" style={{ color: C.muted }}>
                    PIN:
                    <input value={emp.pin} onChange={e => onUpdateField(emp.id, 'pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4} className="w-10 bg-transparent border-none outline-none font-mono" style={{ color: C.cream }} />
                  </span>

                  <button onClick={() => onUpdateField(emp.id, 'personalDiscountEnabled', !emp.personalDiscountEnabled)}
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: emp.personalDiscountEnabled ? C.sage + '30' : C.surface, color: emp.personalDiscountEnabled ? C.sage : C.muted }}>
                    {emp.personalDiscountEnabled ? 'Desc. ON' : 'Desc. OFF'}
                  </button>

                  {emp.personalDiscountEnabled && (
                    <span className="text-[9px]" style={{ color: C.muted }}>
                      Límite: <input value={emp.monthlyLimit || 0} onChange={e => onUpdateField(emp.id, 'monthlyLimit', Number(e.target.value))}
                        type="number" min={0} className="w-12 bg-transparent border-none outline-none text-right" style={{ color: C.cream }} /> €
                      <span className="ml-1" style={{ color: remaining > 0 ? C.sage : C.wineLight }}>({remaining.toFixed(2)}€ disp.)</span>
                    </span>
                  )}

                  {/* Clock-in link */}
                  <button onClick={() => copyLink(emp.id)} title="Copiar enlace de fichaje"
                    className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}>
                    <Share2 className="w-3 h-3" />
                  </button>

                  {/* QR link */}
                  <button onClick={() => window.open(ficharUrl(emp.id), '_blank')} title="Abrir QR de fichaje"
                    className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}>
                    <QrCode className="w-3 h-3" />
                  </button>

                  {/* Clock-in history */}
                  <button onClick={() => toggleLogs(emp.id)}
                    className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded hover:opacity-70"
                    style={{ background: lastAction === 'entrada' ? C.sage + '20' : lastAction === 'pausa' ? C.brass + '20' : 'transparent', color: lastAction === 'entrada' ? C.sage : lastAction === 'pausa' ? C.brassLight : lastAction === 'salida' ? C.wineLight : C.muted }}>
                    <Clock className="w-2.5 h-2.5" />
                    {lastAction === 'entrada' ? 'Activo' : lastAction === 'pausa' ? 'En pausa' : lastAction === 'salida' ? 'Salido' : 'Hoy'}
                  </button>

                  {confirmDeleteId === emp.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => onDelete(emp.id)} className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: C.wine + '30', color: C.wineLight }}>Sí</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: C.muted }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(emp.id)}
                      className="p-1 rounded hover:opacity-70" style={{ color: C.wineLight }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Clock-in logs */}
                {expandedLogs === emp.id && (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[9px] font-medium" style={{ color: C.muted }}>Fichajes hoy:</p>
                    {todayLogs.length === 0 ? (
                      <p className="text-[9px]" style={{ color: C.muted }}>Sin registros hoy</p>
                    ) : (
                      <div className="space-y-0.5">
                        {todayLogs.slice(0, 10).map((log, i) => {
                          const isPausa = log.action === 'pausa';
                          const isVuelta = log.action === 'vuelta';
                          const isEntrada = log.action === 'entrada';
                          let icon, bg, fg;
                          if (isEntrada) { icon = '→'; bg = C.sage + '20'; fg = C.sage; }
                          else if (log.action === 'salida') { icon = '←'; bg = C.wine + '20'; fg = C.wineLight; }
                          else if (isPausa) { icon = '⏸'; bg = C.brass + '20'; fg = C.brassLight; }
                          else if (isVuelta) { icon = '▶'; bg = '#6a9af830'; fg = '#6a9af8'; }
                          else { icon = '·'; bg = C.surfaceLight; fg = C.muted; }
                          return (
                            <div key={log.id} className="flex items-center gap-2 text-[9px]">
                              <span className="px-1 py-0.5 rounded" style={{ background: bg, color: fg }}>{icon}</span>
                              <span style={{ color: C.muted }}>
                                {new Date(log.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[8px]" style={{ color: C.muted }}>
                                {isPausa ? 'pausa' : isVuelta ? 'vuelta' : log.method}
                              </span>
                              {isEntrada && i === 0 && todayLogs.length > 0 && (
                                <span style={{ color: C.sage }} className="text-[8px] font-medium">activo</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            <h3 className="font-bold" style={{ color: C.cream }}>Nuevo empleado</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>Nombre completo *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>PIN (4 cifras) *</label>
                <input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  type="password" inputMode="numeric" maxLength={4}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono tracking-widest"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>Puesto</label>
                  <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>Jornada</label>
                  <select value={form.workType} onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}>
                    <option value="">Seleccionar</option>
                    <option value="completa">Completa</option>
                    <option value="parcial">Parcial</option>
                    <option value="fijo_discontinuo">Fijo discontinuo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>% jornada</label>
                  <input value={form.workPct} onChange={e => setForm(f => ({ ...f, workPct: Number(e.target.value) }))}
                    type="number" min={0} max={100}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>DNI/NIE</label>
                  <input value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase block mb-0.5" style={{ color: C.muted }}>Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!form.name || !/^\d{4}$/.test(form.pin)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-40"
                style={{ background: C.brass, color: '#000' }}>
                Guardar
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg text-sm" style={{ background: C.surfaceLight, color: C.muted }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: C.muted }}>
        El PIN identifica a cada persona en el TPV y para fichar. Cada empleado debe tener su propio PIN.
      </p>
    </div>
  );
}
