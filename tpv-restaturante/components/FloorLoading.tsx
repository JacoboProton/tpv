import type { Theme } from './constants';

export function FloorLoading({ colors }: { colors: Theme }) {
  return (
    <div style={{ background: colors.base, minHeight: '100vh' }}
      className="flex items-center justify-center p-6">
      <div className="animate-pulse text-sm" style={{ color: colors.muted }}>Cargando datos del salón…</div>
    </div>
  );
}
