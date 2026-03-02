// 后端 API 基础地址
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function getToken(): string | null {
  return localStorage.getItem('auth-token');
}

export function setToken(token: string) {
  localStorage.setItem('auth-token', token);
}

export function clearToken() {
  localStorage.removeItem('auth-token');
}

export function hasToken(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    throw new Error('登录过期，请重新登录');
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new Error(`请求失败 (${res.status})`);
    throw new Error('响应格式错误');
  }

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`);
  }
  return data as T;
}

// Auth
export async function apiRegister(email: string, password: string) {
  return request<{ token: string; userId: number }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogin(email: string, password: string) {
  return request<{ token: string; userId: number }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe() {
  return request<{
    id: number;
    email: string;
    displayName: string;
    balance: number;
    createdAt: string;
  }>('/api/auth/me');
}

// Invoices
export async function apiGetInvoices(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  const qs = sp.toString();
  return request<unknown[]>(`/api/invoices${qs ? `?${qs}` : ''}`);
}

export async function apiGetInvoiceStats(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  const qs = sp.toString();
  return request<{ count: number; totalAmount: number }>(`/api/invoices/stats${qs ? `?${qs}` : ''}`);
}

export async function apiCreateInvoice(data: { file_path: string; file_name: string }) {
  return request<{ id: number }>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateInvoice(id: number, data: Record<string, unknown>) {
  return request<{ ok: boolean }>(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteInvoice(id: number) {
  return request<{ ok: boolean }>(`/api/invoices/${id}`, {
    method: 'DELETE',
  });
}

// AI
export async function apiRecognizeInvoice(imageBase64: string, model = 'gpt-4o') {
  return request<{ content: string }>('/api/ai/recognize', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64, model }),
  });
}

// AI Chat SSE 流
export function apiChatStream(
  messages: Array<{ role: string; content: string }>,
  model: string,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();
  const token = getToken();

  fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, model }),
    signal: controller.signal,
  }).then(async (res) => {
    if (res.status === 401) {
      clearToken();
      onError('登录过期，请重新登录');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: '请求失败' }));
      onError(data.error || `错误 ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError('无法读取响应流');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) onChunk(delta);
          } catch {
            // skip unparseable
          }
        }
      }
    }

    // 处理 buffer 中残留数据
    buffer += decoder.decode();
    if (buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) onChunk(delta);
          } catch { /* skip */ }
        }
      }
    }
    onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError(err.message);
    }
  });

  return controller;
}

// DB init
export async function apiInitDb() {
  return request<{ ok: boolean }>('/api/init', { method: 'POST' });
}
