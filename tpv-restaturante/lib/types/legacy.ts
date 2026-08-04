// Legacy type alias shims for backward compatibility
// These types have been moved to @tpv/core. Import from there directly in new code.
// This file provides temporary aliases to avoid breakage in existing modules.
// @deprecated Use @tpv/core exports instead.

export type Floor = import('@tpv/core').Floor;
export type Order = import('@tpv/core').Order;
export type OrderItem = import('@tpv/core').OrderItem;
export type TicketSettings = import('@tpv/core').TicketSettings;
export type CatalogProduct = import('@tpv/core').CatalogProduct;
