import { z } from 'zod';

export const TableSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  status: z.string(),
  orderId: z.union([z.string(), z.number()]).nullable().optional(),
  orderIds: z.array(z.union([z.string(), z.number()])).optional(),
  reserved: z.string().nullable().optional(),
  reserved_for: z.string().optional(),
  isFiado: z.boolean().optional(),
  type: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  shape: z.string().optional(),
  rotation: z.number().optional(),
  seats: z.number().optional(),
  zone: z.string().optional(),
  layer: z.number().optional(),
  color: z.string().optional(),
});

export const OrderSchema = z.object({
  id: z.union([z.string(), z.number()]),
  tableId: z.union([z.string(), z.number()]).optional(),
  items: z.any(), // flexible for now
  createdAt: z.string().optional(),
  employeeName: z.string().nullable().optional(),
});

export const FloorPlanSchema = z.object({
  zones: z.union([z.string(), z.array(z.any())]).optional(),
  background: z.union([z.string(), z.null()]).optional(),
});

export const FloorPutBodySchema = z.object({
  tables: z.array(TableSchema),
  orders: z.record(z.string(), OrderSchema),
  zones: z.union([z.string(), z.array(z.any())]).optional(),
  background: z.union([z.string(), z.null()]).optional(),
});
