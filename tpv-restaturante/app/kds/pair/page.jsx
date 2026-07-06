'use client';

import { useState } from 'react';
import { Check, X, Monitor, Shield } from 'lucide-react';

const KTC = { base: '#1a1d23', surface: '#252830', surfaceLight: '#30343e', accent: '#c4a04a', accentLight: '#d6b86a', cream: '#e6e1d6', muted: '#9c958a', success: '#7a9a7c', danger: '#b05e5e', line: '#404550' };

export default function KDSPairPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState('');

  function updateDigit(idx, val) {
    if (val.length > 1) return;
    const next = [...code];
    next[idx] = val.toUpperCase();
    setCode(next);
    if (val && idx < 5) {
      const nextInput = document.getElementById(`kds-code-${idx + 1}`);
      nextInput?.focus();
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      const prev = document.getElementById(`kds-code-${idx - 1}`);
      prev?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) { setStatus('error'); setMessage('Faltan caracteres'); return; }
    setLoading(true);
    setStatus(null);
    try {
      const deviceId = 'kds_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const res = await fetch('/api/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: fullCode, deviceId }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('kds_device_id', data.deviceId);
        localStorage.setItem('kds_paired', 'true');
        setStatus('success');
        setMessage('Pantalla emparejada correctamente');
        setTimeout(() => { window.location.href = '/kds'; }, 1500);
      } else {
        setStatus('error');
        setMessage(data.error || 'Código inválido o caducado');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Error de conexión');
    }
    setLoading(false);
  }

  return (
    <div style={{ background: KTC.base, color: KTC.cream, minHeight: '100vh' }}
      className="flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <Monitor className="w-12 h-12 mx-auto mb-3" style={{ color: KTC.accent }} />
          <h1 className="text-xl font-bold" style={{ color: KTC.cream }}>Emparejar pantalla</h1>
          <p className="text-sm mt-1" style={{ color: KTC.muted }}>
            Introduce el código de 6 caracteres del panel de administración
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            {code.map((d, i) => (
              <input key={i} id={`kds-code-${i}`} type="text" maxLength={1}
                value={d} onChange={e => updateDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                inputMode="text" autoComplete="off"
                className="w-10 h-12 rounded-lg text-center text-lg font-mono font-bold uppercase"
                style={{
                  background: KTC.surfaceLight, color: KTC.cream,
                  border: `2px solid ${status === 'error' ? KTC.danger : status === 'success' ? KTC.success : KTC.line}`,
                  outline: 'none',
                }} />
            ))}
          </div>

          {status && (
            <div className={`flex items-center justify-center gap-2 text-sm ${status === 'success' ? '' : ''}`}
              style={{ color: status === 'success' ? KTC.success : KTC.danger }}>
              {status === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-base font-bold hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
            style={{ background: KTC.accent, color: '#000' }}>
            {loading ? 'Verificando…' : 'Emparejar'}
          </button>
        </form>

        <div className="rounded-xl p-4 text-xs space-y-2" style={{ background: KTC.surfaceLight }}>
          <Shield className="w-5 h-5 mx-auto" style={{ color: KTC.accent }} />
          <p style={{ color: KTC.muted }}>
            El código es válido durante 10 minutos. Una vez emparejada,
            la pantalla mostrará el KDS directamente sin necesidad de iniciar sesión.
          </p>
        </div>
      </div>
    </div>
  );
}
