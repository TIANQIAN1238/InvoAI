import { getUserFromHeader } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';
import { NextRequest } from 'next/server';

export async function OPTIONS() { return corsResponse(); }

// Get a single invoice.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const { id } = await params;
  const rows = await query<Array<Record<string, unknown>>>(
    'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
    [id, payload.userId]
  );

  if (rows.length === 0) return error('Invoice not found', 404);
  return json({
    ...rows[0],
    amount: Number(rows[0].amount ?? 0),
    tax_amount: Number(rows[0].tax_amount ?? 0),
    total_amount: Number(rows[0].total_amount ?? 0),
  });
}

// Update invoice fields (including OCR data).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const { id } = await params;
  const body = await request.json();

  const existing = await query<Array<Record<string, unknown>>>(
    'SELECT id FROM invoices WHERE id = ? AND user_id = ?',
    [id, payload.userId]
  );
  if (existing.length === 0) return error('Invoice not found', 404);

  const allowedFields = [
    'invoice_number', 'invoice_code', 'invoice_date', 'amount',
    'tax_amount', 'total_amount', 'seller_name', 'buyer_name',
    'invoice_type', 'remarks', 'raw_ocr_result', 'status',
  ];

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return json({ ok: true });
  values.push(id);

  await execute(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, values);
  return json({ ok: true });
}

// Delete invoice and its file payload.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const { id } = await params;
  await execute(
    `DELETE f FROM invoice_files f
     INNER JOIN invoices i ON i.id = f.invoice_id
     WHERE f.invoice_id = ? AND i.user_id = ?`,
    [id, payload.userId]
  );
  await execute('DELETE FROM invoices WHERE id = ? AND user_id = ?', [id, payload.userId]);
  return json({ ok: true });
}
