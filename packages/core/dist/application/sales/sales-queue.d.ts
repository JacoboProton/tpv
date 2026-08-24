import type { Sale } from '../../domain/types';
export interface SalesQueueDeps {
    addSale: (sale: Sale) => Promise<{
        ok: boolean;
        ticketNumber?: string;
    }>;
    setSales: (updater: (prev: Sale[]) => Sale[]) => void;
    cacheSet: (key: string, value: Sale[] | null) => void;
    showToast: (msg: string) => void;
    log: (msg: string) => void;
    wait: (ms: number) => Promise<void>;
    /**
     * Persiste la venta en la cola de mutaciones durable (localStorage) para
     * que el sync la reenvíe cuando vuelva la red. Evita perder la venta.
     */
    persistSale: (sale: Sale) => void;
}
export declare function processSalesQueue(queue: Sale[], processingRef: {
    current: boolean;
}, deps: SalesQueueDeps): Promise<void>;
//# sourceMappingURL=sales-queue.d.ts.map