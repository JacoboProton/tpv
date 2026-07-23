export interface ModifierOption {
    id: string;
    stockDeduct?: boolean;
    stockArticleId?: string;
    stockQuantity?: number;
    priceDelta?: number;
}
export interface ModifierGroup {
    id: string;
    options: ModifierOption[];
}
export interface ModifierData {
    productModifiers: Record<string, string[]>;
    groups: ModifierGroup[];
}
export declare function getModifierGroupsForProduct(modifierData: ModifierData, productId: string): ModifierGroup[];
//# sourceMappingURL=modifier-groups.d.ts.map