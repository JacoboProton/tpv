import type { IgicBreakdown } from '../types';
export type { IgicBreakdown };
export declare const IGIC_RATE = 0.07;
export declare function calculateBaseImponible(totalConIgic: number): number;
export declare function calculateIgic(totalConIgic: number): IgicBreakdown;
export declare function generateInvoiceNumber(now?: Date): string;
//# sourceMappingURL=invoice.d.ts.map