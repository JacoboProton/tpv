import { z } from 'zod';

// ----- Schemas -----
export const DocumentLineSchema = z.object({
  description: z.string(),
  category: z.string().optional(),
  baseAmount: z.number(),
  vatRate: z.number(),
  vatAmount: z.number().optional(),
  withholding: z.number().optional(),
  zone: z.enum(['spain', 'eu', 'outside_eu']).optional().default('spain'),
  type: z.enum(['good', 'service']).optional().default('good')
});

export const DocumentSchema = z.object({
  type: z.enum(['expense', 'income']),
  fileName: z.string().optional(),
  providerName: z.string().optional(),
  providerNif: z.string().optional(),
  documentDate: z.string().optional(),
  confirmed: z.boolean().optional(),
  isPeriodic: z.boolean().optional(),
  notes: z.string().optional(),
  lines: z.array(DocumentLineSchema).optional()
});

export const PayrollSchema = z.object({
  employeeName: z.string(),
  employeeNif: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  grossAmount: z.number(),
  irpfWithholding: z.number(),
  ssWorker: z.number(),
  ssCompany: z.number(),
  netAmount: z.number().optional(),
  notes: z.string().optional()
});

export const CalculateSchema = z.object({
  modelCode: z.enum(['303', '111', '115', '130', '349', '347', '390', '190', '180']),
  year: z.number().int(),
  quarter: z.enum(['1', '2', '3', '4']).transform(v => Number(v))
});

export const SettingsSchema = z.object({}).catchall(z.string());

export const ConfirmSchema = z.object({
  id: z.string()
});

export const StatusSchema = z.object({
  id: z.string(),
  status: z.enum(['draft', 'presented', 'reviewed', 'submitted'])
});

export const AuthorizationSchema = z.object({
  name: z.string().optional(),
  nif: z.string().optional(),
  signedAt: z.number().optional(),
  socialRed: z.boolean().optional(),
  revoke: z.boolean().optional()
});
export const OperationsSchema = z.object({});


export function validateRequest(body: Record<string, unknown>) {
  const { action } = body;
  switch (action) {
    case 'document':
      DocumentSchema.parse(body.document);
      break;
    case 'payroll':
      PayrollSchema.parse(body.payroll);
      break;
    case 'calculate':
      // calculate expects fields directly on the body
      CalculateSchema.parse(body);
      break;
    case 'settings':
      SettingsSchema.parse(body.settings);
      break;
    case 'confirm':
      ConfirmSchema.parse(body);
      break;
    case 'status':
      StatusSchema.parse(body);
      break;
    case 'authorization':
      AuthorizationSchema.parse(body);
      break;
    case 'operations':
      OperationsSchema.parse(body);
      break;  }
}
