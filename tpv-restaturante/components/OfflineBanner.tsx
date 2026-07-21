import { WifiOff } from 'lucide-react';
import type { Theme } from './constants';

export function OfflineBanner({ colors, pendingMutations }: { colors: Theme; pendingMutations: number }) {
  return (
    <div style={{ background: colors.wine, color: colors.cream }} className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium no-print">
      <WifiOff className="w-3.5 h-3.5" /> Sin conexión — los cambios se guardarán cuando vuelva la red
      {pendingMutations > 0 && <span className="ml-1">({pendingMutations} pendientes)</span>}
    </div>
  );
}
