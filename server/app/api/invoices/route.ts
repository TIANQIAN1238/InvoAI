import { getUserFromHeader } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

// 获取发票列表
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
    // 转义 LIKE 通配符
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
  const rows = await query<Record<string, unknown>[]>(
    `SELECT * FROM invoices ${where} ORDER BY created_at DESC`,
    values
  );

  // 确保 DECIMAL 字段转为数字
  const result = rows.map(row => ({
    ...row,
    amount: Number(row.amount ?? 0),
    tax_amount: Number(row.tax_amount ?? 0),
    total_amount: Number(row.total_amount ?? 0),
  }));

  return json(result);
}

// 创建发票
export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  const body = await request.json();
  const { file_path, file_name } = body;

  if (!file_path || !file_name) {
    return error('缺少文件信息');
  }

  const result = await execute(
    'INSERT INTO invoices (user_id, file_path, file_name, status) VALUES (?, ?, ?, ?)',
    [payload.userId, file_path, file_name, 'pending']
  );

  return json({ id: result.insertId }, 201);
}
