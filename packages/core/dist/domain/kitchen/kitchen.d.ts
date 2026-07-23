import type { ItemState, KitchenItem, Floor } from '../types';
export type { ItemState, KitchenItem };
export declare function getItemState(item: KitchenItem): ItemState;
export declare function canTransitionTo(item: KitchenItem, target: ItemState): boolean;
export declare function isPending(item: KitchenItem): boolean;
export declare function isInKitchen(item: KitchenItem): boolean;
export declare function hasUnsentItems(items: KitchenItem[]): boolean;
export declare function hasPendingItems(items: KitchenItem[]): boolean;
export declare function countPendingLines(items: KitchenItem[]): number;
export declare function countPendingKitchenItems(floor: Floor): number;
export declare function formatItemPreview(itemNames: string[], max?: number): string;
//# sourceMappingURL=kitchen.d.ts.map