import type { StockEntry } from '../types';
export type { StockEntry };
export declare function deductStock(stockByLocation: Record<string, StockEntry> | undefined, ubicacion: string, qty: number): {
    stockByLocation: Record<string, StockEntry>;
    newStock: number;
};
export declare function getStockEntry(stockByLocation: Record<string, StockEntry> | undefined, ubicacion: string): StockEntry;
export declare function isLowStock(entry: StockEntry): boolean;
//# sourceMappingURL=stock.d.ts.map