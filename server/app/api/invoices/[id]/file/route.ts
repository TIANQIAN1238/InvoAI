import { getUserFromHeader } from '@/lib/auth';
import { query } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';
import { NextRequest } from 'next/server';

export async function OPTIONS() { return corsResponse(); }

interface InvoiceFileRow {
  mime_type: string;
  file_data: Buffer | Uint8Array | string;
}

function toBuffer(value: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value, 'binary');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  const { id } = await params;

  const rows = await query<InvoiceFileRow[]>(
    `SELECT f.mime_type, f.file_data
     FROM invoice_files f
     INNER JOIN invoices i ON i.id = f.invoice_id
     WHERE i.id = ? AND i.user_id = ?
     LIMIT 1`,
    [id, payload.userId]
  );

  if (rows.length === 0) {
    return error('未找到文件内容', 404);
  }

  const row = rows[0];
  return json({
    mimeType: row.mime_type,
    base64: toBuffer(row.file_data).toString('base64'),
  });
}
