import { clone } from '../../lib/utils';
export function toggleCuentaStatus(floor, tableId) {
    const next = clone(floor);
    const table = next.tables.find((t) => t.id === tableId);
    if (!table)
        return null;
    table.status = table.status === 'cuenta' ? 'ocupada' : 'cuenta';
    return next;
}
//# sourceMappingURL=toggle-table-status.js.map