import { loginUser } from '@/lib/auth';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return error('请输入邮箱和密码');
    }

    const result = await loginUser(email, password);
    return json({ token: result.token, userId: result.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '登录失败';
    return error(msg, 401);
  }
}
