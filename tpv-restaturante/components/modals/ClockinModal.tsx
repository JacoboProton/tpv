'use client'

import { Loader2 } from 'lucide-react'
import type { Theme } from './constants'

interface ClockinModalProps {
  C: Theme
  currentUser: any
  clockinLoading: boolean
  clockinSummary: any
  onAction: (action: string) => void
  onClose: () => void
}

function formatMinutes(mins: number): string {
  if (!mins && mins !== 0) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

export default function ClockinModal({ C, currentUser, clockinLoading, clockinSummary, onAction, onClose }: ClockinModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
        className="w-full max-w-xs rounded-xl p-5 fade-up">
        <p className="font-display text-lg mb-1" style={{ color: C.cream }}>⏰ Fichaje</p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>{currentUser?.name}</p>
        {clockinLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: C.brassLight }} /></div>
        ) : (
          <div className="space-y-3">
            {clockinSummary?.isActive && (
              <div className="rounded-lg p-3 space-y-1" style={{ background: C.surfaceLight }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: C.muted }}>Entrada</span>
                  <span className="font-mono" style={{ color: C.sageLight }}>
                    {new Date(clockinSummary.entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {clockinSummary.pausas?.filter((p: any) => !p.end).length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: C.muted }}>En pausa</span>
                    <span className="font-mono" style={{ color: C.brassLight }}>
                      desde {new Date(clockinSummary.pausas.find((p: any) => !p.end).start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {clockinSummary.salida && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: C.muted }}>Salida</span>
                    <span className="font-mono" style={{ color: C.wineLight }}>
                      {new Date(clockinSummary.salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div style={{ borderTop: `1px solid ${C.line}` }} className="pt-1 mt-1 flex justify-between text-xs">
                  <span style={{ color: C.muted }}>Total</span>
                  <span className="font-mono" style={{ color: C.cream }}>{formatMinutes(clockinSummary.effectiveMinutes)}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {(!clockinSummary?.isActive || clockinSummary?.isOnPause) && (
                <button onClick={() => onAction(clockinSummary?.isOnPause ? 'vuelta' : 'entrada')}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.sage, color: '#fff' }}>
                  {clockinSummary?.isOnPause ? '↩ Volver de pausa' : '▶ Fichar entrada'}
                </button>
              )}
              {clockinSummary?.isActive && !clockinSummary?.isOnPause && (
                <button onClick={() => onAction('pausa')}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.brass, color: '#000' }}>
                  ⏸ Pausa
                </button>
              )}
              {clockinSummary?.isActive && (
                <button onClick={() => onAction('salida')}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: C.wine + '30', color: C.wineLight, border: `1px solid ${C.wine}` }}>
                  ⏹ Fichar salida
                </button>
              )}
            </div>
            <button onClick={onClose}
              className="w-full py-2 rounded-lg text-sm" style={{ background: C.surfaceLight, color: C.muted }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
