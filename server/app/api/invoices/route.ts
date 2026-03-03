import { getUserFromHeader } from '@/lib/auth';
import { query, execute } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function decodeBase64(input: string): Buffer {
  const compact = input.replace(/\s/g, '');
  return Buffer.from(compact, 'base64');
}

// Get invoice list.
export async function GET(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const conditions: string[] = ['user_id = ?'];
  const values: unknown[] = [payload.userId];

  if (search) {
    conditions.push(
      `(invoice_number LIKE ? ESCAPE '\\\\'
      OR seller_name LIKE ? ESCAPE '\\\\'
      OR buyer_name LIKE ? ESCAPE '\\\\'
      OR invoice_code LIKE ? ESCAPE '\\\\'
      OR invoice_type LIKE ? ESCAPE '\\\\'
      OR IFNULL(remarks, '') LIKE ? ESCAPE '\\\\'
      OR file_name LIKE ? ESCAPE '\\\\')`
    );
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const q = `%${escaped}%`;
    values.push(q, q, q, q, q, q, q);
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

  const result = rows.map(row => ({
    ...row,
    amount: Number(row.amount ?? 0),
    tax_amount: Number(row.tax_amount ?? 0),
    total_amount: Number(row.total_amount ?? 0),
  }));

  return json(result);
}

// Create invoice.
export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  let body: {
    file_path?: string;
    file_name?: string;
    file_data_base64?: string;
    file_mime?: string;
  };

  try {
    body = await request.json();
  } catch {
    return error('Invalid request payload');
  }

  const { file_path, file_name, file_data_base64, file_mime } = body;
  if (!file_path || !file_name) return error('Missing file metadata');

  if (file_data_base64 && !file_mime) {
    return error('Missing file MIME type');
  }

  let fileData: Buffer | null = null;
  if (file_data_base64) {
    try {
      fileData = decodeBase64(file_data_base64);
    } catch {
      return error('Invalid file payload encoding');
    }

    if (fileData.length === 0) return error('File payload is empty');
    if (fileData.length > MAX_UPLOAD_BYTES) {
      return error('File is too large. Please compress and try again.');
    }
  }

  try {
    const result = await execute(
      'INSERT INTO invoices (user_id, file_path, file_name, status) VALUES (?, ?, ?, ?)',
      [payload.userId, file_path, file_name, 'pending']
    );

    if (fileData && file_mime) {
      try {
        await execute(
          'INSERT INTO invoice_files (invoice_id, mime_type, file_data) VALUES (?, ?, ?)',
          [result.insertId, file_mime, fileData]
        );
      } catch (insertFileError) {
        await execute('DELETE FROM invoices WHERE id = ? AND user_id = ?', [result.insertId, payload.userId]);
        throw insertFileError;
      }
    }

    return json({ id: result.insertId }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create invoice';
    return error(msg, 500);
  }
}
