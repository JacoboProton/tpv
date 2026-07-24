export interface StockModifierOption {
    id: string;
    stockDeduct?: boolean;
    stockArticleId?: string;
    stockQuantity?: number;
    priceDelta?: number;
}
export interface StockModifierGroup {
    id: string;
    options: StockModifierOption[];
}
export interface ModifierData {
    productModifiers: Record<string, string[]>;
    groups: StockModifierGroup[];
}
export declare function getModifierGroupsForProduct(modifierData: ModifierData, productId: string): StockModifierGroup[];
//# sourceMappingURL=modifier-groups.d.ts.map