import type { Sale } from '../../domain/types.js';
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
}
export declare function processSalesQueue(queue: Sale[], processingRef: {
    current: boolean;
}, deps: SalesQueueDeps): Promise<void>;
//# sourceMappingURL=sales-queue.d.ts.map