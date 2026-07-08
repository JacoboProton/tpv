import { useMemo, useState } from 'react';
import { Clock, User, Euro, CreditCard } from 'lucide-react';
import { euros } from './constants';

export default function FiadosView({ sales, floor, onNavigateToTable, colors: C }) {
  const [now] = useState(() => Date.now());

  const debts = useMemo(() => {
    const fiadoSales = sales
      .filter(s => s.isFiado && !s.isDebtPayment)
      .sort((a, b) => b.closedAt - a.closedAt);

    const paidTableIds = new Set(
      sales.filter(s => s.isDebtPayment).map(s => s.tableId)
    );

    const pendingByTable = {};
    fiadoSales.forEach(s => {
      if (paidTableIds.has(s.tableId)) return;
      const existing = pendingByTable[s.tableId];
      if (existing) {
        existing.amount += s.totalWithTip || 0;
        existing.originalSales.push(s);
        if (s.closedAt > existing.mostRecent) existing.mostRecent = s.closedAt;
      } else {
        pendingByTable[s.tableId] = {
          tableId: s.tableId,
          tableName: s.tableName,
          amount: s.totalWithTip || 0,
          mostRecent: s.closedAt,
          daysPending: Math.floor((now - s.closedAt) / 86400000),
          originalSales: [s],
        };
      }
    });

    const floorTable = floor?.tables?.find(t => pendingByTable[t.id]);
    if (floorTable) {
      const debt = pendingByTable[floorTable.id];
      if (debt) {
        const customer = floor?.customers?.find(c =>
          debt.originalSales.some(s => s.tableId === c.tableId)
        );
        debt.customerName = customer?.name || '';
      }
    }

    return Object.values(pendingByTable).sort((a, b) => b.mostRecent - a.mostRecent);
  }, [sales, floor, now]);

  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-2xl" style={{ color: C.cream }}>DEUDAS PENDIENTES</h2>
        {debts.length > 0 && (
          <span style={{ background: C.wine, color: C.cream }} className="text-xs font-medium px-2.5 py-1 rounded-full">
            {euros(totalDebt)} en {debts.length} mesa{debts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {debts.length === 0 ? (
        <p style={{ color: C.muted }} className="text-sm text-center py-12">No hay deudas pendientes 🎉</p>
      ) : (
        <div className="flex flex-col gap-2">
          {debts.map(d => {
            return (
              <div key={d.tableId}
                style={{ background: C.surface, border: `1px solid ${C.line}` }}
                className="rounded-lg p-4 flex items-center gap-4">
                <div style={{ background: C.wine + '25', color: C.wineLight }} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <Euro className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: C.cream }} className="font-medium text-sm">{d.tableName}</span>
                    {d.customerName && (
                      <span style={{ color: C.muted }} className="text-xs flex items-center gap-1">
                        <User className="w-3 h-3" /> {d.customerName}
                      </span>
                    )}
                    <span style={{ color: d.daysPending > 7 ? C.wineLight : C.muted }} className="text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {d.daysPending === 0 ? 'Hoy' : `${d.daysPending}d`}
                    </span>
                  </div>
                  <p style={{ color: C.muted }} className="text-xs mt-0.5">
                    {d.originalSales.length} venta{d.originalSales.length !== 1 ? 's' : ''} fiada{d.originalSales.length !== 1 ? 's' : ''}
                    {d.originalSales.length > 0 && (
                      <> · {new Date(d.mostRecent).toLocaleDateString('es-ES')}</>
                    )}
                  </p>
                </div>
                <span className="font-mono font-bold text-lg" style={{ color: C.wineLight }}>{euros(d.amount)}</span>
                {onNavigateToTable && (
                  <button onClick={() => onNavigateToTable(d.tableId)}
                    style={{ background: C.brass + '25', color: C.brassLight, border: `1px solid ${C.brass}` }}
                    className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1 hover:opacity-80 shrink-0">
                    <CreditCard className="w-3.5 h-3.5" /> Cobrar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
