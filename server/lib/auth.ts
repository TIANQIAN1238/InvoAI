import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { query, execute } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-key'
);

export interface JwtPayload {
  userId: number;
  email: string;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  balance: number;
  created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as JwtPayload;
}

// 从 Authorization header 解析用户
export async function getUserFromHeader(request: Request): Promise<JwtPayload | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return await verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

// 注册
export async function registerUser(email: string, password: string): Promise<{ id: number; token: string }> {
  const existing = await query<UserRow[]>('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new Error('邮箱已注册');
  }
  const hash = await hashPassword(password);
  const result = await execute(
    'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
    [email, hash, email.split('@')[0]]
  );
  const token = await createToken({ userId: result.insertId, email });
  return { id: result.insertId, token };
}

// 登录
export async function loginUser(email: string, password: string): Promise<{ id: number; token: string }> {
  const rows = await query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) throw new Error('邮箱或密码错误');
  const user = rows[0];
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new Error('邮箱或密码错误');
  const token = await createToken({ userId: user.id, email: user.email });
  return { id: user.id, token };
}

// 获取用户信息
export async function getUserInfo(userId: number) {
  const rows = await query<UserRow[]>(
    'SELECT id, email, display_name, balance, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (rows.length === 0) return null;
  return rows[0];
}
