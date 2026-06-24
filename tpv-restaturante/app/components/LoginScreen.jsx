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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        @keyframes shake { 10%,90% { transform: translateX(-1px); } 20%,80% { transform: translateX(2px); } 30%,50%,70% { transform: translateX(-4px); } 40%,60% { transform: translateX(4px); } }
        .shake { animation: shake .4s; }
      `}</style>

      <h1 className="font-display text-4xl mb-1" style={{ color: C.brassLight }}>LA COMANDA</h1>
      <p style={{ color: C.muted }} className="text-sm mb-8">Identifícate para empezar tu turno</p>

      {!loginSelected ? (
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm mb-4">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setLoginSelected(emp)}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90"
              >
                <div style={{ background: C.surfaceLight }} className="w-10 h-10 rounded-full flex items-center justify-center">
                  {emp.role === 'admin'
                    ? <ShieldCheck className="w-5 h-5" style={{ color: C.brassLight }} />
                    : <User className="w-5 h-5" style={{ color: C.muted }} />}
                </div>
                <span className="text-sm font-medium text-center">{emp.name}</span>
              </button>
            ))}
          </div>
          <button onClick={onBack} style={{ color: C.muted }} className="text-sm hover:opacity-80">
            ← Volver al menú
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col items-center">
          <p className="text-sm mb-1" style={{ color: C.muted }}>Hola, {loginSelected.name}</p>
          <p className="text-xs mb-4" style={{ color: C.muted }}>Introduce tu PIN</p>

          <div className="flex gap-3 mb-6">
            {[0, 1, 2, 3].map(i => (
              <span
                key={i}
                style={{
                  background: i < pinInput.length ? C.brassLight : C.surfaceLight,
                  border: `1px solid ${C.line}`,
                }}
                className="w-3.5 h-3.5 rounded-full"
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => onDigit(d)}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-xl py-4 text-lg font-medium hover:opacity-90"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => { setLoginSelected(null); setPinInput(''); }}
              style={{ color: C.muted }}
              className="rounded-xl py-4 text-xs font-medium"
            >
              Atrás
            </button>
            <button
              onClick={() => onDigit('0')}
              style={{ background: C.surface, border: `1px solid ${C.line}` }}
              className="rounded-xl py-4 text-lg font-medium hover:opacity-90"
            >
              0
            </button>
            <button
              onClick={onDelete}
              style={{ color: C.muted }}
              className="rounded-xl py-4 flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
