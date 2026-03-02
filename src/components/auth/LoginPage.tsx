import { useState } from 'react';
import { FileText, Mail, Lock, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  error: string | null;
  onClearError?: () => void;
}

export function LoginPage({ onLogin, onRegister, error, onClearError }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isRegister) {
        await onRegister(email, password);
      } else {
        await onLogin(email, password);
      }
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-4 shadow-lg">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">发票管理系统</h1>
          <p className="text-sm text-gray-500 mt-1">智能识别 · 便捷管理 · AI 助手</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold mb-6">{isRegister ? '创建账号' : '登录'}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition"
                  placeholder={isRegister ? '至少6位密码' : '输入密码'}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {isRegister ? '已有账号？' : '没有账号？'}
            <button
              onClick={() => { setIsRegister(!isRegister); onClearError?.(); }}
              className="text-[var(--color-primary)] hover:underline ml-1"
            >
              {isRegister ? '去登录' : '注册'}
            </button>
          </div>

          {isRegister && (
            <div className="mt-4 text-center text-xs text-gray-400">
              注册即送 $5.00 AI 体验额度
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
