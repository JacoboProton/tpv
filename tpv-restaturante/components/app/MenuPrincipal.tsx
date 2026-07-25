import { User, Package, BarChart3, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Theme } from './constants';

interface MenuPrincipalEmployee {
  id: string;
  name: string;
  role: string;
}

interface MenuPrincipalProps {
  employees: MenuPrincipalEmployee[];
  onLoginClick: () => void;
  onAlmacenClick: () => void;
  onCajaClick: () => void;
  onConfigClick: () => void;
  colors: Theme;
}

export default function MenuPrincipal({ employees, onLoginClick, onAlmacenClick, onCajaClick, onConfigClick, colors: C }: MenuPrincipalProps) {
  return (
    <div
      style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}
      className="flex flex-col items-center justify-center p-6"
    >

      <div className="flex flex-col items-center mb-12">
        <h1 className="font-display text-6xl mb-2" style={{ color: C.brassLight }}>LA COMANDA</h1>
        <p style={{ color: C.muted }} className="text-sm">Sistema de TPV para bares y restaurantes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
        <button
          onClick={onLoginClick}
          style={{ background: C.surface, border: `2px solid ${C.brass}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-all duration-300 flex flex-col items-center gap-4 group hover:scale-[1.02]"
        >
          <div style={{ background: 'rgba(200,147,43,0.15)' }} className="w-20 h-20 rounded-2xl flex items-center justify-center">
            <User className="w-10 h-10" style={{ color: C.brassLight }} />
          </div>
          <h3 className="font-display text-3xl" style={{ color: C.cream }}>ENTRADA</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Inicia sesión como camarero para trabajar</p>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: C.brassLight }} />
        </button>

        <button
          onClick={onAlmacenClick}
          style={{ background: C.surface, border: `2px solid ${C.sage}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-all duration-300 flex flex-col items-center gap-4 group hover:scale-[1.02]"
        >
          <div style={{ background: 'rgba(111,146,114,0.15)' }} className="w-20 h-20 rounded-2xl flex items-center justify-center">
            <Package className="w-10 h-10" style={{ color: C.sageLight }} />
          </div>
          <h3 className="font-display text-3xl" style={{ color: C.cream }}>ALMACÉN</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Gestiona inventario y stock (solo admin)</p>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: C.sageLight }} />
        </button>

        <button
          onClick={onCajaClick}
          style={{ background: C.surface, border: `2px solid ${C.brassLight}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-all duration-300 flex flex-col items-center gap-4 group hover:scale-[1.02]"
        >
          <div style={{ background: 'rgba(227,181,99,0.15)' }} className="w-20 h-20 rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-10 h-10" style={{ color: C.brassLight }} />
          </div>
          <h3 className="font-display text-3xl" style={{ color: C.cream }}>CAJA</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Informes, cierres y control de efectivo</p>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: C.brassLight }} />
        </button>

        <button
          onClick={onConfigClick}
          style={{ background: C.surface, border: `2px solid ${C.wine}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-all duration-300 flex flex-col items-center gap-4 group hover:scale-[1.02]"
        >
          <div style={{ background: 'rgba(162,62,62,0.15)' }} className="w-20 h-20 rounded-2xl flex items-center justify-center">
            <Users className="w-10 h-10" style={{ color: C.wineLight }} />
          </div>
          <h3 className="font-display text-3xl" style={{ color: C.cream }}>EQUIPO</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Gestiona empleados y ajustes (solo admin)</p>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: C.wineLight }} />
        </button>
      </div>

      <div
        style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
        className="rounded-xl p-5 mt-12 max-w-3xl w-full"
      >
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Empleados disponibles</p>
        <div className="flex flex-wrap gap-2">
          {employees.map(emp => (
            <span
              key={emp.id}
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
              className="text-sm px-4 py-2 rounded-full flex items-center gap-2"
            >
              {emp.role === 'admin'
                ? <ShieldCheck className="w-4 h-4" style={{ color: C.brassLight }} />
                : <User className="w-4 h-4" style={{ color: C.muted }} />}
              {emp.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
