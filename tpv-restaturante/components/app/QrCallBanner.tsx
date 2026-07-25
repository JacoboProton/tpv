import { Bell } from 'lucide-react';
import type { Theme } from './constants';

export function QrCallBanner({
  qrCalls, colors, onDismiss,
}: {
  qrCalls: any[]; colors: Theme; onDismiss: () => void;
}) {
  if (qrCalls.length === 0) return null;

  return (
    <div style={{ background: colors.brass, color: '#000' }} className="flex items-center justify-between px-4 py-2 text-xs font-medium no-print">
      <span className="flex items-center gap-2"><Bell className="w-3.5 h-3.5" />{qrCalls.length === 1 ? `Mesa ${qrCalls[0].tableName || qrCalls[0].tableId} necesita atención` : `${qrCalls.length} mesas llaman al camarero`}</span>
      <button onClick={onDismiss}
        className="px-2 py-0.5 rounded text-[10px] font-bold hover:opacity-80" style={{ background: 'rgba(0,0,0,0.2)' }}>
        Atender
      </button>
    </div>
  );
}
