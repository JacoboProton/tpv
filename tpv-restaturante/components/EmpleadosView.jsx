import { useState } from 'react';
import { ShieldCheck, User, Plus, Trash2 } from 'lucide-react';

export default function EmpleadosView({
  employees, colors: C, onAdd, onUpdateField, onDelete,
  confirmDeleteId, setConfirmDeleteId,
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', pin: '', role: 'camarero' });

  function submit(e) {
    e.preventDefault();
    if (!form.name || !/^\d{4}$/.test(form.pin)) return;
    onAdd(form);
    setForm({ name: '', pin: '', role: 'camarero' });
    setOpen(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>EQUIPO</h2>
        <button
          onClick={() => setOpen(!open)}
          style={{ background: C.brass, color: C.base }}
          className="text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Empleado
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
          className="rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          <input
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre" style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm col-span-2"
          />
          <input
            value={form.pin}
            onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="PIN (4 dígitos)"
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm font-mono"
          />
          <select
            value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            style={{ background: C.surfaceLight, color: C.cream }}
            className="rounded-md px-3 py-2 text-sm"
          >
            <option value="camarero">Camarero</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="submit"
            style={{ background: C.sage, color: '#fff' }}
            className="rounded-md py-2 text-sm font-medium col-span-2 sm:col-span-4"
          >
            Añadir al equipo
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {employees.map(emp => (
          <div
            key={emp.id}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="rounded-lg p-3 flex flex-wrap items-center gap-3"
          >
            <div
              style={{ background: C.surfaceLight }}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            >
              {emp.role === 'admin'
                ? <ShieldCheck className="w-4 h-4" style={{ color: C.brassLight }} />
                : <User className="w-4 h-4" style={{ color: C.muted }} />}
            </div>
            <input
              defaultValue={emp.name}
              onBlur={e => onUpdateField(emp.id, 'name', e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="rounded-md px-2 py-1.5 text-sm flex-1 min-w-[6rem]"
            />
            <input
              defaultValue={emp.pin}
              onBlur={e => onUpdateField(emp.id, 'pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ background: C.surfaceLight, color: C.cream, width: 72 }}
              className="font-mono rounded-md px-2 py-1.5 text-sm text-center"
              maxLength={4}
            />
            <select
              value={emp.role}
              onChange={e => onUpdateField(emp.id, 'role', e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="rounded-md px-2 py-1.5 text-sm"
            >
              <option value="camarero">Camarero</option>
              <option value="admin">Administrador</option>
            </select>
            {confirmDeleteId === emp.id ? (
              <button onClick={() => onDelete(emp.id)} style={{ color: C.wineLight }} className="text-xs font-medium px-2">
                Confirmar
              </button>
            ) : (
              <button onClick={() => setConfirmDeleteId(emp.id)} style={{ color: C.muted }} className="p-1.5">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <p style={{ color: C.muted }} className="text-xs mt-4">
        El PIN identifica a cada persona en el TPV; es un control de acceso ligero, no un sistema de seguridad bancaria. Compartidlo solo entre el equipo.
      </p>
    </div>
  );
}
