import { registerUser } from '@/lib/auth';
import { initDatabase } from '@/lib/db';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return error('请输入邮箱和密码');
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error('邮箱格式不正确');
    }

    if (password.length < 6) {
      return error('密码至少6位');
    }

    // 确保表存在
    await initDatabase();

    const result = await registerUser(email, password);
    return json({ token: result.token, userId: result.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '注册失败';
    return error(msg);
  }
}
