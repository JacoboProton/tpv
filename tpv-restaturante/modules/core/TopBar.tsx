import {
  Sun, Moon, ShieldCheck, LayoutGrid, LogOut, Power,
  Printer, Settings, Clock, X,
} from 'lucide-react'
import { type Theme } from '@/components/constants'
import type { CurrentUser } from '@/domain/types'

interface TopBarProps {
  colors: Theme
  theme: string
  toggleTheme: () => void
  currentUser: CurrentUser | null
  trainingMode: boolean
  toggleTraining: () => void
  handlePrint: () => void
  setShowSettings: (v: boolean) => void
  setMenuMode: (v: string) => void
  logout: () => void
  showToast: (msg: string) => void
  ticketSettings: Record<string, unknown>
  loadClockinSummary: () => void
  setShowClockinModal: (v: boolean) => void
  clockinSummary: { totalHours?: number; entries?: unknown[] } | null
}

export default function TopBar({
  colors: C, theme, toggleTheme, currentUser,
  trainingMode, toggleTraining, handlePrint,
  setShowSettings, setMenuMode, logout, showToast,
  ticketSettings, loadClockinSummary, setShowClockinModal, clockinSummary,
}: TopBarProps) {
  return (
    <header style={{
      background: C.surface, borderBottom: `1px solid ${C.line}`,
      padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 40,
    }}>
      <div className="flex items-center gap-1">
        {currentUser && (
          <span className="text-xs font-medium px-2 py-0.5 rounded"
            style={{ background: C.surfaceLight, color: C.cream }}>
            {currentUser.name}
            {currentUser.role === 'admin' && ' 👑'}
          </span>
        )}
        {currentUser?.role !== 'admin' && (
          <span className="text-xs text-muted">{(currentUser as any)?.role}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={toggleTheme} style={{ color: C.muted }} className="btn-icon" title="Tema">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button onClick={toggleTraining} style={{ color: trainingMode ? C.wine : C.muted }} className="btn-icon" title="Formación">
          <ShieldCheck size={15} />
        </button>

        <button onClick={() => { loadClockinSummary(); setShowClockinModal(true) }}
          style={{ color: C.muted }} className="btn-icon" title="Fichar">
          <Clock size={15} />
        </button>

        <button onClick={handlePrint} style={{ color: C.muted }} className="btn-icon" title="Imprimir">
          <Printer size={15} />
        </button>

        {currentUser?.role === 'admin' && (
          <button onClick={() => setShowSettings(true)} style={{ color: C.muted }} className="btn-icon">
            <Settings size={15} />
          </button>
        )}

        <button onClick={() => setMenuMode(currentUser ? 'login' : 'app')} style={{ color: C.muted }} className="btn-icon">
          {currentUser ? <LogOut size={15} /> : <Power size={15} />}
        </button>
      </div>

    </header>
  )
}
