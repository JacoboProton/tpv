import {
  Sun, Moon, ShieldCheck, LayoutGrid, LogOut, Power,
  Printer, Settings, Clock,
} from 'lucide-react'
import { type Theme } from '@/components/constants'
import DrawerModal from '@/components/DrawerModal'

interface TopBarProps {
  colors: Theme
  theme: string
  toggleTheme: () => void
  currentUser: any
  trainingMode: boolean
  toggleTraining: () => void
  handlePrint: () => void
  setShowSettings: (v: boolean) => void
  setMenuMode: (v: string) => void
  logout: () => void
  showToast: (msg: string) => void
  ticketSettings: Record<string, any>
  loadClockinSummary: () => void
  setShowClockinModal: (v: boolean) => void
  clockinSummary: any
}

export default function TopBar({
  colors: C, theme, toggleTheme, currentUser,
  trainingMode, toggleTraining, handlePrint,
  setShowSettings, setMenuMode, logout, showToast,
  ticketSettings, loadClockinSummary, setShowClockinModal, clockinSummary,
}: TopBarProps) {
  return (
    <>
      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.base }} className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between gap-2 no-print">
        <div className="flex items-baseline gap-2">
          <span style={{ color: C.muted }} className="text-xs">TPV de sala</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <div style={{ borderLeft: `1px solid ${C.line}` }} className="flex items-center gap-2 pl-2 ml-1 shrink-0">
            <DrawerModal C={C as unknown as Record<string, string>} ticketSettings={ticketSettings} showToast={showToast} />
            <button onClick={() => { loadClockinSummary(); setShowClockinModal(true) }}
              title="Fichar entrada/salida"
              style={{ color: clockinSummary?.isActive ? C.sageLight : C.muted }}
              className="p-2 rounded-lg hover:opacity-80">
              <Clock className="w-4 h-4" />
            </button>
            <button onClick={handlePrint} title="Imprimir ticket" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              <Printer className="w-4 h-4" />
            </button>
            {currentUser?.role === 'admin' && (
              <button onClick={() => setShowSettings(true)} title="Configurar ticket" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button onClick={toggleTraining}
              title={trainingMode ? 'Salir de formación' : 'Activar modo formación'}
              style={{ color: trainingMode ? C.brassLight : C.muted, background: trainingMode ? C.brass + '20' : 'transparent' }}
              className="p-2 rounded-lg hover:opacity-80 relative">
              <span className="text-base">🎓</span>
            </button>
            <button onClick={toggleTheme} title="Tema" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span style={{ color: C.muted }} className="text-xs hidden md:flex items-center gap-1">
              {currentUser?.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.brassLight }} />}
              {currentUser?.name}
            </span>
            <button onClick={() => setMenuMode('menu')} title="Menu" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={logout} title="Cerrar sesion" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80"><LogOut className="w-4 h-4" /></button>
            <button onClick={() => { window.close(); setTimeout(() => showToast('Instala la app (icono 📲 en la barra) para cerrar automáticamente'), 300) }} title="Salir" style={{ color: C.muted }} className="p-2 rounded-lg hover:opacity-80"><Power className="w-4 h-4" /></button>
          </div>
        </nav>
      </header>
      {trainingMode && (
        <div style={{ background: C.brass + '25', color: C.brassLight, borderBottom: `1px solid ${C.brass}` }}
          className="px-4 py-2 text-center text-sm font-semibold no-print flex items-center justify-center gap-2 sticky top-0 z-20">
          🎓 MODO FORMACIÓN — los tickets NO afectan a la facturación real
        </div>
      )}
    </>
  )
}
