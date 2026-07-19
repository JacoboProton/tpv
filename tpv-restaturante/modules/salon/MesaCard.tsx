import { ClipboardList, Calendar, Users, QrCode } from 'lucide-react'
import { type Theme } from '@/components/constants'

interface MesaCardTable {
  id: string; name: string; status: string; type: string
  orderId: string | null; isFiado: boolean
  reserved: { name: string; time: string; guests: number } | null
  reserved_for: string
}

interface MesaCardOrderItem { price: number; qty: number; sent: boolean; ready: boolean; sentAt?: number }
interface MesaCardOrder { items: MesaCardOrderItem[] }

interface MesaCardProps {
  table: MesaCardTable
  order: MesaCardOrder | null
  subtotal: number
  itemCount: number
  statusStyle: Record<string, { border: string; label: string; dot: string; bg: string }>
  colors: Theme
  onSelect: (id: string) => void
  onReserve: (id: string) => void
  onCancelReserve: (id: string) => void
  onQr: (id: string) => void
}

export default function MesaCard({
  table: t, order, subtotal, itemCount, statusStyle, colors: C,
  onSelect, onReserve, onCancelReserve, onQr,
}: MesaCardProps) {
  let actualStatus = t.status
  if (t.reserved && !t.orderId) actualStatus = 'reservada'
  if (t.reserved_for && !t.orderId) actualStatus = 'reservada'
  const s = statusStyle[actualStatus] || statusStyle.libre
  const urgent = order && order.items.some(i => i.sent && !i.ready && (Date.now() - (i.sentAt || 0)) / 60000 >= 10)

  return (
    <div
      style={{ background: s.bg, border: `2px solid ${urgent ? C.wine : s.border}` }}
      className={`rounded-xl p-3 text-left transition-all duration-200 hover:scale-[1.02] ${t.status === 'cuenta' ? 'pulse-cuenta' : ''} ${urgent ? 'shadow-lg shadow-red-500/20' : ''}`}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="font-display text-base" style={{ color: C.cream }}>{t.name}</p>
        <div className="flex items-center gap-1">
          {t.isFiado ? (
            <span style={{ background: C.wine, color: C.cream }} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <ClipboardList className="w-2.5 h-2.5" /> Fiado
            </span>
          ) : (
            <span style={{
              background: t.status === 'ocupada' ? C.brassLight : 'transparent',
              color: t.status === 'ocupada' ? C.base : 'transparent',
              minWidth: '20px', minHeight: '20px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 600,
            }}>
              {itemCount > 0 ? itemCount : ''}
            </span>
          )}
        </div>
      </div>
      <p style={{ color: s.dot }} className="text-[10px] font-medium mb-1">{s.label}</p>

      {t.reserved && !t.orderId && (
        <div style={{ background: 'rgba(174,159,140,0.15)' }} className="rounded-md p-1.5 mb-1">
          <p style={{ color: C.muted }} className="text-[10px] font-medium truncate">{t.reserved.name}</p>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px]" style={{ color: C.muted }}>{t.reserved.time}</span>
            <span className="text-[10px] flex items-center gap-1" style={{ color: C.muted }}>
              <Users className="w-2.5 h-2.5" /> {t.reserved.guests}
            </span>
          </div>
        </div>
      )}
      {t.reserved_for && !t.reserved && !t.orderId && (
        <div style={{ background: 'rgba(174,159,140,0.15)' }} className="rounded-md p-1.5 mb-1">
          <p style={{ color: C.muted }} className="text-[10px] font-medium truncate">📋 {t.reserved_for}</p>
        </div>
      )}
      {order && !t.reserved && (
        <p className="font-mono text-xs mt-1" style={{ color: C.muted }}>{subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
      )}

      <div className="flex gap-1 mt-2">
        <button onClick={() => onQr(t.id)}
          style={{ background: C.surfaceLight, color: C.muted }}
          className="text-[10px] py-1 rounded-lg hover:opacity-80 flex items-center justify-center gap-0.5 px-1" title="QR Carta digital">
          <QrCode className="w-3 h-3" />
        </button>
        {t.reserved && !t.orderId && (
          <button onClick={() => onCancelReserve(t.id)}
            style={{ background: C.surfaceLight, color: C.muted }}
            className="flex-1 text-[10px] py-1 rounded-lg hover:opacity-80 flex items-center justify-center gap-1">
            ✕ Reservar
          </button>
        )}
        {!t.reserved && t.status === 'libre' && (
          <button onClick={() => onReserve(t.id)}
            style={{ background: C.surfaceLight, color: C.muted }}
            className="flex-1 text-[10px] py-1 rounded-lg hover:opacity-80 flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3" /> Reservar
          </button>
        )}
        {(t.status !== 'libre' || t.reserved) && (
          <button onClick={() => onSelect(t.id)}
            style={{ background: C.brass, color: C.base }}
            className="flex-1 text-[10px] py-1 rounded-lg font-medium hover:opacity-90">Abrir</button>
        )}
        {t.status === 'libre' && !t.reserved && (
          <button onClick={() => onSelect(t.id)}
            style={{ background: C.brass, color: C.base }}
            className="flex-1 text-[10px] py-1 rounded-lg font-medium hover:opacity-90">Usar</button>
        )}
      </div>
    </div>
  )
}
