'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, Bell, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PublicWaitlistPage() {
  const [mode, setMode] = useState('join'); // join | status
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pax, setPax] = useState(2);
  const [message, setMessage] = useState('');
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [myEntry, setMyEntry] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      setEnabled(s.waitlistEnabled !== 'false');
      setWelcomeMsg(s.waitlistWelcomeMessage || '');
    }).catch(() => {});
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      const r = await fetch('/api/waitlist');
      const data = await r.json();
      setQueue(data.filter(e => e.status === 'waiting' || e.status === 'called') || []);
    } catch {}
  }

  async function handleJoin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ action: 'join', name, phone, pax, source: 'online' }),
      });
      const data = await r.json();
      if (data.ok) {
        setMessage(`¡Te has apuntado! Eres el nº ${data.position} en la cola.`);
        setMyEntry({ name, phone, pax, position: data.position, id: data.id });
        setMode('status');
      } else {
        setMessage('Error al apuntarte. Inténtalo de nuevo.');
      }
    } catch {
      setMessage('Error de conexión.');
    }
    setLoading(false);
    loadQueue();
  }

  const waitingCount = queue.filter(e => e.status === 'waiting').length;

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1a1a1a' }}>
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#6b655a' }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: '#e8e0d4' }}>Lista de espera no disponible</h1>
          <p className="text-sm" style={{ color: '#8a8275' }}>Pregunta en el mostrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#1a1a1a' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Users className="w-10 h-10 mx-auto mb-2" style={{ color: '#c4a04a' }} />
          <h1 className="text-xl font-bold" style={{ color: '#e8e0d4' }}>Lista de Espera</h1>
          {welcomeMsg && <p className="text-sm mt-1" style={{ color: '#8a8275' }}>{welcomeMsg}</p>}
        </div>

        {mode === 'join' ? (
          <form onSubmit={handleJoin} className="space-y-4 p-5 rounded-xl" style={{ background: '#222222', border: '1px solid #333' }}>
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Nombre *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Tu nombre"
                style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }}
                className="w-full rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Teléfono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 00 00 00"
                style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }}
                className="w-full rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#8a8275' }}>Personas</label>
              <input type="number" min={1} max={20} value={pax} onChange={e => setPax(Number(e.target.value))}
                style={{ background: '#1a1a1a', color: '#e8e0d4', border: '1px solid #333' }}
                className="w-full rounded-lg px-4 py-3 text-sm" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ background: '#c4a04a', color: '#000' }}>
              {loading ? 'Apuntando…' : 'Apuntarme a la cola'}
            </button>
            {message && <p className="text-xs text-center" style={{ color: '#b05e5e' }}>{message}</p>}
          </form>
        ) : (
          <div className="p-5 rounded-xl space-y-4" style={{ background: '#222222', border: '1px solid #333' }}>
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ color: '#c4a04a' }}>#{myEntry?.position || '—'}</p>
              <p className="text-xs mt-1" style={{ color: '#8a8275' }}>Tu posición en la cola</p>
            </div>
            {myEntry && (
              <div className="text-center text-sm" style={{ color: '#e8e0d4' }}>
                <p>{myEntry.name}, {myEntry.pax} pax</p>
                {myEntry.phone && <p className="text-xs" style={{ color: '#8a8275' }}>Tel: {myEntry.phone}</p>}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#8a8275' }}>
              <RefreshCw className="w-3 h-3" />
              <span>{waitingCount} persona(s) delante tuya</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#8a8275' }}>
              <Bell className="w-3 h-3" />
              <span>Te avisaremos cuando tu mesa esté lista</span>
            </div>
            <button onClick={() => { setMode('join'); setMessage(''); }}
              className="flex items-center justify-center gap-1 w-full py-2 rounded-lg text-xs hover:opacity-80"
              style={{ background: '#333', color: '#8a8275' }}>
              <ArrowLeft className="w-3 h-3" /> Volver
            </button>
          </div>
        )}

        <div className="text-center">
          <button onClick={() => { loadQueue(); setMode('status'); }}
            className="text-xs py-2 px-4 rounded-lg"
            style={{ background: '#222', color: '#8a8275', border: '1px solid #333' }}>
            <RefreshCw className="w-3 h-3 inline mr-1" /> Actualizar cola
          </button>
        </div>
      </div>
    </div>
  );
}
