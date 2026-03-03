import { initDatabase } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST() {
  try {
    await initDatabase();
    return json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Initialization failed';
    return error(msg, 500);
  }
}
