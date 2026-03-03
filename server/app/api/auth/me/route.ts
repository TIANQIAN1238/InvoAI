import { getUserFromHeader, getUserInfo } from '@/lib/auth';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function GET(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const user = await getUserInfo(payload.userId);
  if (!user) return error('User not found', 404);

  return json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    balance: Number(user.balance),
    createdAt: user.created_at,
  });
}
