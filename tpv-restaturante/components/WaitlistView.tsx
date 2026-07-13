'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Bell, Check, Phone, Users, Clock, Settings, RefreshCw, ExternalLink, Wifi, Copy } from 'lucide-react';
import type { Theme } from './constants';

interface WaitlistEntry {
  id: string;
  name: string;
  phone?: string;
  pax: number;
  status: string;
  createdAt: number;
  calledCount: number;
  notes?: string;
  source?: string;
}

interface WaitlistSettings {
  [key: string]: string;
  waitlistEnabled: string;
  waitlistMaxPax: string;
  waitlistCallTimeout: string;
  waitlistMaxAttempts: string;
  waitlistWelcomeMessage: string;
  waitlistSmsEnabled: string;
  waitlistWhatsAppEnabled: string;
  waitlistTwilioSid: string;
  waitlistTwilioToken: string;
  waitlistTwilioPhone: string;
  waitlistTwilioWhatsApp: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  waiting:  { label: 'Esperando', color: '#c4a04a', icon: Clock },
  called:   { label: 'Llamado',   color: '#6a9af8', icon: Phone },
  seated:   { label: 'Sentado',   color: '#7a9a7c', icon: Check },
  cancelled:{ label: 'Cancelado', color: '#9c958a', icon: X },
  noshow:   { label: 'No-show',   color: '#b05e5e', icon: Trash2 },
};

interface WaitlistViewProps {
  colors: Theme;
}

export default function WaitlistView({ colors: C }: WaitlistViewProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [settings, setSettings] = useState<WaitlistSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('queue');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ fetchSettings }, { fetchWaitlist }] = await Promise.all([
        import('../lib/api'), import('../lib/api')
      ]);
      const [s, w] = await Promise.all([fetchSettings(), fetchWaitlist()]);
      setSettings(s as WaitlistSettings);
      setEntries(w as WaitlistEntry[] || []);
    } catch {}
    setLoading(false);
  }

  async function handleAction(action: string, extra: Record<string, unknown> = {}) {
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      });
      loadAll();
    } catch {}
  }

  function toggle(key: string) {
    const next = { [key]: settings![key] === 'true' ? 'false' : 'true' };
    setSettings(prev => ({ ...prev!, ...next }));
    setSaving(true);
    fetch('/api/settings', { method: 'PUT', body: JSON.stringify(next) }).finally(() => setSaving(false));
  }

  function setVal(key: string, val: string) {
    const next = { [key]: val };
    setSettings(prev => ({ ...prev!, ...next }));
    fetch('/api/settings', { method: 'PUT', body: JSON.stringify(next) });
  }

  async function saveSettings(next: Record<string, string>) {
    setSettings(prev => ({ ...prev!, ...next }));
    setSaving(true);
    await fetch('/api/settings', { method: 'PUT', body: JSON.stringify(next) });
    setSaving(false);
  }

  const [showSettings, setShowSettings] = useState(false);

  const waitingEntries = entries.filter(e => e.status === 'waiting');
  const activeEntries = entries.filter(e => e.status === 'waiting' || e.status === 'called');

  if (loading) {
    return <div className="text-center py-12" style={{ color: C.muted }}>Cargando lista de espera…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.cream }}>
          Lista de Espera {settings?.waitlistEnabled === 'true' ? '' : '(desactivada)'}
        </h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs" style={{ color: C.muted }}>Guardando…</span>}
          <button onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
            style={{ background: showSettings ? C.surfaceLight : 'transparent', color: showSettings ? C.brassLight : C.muted }}>
            <Settings className="w-3.5 h-3.5" /> Ajustes
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
            style={{ background: C.brass + '30', color: C.brassLight }}>
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        </div>
      </div>

      {showSettings ? (
        <SettingsPanel settings={settings!} setVal={setVal} toggle={toggle} saveSettings={saveSettings} C={C} onClose={() => setShowSettings(false)} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
              <p className="text-2xl font-bold" style={{ color: C.cream }}>{waitingEntries.length}</p>
              <p className="text-[10px]" style={{ color: C.muted }}>Esperando</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
              <p className="text-2xl font-bold" style={{ color: C.brassLight }}>{entries.filter(e => e.status === 'called').length}</p>
              <p className="text-[10px]" style={{ color: C.muted }}>Llamados</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
              <p className="text-2xl font-bold" style={{ color: C.sage }}>{entries.filter(e => e.status === 'seated').length}</p>
              <p className="text-[10px]" style={{ color: C.muted }}>Sentados hoy</p>
            </div>
          </div>

          {/* Queue */}
          <div className="space-y-1">
            {activeEntries.length === 0 && (
              <div className="text-center py-12" style={{ color: C.muted }}>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay nadie en la lista de espera</p>
              </div>
            )}
            {activeEntries.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-opacity"
                style={{ background: C.surfaceLight, borderLeft: `4px solid ${STATUS_CONFIG[e.status].color}`, opacity: e.status === 'called' ? 0.7 : 1 }}>
                <span className="text-lg font-bold w-6 text-center" style={{ color: e.status === 'waiting' ? C.brassLight : C.muted }}>
                  {e.status === 'waiting' ? i + 1 : '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: C.cream }}>{e.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: STATUS_CONFIG[e.status].color + '30', color: STATUS_CONFIG[e.status].color }}>
                      {STATUS_CONFIG[e.status].label}
                    </span>
                    {e.phone && <span className="text-[10px]" style={{ color: C.muted }}>{e.phone}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: C.muted }}>
                    <span><Users className="w-3 h-3 inline mr-0.5" />{e.pax} pax</span>
                    <span><Clock className="w-3 h-3 inline mr-0.5" />{timeAgo(e.createdAt)}</span>
                    {e.calledCount > 0 && <span>Llamado {e.calledCount}x</span>}
                    {e.notes && <span className="truncate max-w-[120px] opacity-70">📝 {e.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {e.status === 'waiting' && (
                    <>
                      <button onClick={() => handleAction('call', { id: e.id })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
                        style={{ background: C.brass + '30', color: C.brassLight }}>
                        <Bell className="w-3 h-3" /> Llamar
                      </button>
                      <button onClick={() => handleAction('cancel', { id: e.id })}
                        className="p-1.5 rounded hover:opacity-70" style={{ color: C.wineLight }}><X className="w-3 h-3" /></button>
                    </>
                  )}
                  {e.status === 'called' && (
                    <>
                      <button onClick={() => handleAction('seat', { id: e.id })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
                        style={{ background: C.sage + '30', color: C.sage }}>
                        <Check className="w-3 h-3" /> Sentar
                      </button>
                      <button onClick={() => handleAction('noshow', { id: e.id })}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium hover:opacity-80"
                        style={{ background: C.wine + '30', color: C.wineLight }}>
                        No-show
                      </button>
                      <button onClick={() => handleAction('call', { id: e.id })}
                        className="p-1.5 rounded hover:opacity-70" style={{ color: C.brassLight }} title="Reintentar llamada">
                        <Phone className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Today history */}
          {entries.filter(e => e.status === 'seated' || e.status === 'cancelled' || e.status === 'noshow').length > 0 && (
            <details className="mt-4">
              <summary className="text-xs font-medium cursor-pointer" style={{ color: C.muted }}>Historial de hoy ({entries.filter(e => e.status !== 'waiting' && e.status !== 'called').length})</summary>
              <div className="mt-2 space-y-1">
                {entries.filter(e => e.status === 'seated' || e.status === 'cancelled' || e.status === 'noshow').map(e => (
                  <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: C.surfaceLight, opacity: 0.6 }}>
                    <span className="text-xs font-medium w-16" style={{ color: STATUS_CONFIG[e.status].color }}>{STATUS_CONFIG[e.status].label}</span>
                    <span className="text-xs" style={{ color: C.cream }}>{e.name}</span>
                    <span className="text-[10px]" style={{ color: C.muted }}>{e.pax} pax</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Quick add form */}
          {showForm && (
            <QuickAddForm onSave={async (data) => {
              await handleAction('join', data);
              setShowForm(false);
            }} onClose={() => setShowForm(false)} C={C} />
          )}
        </>
      )}
    </div>
  );
}

function timeAgo(ts: number) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}min`;
}

interface QuickAddFormProps {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  C: Theme;
}

function QuickAddForm({ onSave, onClose, C }: QuickAddFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pax, setPax] = useState(2);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, phone, pax, notes, source: 'manual' });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ color: C.cream }}>Añadir a la lista</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.muted }}>Nombre *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.muted }}>Teléfono</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.muted }}>Personas</label>
            <input type="number" min={1} max={20} value={pax} onChange={e => setPax(Number(e.target.value))}
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.muted }}>Notas</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Trona, alergias…"
              style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
              className="w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium hover:opacity-80"
            style={{ background: C.brass, color: '#000' }}>
            {saving ? 'Añadiendo…' : 'Añadir a la cola'}
          </button>
        </form>
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  settings: WaitlistSettings;
  setVal: (key: string, val: string) => void;
  toggle: (key: string) => void;
  saveSettings: (next: Record<string, string>) => void;
  C: Theme;
  onClose: () => void;
}

function SettingsPanel({ settings, setVal, toggle, saveSettings, C, onClose }: SettingsPanelProps) {
  const [twilioVisible, setTwilioVisible] = useState(false);
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/waitlist` : '/waitlist';

  function copyUrl() {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(publicUrl);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: C.brassLight }}>Configurar Lista de Espera</h3>
        <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: C.muted }}><X className="w-4 h-4" /></button>
      </div>

      {/* Enable */}
      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: C.surfaceLight }}>
        <div>
          <p className="text-sm font-medium" style={{ color: C.cream }}>Lista de Espera</p>
          <p className="text-[10px]" style={{ color: C.muted }}>Activar sistema de cola</p>
        </div>
        <Toggle value={settings.waitlistEnabled} onChange={() => toggle('waitlistEnabled')} C={C} />
      </div>

      {/* Public URL */}
      <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.muted }}>Enlace público</p>
        <div className="flex items-center gap-1">
          <input type="text" value={publicUrl} readOnly
            style={{ background: C.surface, color: C.cream, border: `1px solid ${C.line}` }}
            className="flex-1 rounded-lg px-3 py-2 text-xs" />
          <button onClick={copyUrl}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.brass + '20', color: C.brassLight }}>
            <Copy className="w-3 h-3" />
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-medium hover:opacity-80"
            style={{ background: C.brass + '20', color: C.brassLight }}>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Rules */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Máximo personas" type="number" value={settings.waitlistMaxPax || '20'} onChange={v => setVal('waitlistMaxPax', v)} min={1} max={50} C={C} />
        <Field label="Tiempo espera (min)" type="number" value={settings.waitlistCallTimeout || '5'} onChange={v => setVal('waitlistCallTimeout', v)} min={1} max={30} C={C} suffix="min" />
        <Field label="Intentos de llamada" type="number" value={settings.waitlistMaxAttempts || '2'} onChange={v => setVal('waitlistMaxAttempts', v)} min={1} max={5} C={C} />
      </div>
      <Field label="Mensaje de bienvenida" value={settings.waitlistWelcomeMessage || ''} onChange={v => setVal('waitlistWelcomeMessage', v)} C={C} />

      {/* Notifications */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium" style={{ color: C.cream }}>Avisos</h4>
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: C.surfaceLight }}>
          <div><p className="text-xs font-medium" style={{ color: C.cream }}>SMS</p></div>
          <Toggle value={settings.waitlistSmsEnabled} onChange={() => toggle('waitlistSmsEnabled')} C={C} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: C.surfaceLight }}>
          <div><p className="text-xs font-medium" style={{ color: C.cream }}>WhatsApp</p></div>
          <Toggle value={settings.waitlistWhatsAppEnabled} onChange={() => toggle('waitlistWhatsAppEnabled')} C={C} />
        </div>
      </div>

      {/* Twilio */}
      <details className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <summary className="px-3 py-2 text-xs font-medium cursor-pointer" style={{ background: C.surfaceLight, color: C.cream }}>
          Configuración de Twilio
        </summary>
        <div className="p-3 space-y-2" style={{ background: C.surface }}>
          <Field label="Account SID" value={settings.waitlistTwilioSid || ''} onChange={v => setVal('waitlistTwilioSid', v)} type="password" C={C} />
          <Field label="Auth Token" value={settings.waitlistTwilioToken || ''} onChange={v => setVal('waitlistTwilioToken', v)} type="password" C={C} />
          <Field label="Teléfono Twilio" value={settings.waitlistTwilioPhone || ''} onChange={v => setVal('waitlistTwilioPhone', v)} placeholder="+1234567890" C={C} />
          <Field label="WhatsApp Twilio" value={settings.waitlistTwilioWhatsApp || ''} onChange={v => setVal('waitlistTwilioWhatsApp', v)} placeholder="+1234567890" C={C} />
        </div>
      </details>

      <div className="p-3 rounded-lg" style={{ background: C.surfaceLight }}>
        <p className="text-[10px]" style={{ color: C.muted }}>
          ⚠️ Sin Twilio la lista de espera funciona igual, pero los avisos no se enviarán. Puedes llamar al cliente tú mismo.
        </p>
      </div>
    </div>
  );
}

interface ToggleProps {
  value: string;
  onChange: () => void;
  C: Theme;
}

function Toggle({ value, onChange, C }: ToggleProps) {
  return (
    <button onClick={onChange} type="button"
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ background: value === 'true' ? C.brass : C.line }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ left: '0.5px', transform: value === 'true' ? 'translateX(22px)' : 'translateX(0)' }} />
    </button>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  C: Theme;
}

function Field({ label, value, onChange, type = 'text', min, max, step, placeholder, suffix, C }: FieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: C.muted }}>{label}</label>
      <div className="flex items-center gap-2">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step} placeholder={placeholder}
          style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
          className="w-full rounded-lg px-3 py-2 text-sm" />
        {suffix && <span className="text-xs" style={{ color: C.muted }}>{suffix}</span>}
      </div>
    </div>
  );
}
