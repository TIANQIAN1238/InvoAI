import Database from '@tauri-apps/plugin-sql';
import type { Invoice } from '@/types/invoice';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('mysql://root:root@localhost/invoice_db');
  }
  return db;
}

export async function insertInvoice(data: {
  file_path: string;
  file_name: string;
}): Promise<number> {
  const database = await getDb();
  const result = await database.execute(
    'INSERT INTO invoices (file_path, file_name, status) VALUES (?, ?, ?)',
    [data.file_path, data.file_name, 'pending']
  );
  return result.lastInsertId as number;
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
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;
  values.push(id);

  await database.execute(
    `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getInvoices(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Invoice[]> {
  const database = await getDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params?.search) {
    conditions.push('(invoice_number LIKE ? OR seller_name LIKE ? OR buyer_name LIKE ? OR invoice_code LIKE ?)');
    const q = `%${params.search}%`;
    values.push(q, q, q, q);
  }

  if (params?.dateFrom) {
    conditions.push('invoice_date >= ?');
    values.push(params.dateFrom);
  }

  if (params?.dateTo) {
    conditions.push('invoice_date <= ?');
    values.push(params.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await database.select<Invoice[]>(
    `SELECT * FROM invoices ${where} ORDER BY created_at DESC`,
    values
  );
  return rows;
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const database = await getDb();
  const rows = await database.select<Invoice[]>(
    'SELECT * FROM invoices WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function deleteInvoice(id: number): Promise<void> {
  const database = await getDb();
  await database.execute('DELETE FROM invoices WHERE id = ?', [id]);
}

export async function getStats(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ count: number; totalAmount: number }> {
  const database = await getDb();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params?.search) {
    conditions.push('(invoice_number LIKE ? OR seller_name LIKE ? OR buyer_name LIKE ? OR invoice_code LIKE ?)');
    const q = `%${params.search}%`;
    values.push(q, q, q, q);
  }

  if (params?.dateFrom) {
    conditions.push('invoice_date >= ?');
    values.push(params.dateFrom);
  }

  if (params?.dateTo) {
    conditions.push('invoice_date <= ?');
    values.push(params.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await database.select<Array<{ cnt: number; total: number }>>(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM invoices ${where}`,
    values
  );

  return {
    count: rows[0]?.cnt ?? 0,
    totalAmount: rows[0]?.total ?? 0,
  };
}
