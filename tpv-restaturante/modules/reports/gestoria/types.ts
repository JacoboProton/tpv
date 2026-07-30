import type { Theme } from '@/components/constants';

export const TAX_MODELS = [
  { code: '303', label: 'IVA', period: 'Trimestral', desc: 'Impuesto sobre el Valor Añadido' },
  { code: '111', label: 'IRPF (trabajadores)', period: 'Trimestral', desc: 'Retenciones IRPF trabajo' },
  { code: '115', label: 'IRPF (alquileres)', period: 'Trimestral', desc: 'Retenciones IRPF alquiler' },
  { code: '130', label: 'Pago fraccionado', period: 'Trimestral', desc: 'Pago fraccionado IRPF autónomos' },
  { code: '349', label: 'Intracomunitario', period: 'Trimestral', desc: 'Declaración recapitulativa intracomunitaria' },
  { code: '347', label: 'Terceros', period: 'Anual', desc: 'Operaciones con terceros >3.005€' },
  { code: '390', label: 'IVA anual', period: 'Anual', desc: 'Resumen anual IVA' },
  { code: '190', label: 'IRPF anual', period: 'Anual', desc: 'Resumen anual retenciones IRPF' },
  { code: '180', label: 'Alquileres anual', period: 'Anual', desc: 'Resumen anual retenciones alquiler' },
];

export const QUARTERS: { q: number; label: string; months: string; deadline: string }[] = [
  { q: 1, label: '1T', months: 'Ene–Mar', deadline: '20 abril' },
  { q: 2, label: '2T', months: 'Abr–Jun', deadline: '20 julio' },
  { q: 3, label: '3T', months: 'Jul–Sep', deadline: '20 octubre' },
  { q: 4, label: '4T', months: 'Oct–Dic', deadline: '30 enero' },
];

export const ZONES = ['spain', 'eu', 'outside_eu'] as const;
export type Zone = typeof ZONES[number];
export const ZONE_LABELS: Record<Zone, string> = { spain: 'España', eu: 'UE', outside_eu: 'Fuera de la UE' };

export const LINE_TYPES = ['good', 'service'] as const;
export type LineType = typeof LINE_TYPES[number];
export const TYPE_LABELS: Record<LineType, string> = { good: 'Bien', service: 'Servicio' };

export interface GestoriaSettings {
  taxRegime: string;
  criterionOfCash: string;
  socialSecurityRed: string;
}

export interface GestoriaLine {
  description: string;
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  withholding: number;
  zone: Zone;
  type: LineType;
  category: string;
}

export interface GestoriaDocument {
  id: string;
  provider_name?: string;
  provider_nif?: string;
  file_name?: string;
  document_date?: string;
  documentDate?: string;
  notes?: string;
  is_periodic?: boolean;
  confirmed?: boolean;
  lines: string | GestoriaLine[];
}

export interface GestoriaPayroll {
  id: string;
  employeeName?: string;
  employee_name?: string;
  employeeNif?: string;
  employee_nif?: string;
  month: number;
  year: number;
  grossAmount?: number;
  gross_amount?: number;
  irpfWithholding?: number;
  irpf_withholding?: number;
  ssWorker?: number;
  ssCompany?: number;
  social_security_company?: number;
  netAmount?: number;
  net_amount?: number;
  notes?: string;
}

export interface TaxModel {
  model_code: string;
  year: number;
  quarter: number;
  status: string;
  data: Record<string, unknown>;
}

export interface Authorization {
  accountant_name: string;
  accountant_nif: string;
  social_security_red: boolean;
  signed_at: number;
  revoked?: boolean;
}

export interface GestoriaViewProps {
  sales: unknown[];
  colors: Theme;
}
