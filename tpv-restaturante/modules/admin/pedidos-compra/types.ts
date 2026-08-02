import type { CatalogProduct } from '@tpv/core';

export type { CatalogProduct };

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  supplierSku: string;
  receivedQty: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: string;
  expectedDate: string;
  notes: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number | null;
  lines: PurchaseOrderLine[];
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  nif: string;
  address: string;
  paymentTerms: string;
  notes: string;
  active: boolean;
  createdAt: number;
}

export interface SupplierCatalogOffer {
  id: string;
  productId: string;
  productName: string;
  price: number;
  sku: string;
  packSize: number;
  minOrder: number;
  isPreferred: boolean;
  active: boolean;
  deliveryDays: number;
  pricePerUnit: number;
  trend: number | null;
  prevPrice: number | null;
}

export interface PreviewGroup {
  supplierId: string;
  supplierName: string;
  lines: { productId: string; productName: string; quantity: number; pricePerUnit: number; supplierSku: string }[];
  total: number;
}

export interface PreviewData {
  preview: PreviewGroup[];
  noOfferProducts: { id: string; name: string }[];
  skippedByMin: { supplierName: string; total: number; minOrderValue: number }[];
}

export interface GenResult {
  ok: boolean;
  created: { id: string; supplierName: string; lineCount: number }[];
  noOfferProducts: { id: string; name: string }[];
  skippedByMin: { supplierName: string; total: number; minOrderValue: number }[];
}

export interface AutoSettings {
  leadTimeDays: string;
  safetyStockDays: string;
  minOrderValue: string;
  consolidateBySupplier: string;
}

export interface OrderLineForm {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  supplierSku: string;
}

export const ORDER_STATUS = ['draft', 'sent', 'partial', 'received'];

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviado', partial: 'Recibido parcial', received: 'Recibido',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: '#8a8275', sent: '#c4a04a', partial: '#6a9af8', received: '#7a9a7c',
};
