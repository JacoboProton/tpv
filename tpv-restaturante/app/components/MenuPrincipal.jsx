import { User, Package, BarChart3, Users, ShieldCheck } from 'lucide-react';

export default function MenuPrincipal({ employees, onLoginClick, onAlmacenClick, onCajaClick, onConfigClick, colors: C }) {
  return (
    <div
      style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}
      className="flex flex-col items-center justify-center p-6"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
      `}</style>

      <div className="flex flex-col items-center mb-12">
        <h1 className="font-display text-5xl mb-2" style={{ color: C.brassLight }}>LA COMANDA</h1>
        <p style={{ color: C.muted }} className="text-sm">Sistema de TPV para bares y restaurantes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Entrada */}
        <button
          onClick={onLoginClick}
          style={{ background: C.surface, border: `2px solid ${C.brass}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" style={{ color: C.brassLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>ENTRADA</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Inicia sesión como camarero para trabajar</p>
        </button>

        {/* Almacén */}
        <button
          onClick={onAlmacenClick}
          style={{ background: C.surface, border: `2px solid ${C.sage}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8" style={{ color: C.sageLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>ALMACÉN</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Gestiona inventario y stock (solo admin)</p>
        </button>

        {/* Caja / Informes */}
        <button
          onClick={onCajaClick}
          style={{ background: C.surface, border: `2px solid ${C.brassLight}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8" style={{ color: C.brassLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>CAJA</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Informes, cierres y control de efectivo</p>
        </button>

        {/* Configuración */}
        <button
          onClick={onConfigClick}
          style={{ background: C.surface, border: `2px solid ${C.wine}` }}
          className="rounded-2xl p-8 hover:opacity-90 transition-opacity flex flex-col items-center gap-3"
        >
          <div style={{ background: C.surfaceLight }} className="w-16 h-16 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8" style={{ color: C.wineLight }} />
          </div>
          <h3 className="font-display text-2xl" style={{ color: C.cream }}>CONFIGURACIÓN</h3>
          <p style={{ color: C.muted }} className="text-sm text-center">Gestiona empleados y ajustes (solo admin)</p>
        </button>
      </div>

      {/* Empleados activos */}
      <div
        style={{ background: C.surfaceLight, border: `1px solid ${C.line}` }}
        className="rounded-xl p-4 mt-12 max-w-2xl w-full"
      >
        <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-3">Empleados disponibles</p>
        <div className="flex flex-wrap gap-2">
          {employees.map(emp => (
            <span
              key={emp.id}
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
              className="text-sm px-3 py-1 rounded-full flex items-center gap-1.5"
            >
              {emp.role === 'admin'
                ? <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.brassLight }} />
                : <User className="w-3.5 h-3.5" style={{ color: C.muted }} />}
              {emp.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
