import { ShieldCheck, User, Delete } from 'lucide-react';

export default function LoginScreen({
  employees, loginSelected, setLoginSelected,
  pinInput, setPinInput, onDigit, onDelete, onBack, colors: C,
}) {
  return (
    <div
      style={{ background: C.base, color: C.cream, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}
      className="flex flex-col items-center justify-center p-6"
    >
      <style>{`
        @keyframes dotPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        .dot-pulse { animation: dotPulse 1s infinite; }
      `}</style>

      <div className="flex flex-col items-center mb-10">
        <h1 className="font-display text-5xl mb-2" style={{ color: C.brassLight }}>LA COMANDA</h1>
        <p style={{ color: C.muted }} className="text-sm">TPV Profesional</p>
      </div>

      <div
        style={{ position: 'fixed', bottom: 24, right: 24, background: '#fff', border: `3px solid ${C.brass}`, borderRadius: 16 }}
        className="p-3 flex flex-col items-center gap-1 shadow-2xl z-50"
      >
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://tpv-sigma.vercel.app/descargar')}`}
          alt="QR App Móvil"
          className="w-40 h-40"
        />
        <span className="text-xs font-semibold" style={{ color: '#333' }}>Descargar App</span>
      </div>

      {!loginSelected ? (
        <div className="w-full max-w-lg flex flex-col items-center gap-5">
          <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">Selecciona tu usuario</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setLoginSelected(emp)}
                style={{ background: C.surface, border: `2px solid ${emp.role === 'admin' ? C.brass : C.line}` }}
                className="rounded-xl p-5 flex flex-col items-center gap-3 hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
              >
                <div style={{ background: emp.role === 'admin' ? 'rgba(200,147,43,0.2)' : C.surfaceLight }} className="w-14 h-14 rounded-full flex items-center justify-center">
                  {emp.role === 'admin'
                    ? <ShieldCheck className="w-7 h-7" style={{ color: C.brassLight }} />
                    : <User className="w-7 h-7" style={{ color: C.muted }} />}
                </div>
                <span className="text-base font-medium text-center">{emp.name}</span>
                {emp.role === 'admin' && (
                  <span style={{ color: C.brassLight }} className="text-[10px] uppercase tracking-wide">Administrador</span>
                )}
              </button>
            ))}
          </div>
          <button onClick={onBack} style={{ color: C.muted }} className="text-sm hover:opacity-80 flex items-center gap-1 mt-4">
            ← Volver al menú
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            {loginSelected.role === 'admin'
              ? <ShieldCheck className="w-5 h-5" style={{ color: C.brassLight }} />
              : <User className="w-5 h-5" style={{ color: C.muted }} />}
            <p className="text-sm font-medium" style={{ color: C.cream }}>{loginSelected.name}</p>
          </div>
          <p style={{ color: C.muted }} className="text-xs mb-5">Introduce tu PIN de 4 dígitos</p>

          <div className="flex gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <span
                key={i}
                style={{
                  background: i < pinInput.length ? C.brassLight : 'transparent',
                  border: `2px solid ${i < pinInput.length ? C.brassLight : C.line}`,
                }}
                className={`w-5 h-5 rounded-full flex items-center justify-center ${i === pinInput.length ? 'dot-pulse' : ''}`}
              >
                {i < pinInput.length && <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.base }} />}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => onDigit(d)}
                style={{ background: C.surface, border: `2px solid ${C.line}` }}
                className="rounded-xl py-4 text-xl font-medium hover:opacity-90 transition-all active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => { setLoginSelected(null); setPinInput(''); }}
              style={{ color: C.muted, background: C.surfaceLight }}
              className="rounded-xl py-3 text-xs font-medium hover:opacity-80"
            >
              Atrás
            </button>
            <button
              onClick={() => onDigit('0')}
              style={{ background: C.surface, border: `2px solid ${C.line}` }}
              className="rounded-xl py-4 text-xl font-medium hover:opacity-90 transition-all active:scale-95"
            >
              0
            </button>
            <button
              onClick={onDelete}
              style={{ color: C.muted, background: C.surfaceLight }}
              className="rounded-xl py-4 flex items-center justify-center hover:opacity-80 transition-all"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}