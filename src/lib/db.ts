import type { Invoice } from '@/types/invoice';
import {
  apiGetInvoices,
  apiGetInvoiceStats,
  apiCreateInvoice,
  apiUpdateInvoice,
  apiDeleteInvoice,
} from './api';

export async function insertInvoice(data: {
  file_path: string;
  file_name: string;
}): Promise<number> {
  const result = await apiCreateInvoice(data);
  return result.id;
}

export async function updateInvoiceOcr(id: number, data: {
  invoice_number?: string;
  invoice_code?: string;
  invoice_date?: string | null;
  amount?: number;
  tax_amount?: number;
  total_amount?: number;
  seller_name?: string;
  buyer_name?: string;
  invoice_type?: string;
  remarks?: string;
  raw_ocr_result?: string;
  status?: string;
}): Promise<void> {
  await apiUpdateInvoice(id, data);
}

export async function getInvoices(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Invoice[]> {
  const rows = await apiGetInvoices(params);
  return rows as Invoice[];
}

export async function deleteInvoice(id: number): Promise<void> {
  await apiDeleteInvoice(id);
}

export async function getStats(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ count: number; totalAmount: number }> {
  return apiGetInvoiceStats(params);
}
