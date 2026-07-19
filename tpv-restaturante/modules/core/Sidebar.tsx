import { type Theme } from '@/components/constants'
import { navGroups } from './nav-config'

interface SidebarProps {
  menuMode: string
  currentUser: any
  tenants: any[]
  tenantId: string
  setTenantId: (id: string) => void
  view: string
  setView: (v: any) => void
  colors: Theme
  lowStockProducts: any[]
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
            style={{ background: C.surfaceLight, color: C.cream, border: `1px solid ${C.line}` }}
            className="w-full mt-1 text-[10px] rounded px-1 py-0.5">
            {tenants.filter((t: any) => t.active).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>
      <nav className="flex flex-col gap-3 p-2 overflow-y-auto flex-1">
        {navGroups.map((group: any) => {
          if (group.adminOnly && currentUser?.role !== 'admin') return null
          const filtered = group.items
          if (filtered.length === 0) return null
          return (
            <div key={group.label}>
              <div className="text-[9px] font-bold uppercase tracking-wider px-3 pb-1 pt-1"
                style={{ color: group.color }}>
                {group.label}
              </div>
              {filtered.map((item: any) => {
                const Icon = item.icon
                const active = view === item.id
                return (
                  <button key={item.id} onClick={() => setView(item.id)}
                    style={{
                      background: active ? C.surfaceLight : 'transparent',
                      color: active ? group.color : C.muted,
                      borderLeft: active ? `3px solid ${group.color}` : '3px solid transparent',
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90 text-left shrink-0 w-full"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {(item.id === 'inventario' || item.id === 'alertas-stock') && lowStockProducts.length > 0 && (
                      <span style={{ background: C.wine }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{lowStockProducts.length}</span>
                    )}
                    {item.id === 'barra' && pendingBarCount > 0 && (
                      <span style={{ background: C.brass }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{pendingBarCount}</span>
                    )}
                    {item.id === 'cocina' && pendingCocinaCount > 0 && (
                      <span style={{ background: C.brass }} className="text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">{pendingCocinaCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
