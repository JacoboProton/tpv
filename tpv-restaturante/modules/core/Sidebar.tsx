import { type Theme } from '@/components/constants'
import { navGroups } from './nav-config'
import type { CurrentUser } from '@/domain/types'

interface SidebarProps {
  menuMode: string
  currentUser: CurrentUser | null
  tenants: { id: string; name: string }[]
  tenantId: string
  setTenantId: (id: string) => void
  view: string
  setView: (v: string) => void
  colors: Theme
  lowStockProducts: { id: string; name: string; stock?: number }[]
  pendingBarCount: number
  pendingCocinaCount: number
}

export default function Sidebar({
  menuMode, currentUser, tenants, tenantId, setTenantId,
  view, setView, colors: C,
  lowStockProducts, pendingBarCount, pendingCocinaCount,
}: SidebarProps) {
  if (menuMode !== 'app') return null

  return (
    <aside style={{ background: C.surface, borderRight: `1px solid ${C.line}`, width: '160px' }} className="flex flex-col shrink-0 no-print sticky top-0 h-screen">
      <div className="p-3 text-center" style={{ borderBottom: `1px solid ${C.line}` }}>
        <h2 className="font-display text-lg" style={{ color: C.brassLight }}>LA COMANDA</h2>
        {currentUser?.role === 'admin' && tenants.length > 1 && (
          <select value={tenantId} onChange={e => setTenantId(e.target.value)}
            className="w-full text-xs rounded px-1 py-0.5 mt-1"
            style={{ background: C.base, color: C.cream, border: `1px solid ${C.line}` }}>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5">
        {navGroups.map(group => (
          (currentUser?.role === 'admin' || !group.adminOnly) && (
            <div key={group.label}>
              {group.items.map(item => {
                const Icon = item.icon
                const badge = item.id === 'alertas-stock' ? lowStockProducts.length :
                  item.id === 'barra' ? pendingBarCount :
                    item.id === 'cocina' || item.id === 'comandas' ? pendingCocinaCount : 0
                return (
                  <button key={item.id} onClick={() => setView(item.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                      borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none', textAlign: 'left',
                      background: view === item.id ? C.surfaceLight : 'transparent',
                      color: view === item.id ? C.brassLight : C.muted,
                    }}>
                    <Icon size={16} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                        style={{ background: C.wine, color: '#fff' }}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        ))}
      </nav>
    </aside>
  )
}
