import MenuPrincipal from './MenuPrincipal';
import LoginScreen from './LoginScreen';
import type { Theme } from './constants';

export function LoginGuard({
  employees, menuMode, setMenuMode, entryPoint, setEntryPoint,
  loginSelected, setLoginSelected, pinInput, setPinInput,
  pressDigit, deleteDigit, colors,
}: {
  employees: any[]; menuMode: string; setMenuMode: (m: string) => void;
  entryPoint: string; setEntryPoint: (e: string) => void;
  loginSelected: any; setLoginSelected: (s: any) => void;
  pinInput: string; setPinInput: (p: string) => void;
  pressDigit: (d: string) => void; deleteDigit: () => void;
  colors: Theme;
}) {
  const qrBlock = (
    <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#fff', border: `3px solid ${colors.brass}`, borderRadius: 16 }}
      className="p-3 flex flex-col items-center gap-1 shadow-2xl z-50">
      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://tpv-sigma.vercel.app/descargar')}`}
        alt="QR App Móvil" className="w-40 h-40" />
      <span className="text-xs font-semibold" style={{ color: '#333' }}>Descargar App</span>
    </div>
  );

  const handleLoginClick = (ep: string) => {
    setEntryPoint(ep);
    setMenuMode('login');
  };

  if (menuMode === 'menu') return <><MenuPrincipal employees={employees} onLoginClick={() => handleLoginClick('entrada')} onAlmacenClick={() => handleLoginClick('almacen')} onCajaClick={() => handleLoginClick('caja')} onConfigClick={() => handleLoginClick('config')} colors={colors} />{qrBlock}</>;
  if (menuMode === 'login') return <><LoginScreen employees={employees} loginSelected={loginSelected} setLoginSelected={setLoginSelected} pinInput={pinInput} setPinInput={setPinInput} onDigit={pressDigit} onDelete={deleteDigit} onBack={() => setMenuMode('menu')} colors={colors} />{qrBlock}</>;
  return <><MenuPrincipal employees={employees} onLoginClick={() => handleLoginClick('entrada')} onAlmacenClick={() => handleLoginClick('almacen')} onCajaClick={() => handleLoginClick('caja')} onConfigClick={() => handleLoginClick('config')} colors={colors} />{qrBlock}</>;
}
