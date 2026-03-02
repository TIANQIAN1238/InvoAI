import { getUserFromHeader } from '@/lib/auth';
import { query } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function GET(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const conditions: string[] = ['user_id = ?'];
  const values: unknown[] = [payload.userId];

  if (search) {
    conditions.push('(invoice_number LIKE ? OR seller_name LIKE ? OR buyer_name LIKE ? OR invoice_code LIKE ?)');
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const q = `%${escaped}%`;
    values.push(q, q, q, q);
  }
  if (dateFrom) {
    conditions.push('invoice_date >= ?');
    values.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('invoice_date <= ?');
    values.push(dateTo);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = await query<Array<{ cnt: string; total: string }>>(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM invoices ${where}`,
    values
  );

  return json({
    count: Number(rows[0]?.cnt ?? 0),
    totalAmount: Number(rows[0]?.total ?? 0),
  });
}
