'use client'

import { useState } from 'react'
import { escposOpenDrawer, printESCPOS, isPrinterConnected } from '../lib/thermal-printer'
import { sha256 } from '../lib/crypto'

const API_KEY = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY) || ''

interface Props {
  C: Record<string, string>
  ticketSettings: Record<string, any>
  showToast: (msg: string) => void
}

export default function DrawerModal({ C, ticketSettings, showToast }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pinInput, setPinInput] = useState('')

  function openDrawer(): void {
    if (!isPrinterConnected()) { showToast('No hay impresora conectada'); return }
    printESCPOS(escposOpenDrawer())
      .then(() => showToast('Cajón abierto'))
      .catch(() => showToast('No se pudo abrir el cajón'))
  }

  function handleAction(): void {
    const policy = ticketSettings.drawerOpenPolicy || 'confirm'
    if (policy === 'quick') { openDrawer() }
    else if (policy === 'confirm') { setShowConfirm(true) }
    else if (policy === 'pin') { setPinInput(''); setShowPin(true) }
  }

  return (
    <>
      {/* ── Botón ── */}
      <button onClick={handleAction}
        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
        style={{ color: C.muted }}
        title="Abrir cajón">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 12h20" /><path d="M8 16h8" />
        </svg>
      </button>

      {/* ── Modal confirmar ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-3" style={{ color: C.cream }}>🪙 Abrir cajón</p>
            <p style={{ color: C.muted }} className="text-sm mb-4">¿Abrir el cajón portamonedas?</p>
            <div className="flex gap-2">
              <button onClick={() => { openDrawer(); setShowConfirm(false) }}
                style={{ background: C.brass, color: C.base }}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold">Abrir</button>
              <button onClick={() => setShowConfirm(false)}
                style={{ color: C.muted, background: C.surfaceLight }}
                className="flex-1 rounded-lg py-2.5 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PIN ── */}
      {showPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowPin(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
            className="w-full max-w-xs rounded-xl p-5 fade-up">
            <p className="font-display text-lg mb-1" style={{ color: C.cream }}>🪙 Abrir cajón</p>
            <p style={{ color: C.muted }} className="text-xs mb-3">Introduce el PIN de administrador</p>
            <div className="text-center mb-4">
              <div style={{ background: C.surfaceLight, color: C.brassLight }}
                className="text-3xl font-mono font-bold px-6 py-3 rounded-xl inline-block tracking-[0.3em]">
                {pinInput.padEnd(4, '·')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1,2,3,4,5,6,7,8,9].map((n: any) => (
                <button key={n} onClick={() => { if (pinInput.length < 4) setPinInput(p => p + n) }}
                  style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.cream }}
                  className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">{n}</button>
              ))}
              <button onClick={() => setPinInput(p => p.slice(0, -1))}
                style={{ background: C.wine + '30', border: `1px solid ${C.wine}`, color: C.wineLight }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80">⌫</button>
              <button onClick={() => setPinInput('')}
                style={{ background: C.surfaceLight, border: `1px solid ${C.line}`, color: C.muted }}
                className="rounded-lg py-3 text-lg font-mono hover:opacity-80">C</button>
              <button onClick={async () => {
                const r = await fetch('/api/employees', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
                  body: JSON.stringify({ action: 'verify', pin: pinInput, pinHash: await sha256(pinInput) }),
                })
                if (!r.ok) { showToast('PIN de administrador incorrecto'); setPinInput(''); return }
                const admin = await r.json()
                if (admin.role !== 'admin') { showToast('PIN de administrador incorrecto'); setPinInput(''); return }
                openDrawer(); setShowPin(false)
              }}
                disabled={pinInput.length < 4}
                style={{
                  background: pinInput.length === 4 ? C.brass : C.surfaceLight,
                  color: pinInput.length === 4 ? C.base : C.muted,
                }}
                className="rounded-lg py-3 text-lg font-mono font-bold hover:opacity-80 disabled:cursor-not-allowed">
                OK
              </button>
            </div>
            <button onClick={() => setShowPin(false)}
              style={{ color: C.muted, background: C.surfaceLight }}
              className="w-full rounded-lg py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </>
  )
}
