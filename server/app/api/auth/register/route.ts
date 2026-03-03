import { registerUser } from '@/lib/auth';
import { initDatabase } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return error('Email and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error('Invalid email format');
    }

    if (password.length < 6) {
      return error('Password must be at least 6 characters');
    }

    await initDatabase();

    const result = await registerUser(email, password);
    return json({ token: result.token, userId: result.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return error(msg);
  }
}
