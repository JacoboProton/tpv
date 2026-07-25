import { AlertTriangle } from 'lucide-react';
import type { Theme } from './constants';

export function FatalError({ error, colors }: { error: string; colors: Theme }) {
  return (
    <div style={{ background: colors.base, color: colors.cream, minHeight: '100vh' }} className="flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle style={{ color: colors.wineLight }} className="w-10 h-10 mx-auto mb-3" />
        <p className="font-semibold mb-1">No se ha podido conectar con la base de datos</p>
        <p style={{ color: colors.muted }} className="text-sm">Revisa la conexion con la base de datos y recarga la pagina.</p>
        {error.length > 0 && (
          <pre style={{ color: colors.wineLight, fontSize: 11, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }} className="mt-4 text-left bg-black/20 p-3 rounded max-h-48 overflow-y-auto">{error}</pre>
        )}
      </div>
    </div>
  );
}
