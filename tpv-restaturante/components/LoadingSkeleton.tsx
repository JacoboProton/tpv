import type { Theme } from './constants';

export function LoadingSkeleton({ colors }: { colors: Theme }) {
  return (
    <div style={{ background: colors.base, color: colors.cream, minHeight: '100vh' }} className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_: any, i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: colors.surface }} />
        ))}
      </div>
    </div>
  );
}
