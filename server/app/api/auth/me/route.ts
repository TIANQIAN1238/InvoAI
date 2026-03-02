import { getUserFromHeader, getUserInfo } from '@/lib/auth';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function GET(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  const user = await getUserInfo(payload.userId);
  if (!user) return error('用户不存在', 404);

  return json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    balance: user.balance,
    createdAt: user.created_at,
  });
}
