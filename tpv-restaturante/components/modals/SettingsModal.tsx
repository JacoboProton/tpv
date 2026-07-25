'use client'

import { saveSettings } from '../lib/api'
import { enqueueMutation } from '../lib/offline'

interface Props {
  C: Record<string, string>
  ticketSettings: Record<string, any>
  setTicketSettings: (s: any) => void
  showSettings: boolean
  setShowSettings: (v: boolean) => void
  showToast: (msg: string) => void
  catalog: any
}

export default function SettingsModal({ C, ticketSettings, setTicketSettings, showSettings, setShowSettings, showToast, catalog }: Props) {
  if (!showSettings) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ background: C.surface, border: `1px solid ${C.line}` }} className="w-full max-w-sm rounded-xl p-5 fade-up max-h-[85vh] overflow-y-auto">
        <p className="font-display text-lg mb-4" style={{ color: C.cream }}>Configuración</p>
        <div className="flex flex-col gap-3">
          {['restaurantName', 'companyCif', 'companyAddress', 'companyPhone', 'logoUrl', 'footerText', 'ticketWidth'].map((field: any) => (
            <div key={field}>
              <label style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-1 block">
                {field === 'restaurantName' ? 'Nombre del restaurante' : field === 'companyCif' ? 'CIF/NIF' : field === 'companyAddress' ? 'Dirección' : field === 'companyPhone' ? 'Teléfono' : field === 'logoUrl' ? 'URL del logo' : field === 'footerText' ? 'Texto del pie' : 'Ancho del ticket'}
              </label>
              <input
                value={ticketSettings[field]}
                onChange={e => setTicketSettings((s: any) => ({ ...s, [field]: e.target.value }))}
                style={{ background: C.surfaceLight, color: C.cream }}
                className="w-full rounded-lg px-3 py-2.5 text-sm"
                placeholder={field === 'ticketWidth' ? '80mm' : ''}
              />
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
          <p className="font-display text-sm" style={{ color: C.cream }}>Política de apertura de cajón</p>
          <select
            value={ticketSettings.drawerOpenPolicy || 'confirm'}
            onChange={e => setTicketSettings((s: any) => ({ ...s, drawerOpenPolicy: e.target.value }))}
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="quick">Apertura rápida (sin confirmación)</option>
            <option value="confirm">Con confirmación</option>
            <option value="pin">Requiere PIN de administrador</option>
          </select>
          <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
          <p className="font-display text-sm" style={{ color: C.cream }}>Descuento de personal</p>
          <p style={{ color: C.muted }} className="text-[10px] -mt-2">Porcentaje por categoría (0 = sin descuento)</p>
          {(() => {
            const raw = ticketSettings.personalDiscountRates
            let rates: Record<string, number> = {}
            try { rates = typeof raw === 'string' ? JSON.parse(raw) : raw || {} } catch { rates = {} }
            const cats = catalog?.categories?.map((c: any) => typeof c === 'string' ? c : c.name) || []
            const allKeys = [...new Set([...cats, ...Object.keys(rates)])]
            return allKeys.map((catName: any) => (
              <div key={catName} className="flex items-center gap-2">
                <span style={{ color: C.cream }} className="text-xs flex-1">{catName}</span>
                <input
                  value={rates[catName] ?? 0}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0
                    const updated = { ...rates, [catName]: v }
                    setTicketSettings((s: any) => ({ ...s, personalDiscountRates: JSON.stringify(updated) }))
                  }}
                  type="number" min="0" max="100" step="1"
                  style={{ background: C.surfaceLight, color: C.cream, width: 64 }}
                  className="rounded-md px-2 py-1.5 text-sm text-right"
                />
                <span style={{ color: C.muted }} className="text-xs">%</span>
              </div>
            ))
          })()}
          <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
          <p className="font-display text-sm" style={{ color: C.cream }}>Pedido por QR</p>
          <ToggleRow C={C} label="Activar pedido QR en mesa" value={ticketSettings.qrOrderingEnabled} defaultValue="true" onChange={v => setTicketSettings((s: any) => ({ ...s, qrOrderingEnabled: v }))} />
          <ToggleRow C={C} label="Requerir pago al pedir" value={ticketSettings.qrRequirePayment} defaultValue="false" onChange={v => setTicketSettings((s: any) => ({ ...s, qrRequirePayment: v }))} />
          <div>
            <label className="text-[10px] uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Color primario QR</label>
            <input value={ticketSettings.qrThemePrimary || '#c4a04a'} onChange={e => setTicketSettings((s: any) => ({ ...s, qrThemePrimary: e.target.value }))}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm" placeholder="#c4a04a" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Color secundario QR</label>
            <input value={ticketSettings.qrThemeSecondary || '#1a1a1a'} onChange={e => setTicketSettings((s: any) => ({ ...s, qrThemeSecondary: e.target.value }))}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm" placeholder="#1a1a1a" />
          </div>
          <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
          <p className="font-display text-sm" style={{ color: C.cream }}>Pedido Online (recogida/domicilio)</p>
          <ToggleRow C={C} label="Activar pedidos online" value={ticketSettings.onlineOrderingEnabled} defaultValue="true" onChange={v => setTicketSettings((s: any) => ({ ...s, onlineOrderingEnabled: v }))} />
          <ToggleRow C={C} label="Requerir pago online" value={ticketSettings.onlinePaymentRequired} defaultValue="true" onChange={v => setTicketSettings((s: any) => ({ ...s, onlinePaymentRequired: v }))} />
          <ToggleRow C={C} label="Aceptar automáticamente" value={ticketSettings.onlineAutoAccept} defaultValue="true" onChange={v => setTicketSettings((s: any) => ({ ...s, onlineAutoAccept: v }))} />
          <div>
            <label className="text-[10px] uppercase tracking-wide mb-1 block" style={{ color: C.muted }}>Tiempo preparación (min)</label>
            <input value={ticketSettings.onlinePrepTime || '20'} onChange={e => setTicketSettings((s: any) => ({ ...s, onlinePrepTime: e.target.value }))}
              type="number" min={5} max={120}
              style={{ background: C.surfaceLight, color: C.cream }}
              className="w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <div style={{ borderTop: `1px solid ${C.line}` }} className="my-2" />
          <p className="font-display text-sm" style={{ color: C.cream }}>Fichaje (clock-in)</p>
          <ToggleRow C={C} label="Activar fichaje de empleados" value={ticketSettings.clockinEnabled} defaultValue="true" onChange={v => setTicketSettings((s: any) => ({ ...s, clockinEnabled: v }))} />
          <ToggleRow C={C} label="Requerir PIN para fichar" value={ticketSettings.clockinPinRequired} defaultValue="true" onChange={v => setTicketSettings((s: any) => ({ ...s, clockinPinRequired: v }))} />
          <ToggleRow C={C} label="Geolocalización requerida" value={ticketSettings.clockinGeolocation} defaultValue="false" onChange={v => setTicketSettings((s: any) => ({ ...s, clockinGeolocation: v }))} />
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={async () => {
              try { await saveSettings(ticketSettings) } catch { enqueueMutation('/api/settings', JSON.stringify(ticketSettings)); showToast('Sin conexión — la configuración se guardará cuando vuelva la red') }
              setShowSettings(false)
            }}
            style={{ background: C.sage, color: '#fff' }}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium"
          >
            Guardar
          </button>
          <button
            onClick={() => setShowSettings(false)}
            style={{ color: C.muted, background: C.surfaceLight }}
            className="flex-1 rounded-lg py-2.5 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ C, label, value, defaultValue, onChange }: { C: Record<string, string>; label: string; value: string; defaultValue: string; onChange: (v: string) => void }) {
  const on = (value || defaultValue) === 'true'
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: C.cream }}>{label}</span>
      <button onClick={() => onChange(on ? 'false' : 'true')}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ background: on ? C.brass : C.line }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: on ? 'translateX(22px)' : 'translateX(0)', left: '0.5px' }} />
      </button>
    </div>
  )
}
