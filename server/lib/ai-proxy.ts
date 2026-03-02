import { query, execute } from './db';

const AI_API_KEY = () => process.env.AI_API_KEY || '';
const AI_API_BASE = () => process.env.AI_API_BASE || 'https://api.openai-next.com';

// 模型费率 ($/1K tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-3-flash-preview': { input: 0.0001, output: 0.0004 },
  'gemini-3-pro-preview': { input: 0.001, output: 0.004 },
  'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
};

// 允许使用的模型白名单
const ALLOWED_MODELS = new Set(Object.keys(MODEL_PRICING));

export function isAllowedModel(model: string): boolean {
  return ALLOWED_MODELS.has(model);
}

function getPrice(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || MODEL_PRICING['gemini-3-flash-preview'];
}

// 检查并扣减余额（条件更新防止余额变负）
export async function checkAndDeductBalance(
  userId: number,
  model: string,
  promptTokens: number,
  completionTokens: number,
  endpoint: string,
): Promise<{ cost: number; balance: number }> {
  const price = getPrice(model);
  const cost = (promptTokens / 1000) * price.input + (completionTokens / 1000) * price.output;

  // 条件扣减：仅当余额足够时才扣减
  const result = await execute(
    'UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?',
    [cost, userId, cost]
  );

  if (result.affectedRows === 0) {
    // 余额不足，仍记录日志但不扣费
    await execute(
      'INSERT INTO usage_logs (user_id, model, prompt_tokens, completion_tokens, cost, endpoint) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, model, promptTokens, completionTokens, 0, endpoint]
    );
    const rows = await query<Array<{ balance: string }>>('SELECT balance FROM users WHERE id = ?', [userId]);
    return { cost: 0, balance: Number(rows[0]?.balance ?? 0) };
  }

  // 记录使用日志
  await execute(
    'INSERT INTO usage_logs (user_id, model, prompt_tokens, completion_tokens, cost, endpoint) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, model, promptTokens, completionTokens, cost, endpoint]
  );

  // 返回最新余额
  const rows = await query<Array<{ balance: string }>>('SELECT balance FROM users WHERE id = ?', [userId]);
  return { cost, balance: Number(rows[0]?.balance ?? 0) };
}

// 检查余额是否充足
export async function checkBalance(userId: number): Promise<number> {
  const rows = await query<Array<{ balance: string }>>('SELECT balance FROM users WHERE id = ?', [userId]);
  return Number(rows[0]?.balance ?? 0);
}

// AI Chat 流式代理
export async function createChatStream(
  messages: Array<{ role: string; content: string }>,
  model: string,
): Promise<Response> {
  const url = `${AI_API_BASE()}/v1/chat/completions`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 4096,
    }),
  });
}

// 根据 base64 内容检测 MIME 类型
function detectMimeType(base64: string): string {
  if (base64.startsWith('JVBERi')) return 'application/pdf';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw')) return 'image/png';
  if (base64.startsWith('Qk')) return 'image/bmp';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg'; // fallback
}

// AI 发票识别（非流式）
export async function recognizeInvoiceAI(
  imageBase64: string,
  model: string,
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const url = `${AI_API_BASE()}/v1/chat/completions`;

  const prompt = `你是一个专业的发票识别助手。请仔细分析这张发票图片，提取以下信息并以JSON格式返回：

{
  "invoice_number": "发票号码",
  "invoice_code": "发票代码（如果有）",
  "invoice_date": "开票日期，格式YYYY-MM-DD",
  "amount": "不含税金额（数字）",
  "tax_amount": "税额（数字）",
  "total_amount": "价税合计（数字）",
  "seller_name": "销售方名称",
  "buyer_name": "购买方名称",
  "invoice_type": "发票类型（如：增值税普通发票、增值税专用发票等）",
  "remarks": "备注信息"
}

注意：
- 金额字段请只返回数字，不要包含货币符号
- 如果某个字段无法识别，请返回空字符串
- 日期格式必须是YYYY-MM-DD
- 只返回JSON，不要有其他文字`;

  const mimeType = detectMimeType(imageBase64);
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  // 根据模型类型选择不同的请求格式
  // Gemini 模型使用 inline_data，OpenAI 模型使用 image_url
  const isGemini = model.startsWith('gemini');

  const userContent = isGemini
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ]
    : [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: userContent,
      }],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI API error ${response.status}: ${text}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  const usage = result.usage || { prompt_tokens: 0, completion_tokens: 0 };

  return { content, usage };
}
