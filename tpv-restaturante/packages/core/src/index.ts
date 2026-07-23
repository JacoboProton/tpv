// Domain types
export type * from './domain/types'
export * from './domain/types'

// Domain logic
export * from './domain/tables/table'
export * from './domain/tables/table-operations'
export * from './domain/tables/floor-layout'
export * from './domain/kitchen/kitchen'
export * from './domain/pricing/personal-discount'
export * from './domain/pricing/offers'
export * from './domain/invoice/invoice'
export * from './domain/payments/refund'
export * from './domain/payments/payments'
export * from './domain/payments/debt'
export * from './domain/payments/bizum'
export * from './domain/inventory/stock'
export * from './domain/orders/multi-ticket'
export * from './domain/employees/employees'
export * from './domain/employees/employee-operations'
export * from './domain/order/order'
export * from './domain/order/menu-expansion'
export * from './domain/order/line-totals'
export * from './domain/catalog/product-operations'
export * from './domain/catalog/modifier-groups'

// Application use cases
export { executeCloseOrder } from './application/CloseOrder/close-order'
export type { CloseOrderInput, CloseOrderResult, CloseOrderItem, CloseOrderModifierGroup, CloseOrderModifierOption, CloseOrderTable, CloseOrderStockLog } from './application/CloseOrder/close-order'

export { addNormalItem, addMenuItems, addComboItems, editItemModifiers } from './application/AddItemsToOrder/add-items-to-order'
export type { AddNormalItemInput, AddNormalItemResult, AddMenuItemsInput, AddItemsResult, EditItemModifiersInput } from './application/AddItemsToOrder/add-items-to-order'

export { cancelTable, voidTable } from './application/CancelTable/cancel-table'
export type { CancelledItemInfo } from './application/CancelTable/cancel-table'

export { changeItemQuantity, updateItemNotes, removeItemFromOrder, sendToKitchenCourse, sendSingleItemToKitchen, updateItemCourse, markItemsReady, voidOrderItem, setLineDiscount, removeLineDiscount, setItemCourtesy, removeItemCourtesy, setItemOverridePrice } from './application/OrderItemOperations/order-item-operations'

export { toggleCuentaStatus } from './application/TableStatus/toggle-table-status'

export { logoutUser } from './application/auth/logout'
export { loadClockinSummary, handleClockinAction } from './application/auth/clockin'
export type { ClockinDeps } from './application/auth/clockin'

export { processSalesQueue } from './application/sales/sales-queue'
export type { SalesQueueDeps } from './application/sales/sales-queue'

export { applyPersonalDiscount, removePersonalDiscount } from './application/ApplyPersonalDiscount/apply-personal-discount'
export type { ApplyPersonalDiscountDeps, RemovePersonalDiscountDeps, VerifiedEmployee } from './application/ApplyPersonalDiscount/apply-personal-discount'

// Infrastructure types
export type { CatalogProduct, Catalog } from './infrastructure/database/catalog-repository'

// Utils
export { euros, round2, clone } from './lib/utils'
