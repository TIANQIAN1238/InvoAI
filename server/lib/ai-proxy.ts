import { query, execute } from './db';

const AI_API_KEY = () => process.env.AI_API_KEY || '';
const AI_API_BASE = () => process.env.AI_API_BASE || 'https://api.openai-next.com';

// Pricing in USD per 1K tokens.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-3-flash-preview': { input: 0.0001, output: 0.0004 },
  'gemini-3-pro-preview': { input: 0.001, output: 0.004 },
  'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
};

const ALLOWED_MODELS = new Set(Object.keys(MODEL_PRICING));

export function isAllowedModel(model: string): boolean {
  return ALLOWED_MODELS.has(model);
}

function getPrice(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || MODEL_PRICING['gemini-3-flash-preview'];
}

// Charge user with a safe conditional update to avoid negative balance.
export async function checkAndDeductBalance(
  userId: number,
  model: string,
  promptTokens: number,
  completionTokens: number,
  endpoint: string,
): Promise<{ cost: number; balance: number }> {
  const price = getPrice(model);
  const cost = (promptTokens / 1000) * price.input + (completionTokens / 1000) * price.output;

  const result = await execute(
    'UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?',
    [cost, userId, cost]
  );

  if (result.affectedRows === 0) {
    await execute(
      'INSERT INTO usage_logs (user_id, model, prompt_tokens, completion_tokens, cost, endpoint) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, model, promptTokens, completionTokens, 0, endpoint]
    );
    const rows = await query<Array<{ balance: string }>>('SELECT balance FROM users WHERE id = ?', [userId]);
    return { cost: 0, balance: Number(rows[0]?.balance ?? 0) };
  }

  await execute(
    'INSERT INTO usage_logs (user_id, model, prompt_tokens, completion_tokens, cost, endpoint) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, model, promptTokens, completionTokens, cost, endpoint]
  );

  const rows = await query<Array<{ balance: string }>>('SELECT balance FROM users WHERE id = ?', [userId]);
  return { cost, balance: Number(rows[0]?.balance ?? 0) };
}

export async function checkBalance(userId: number): Promise<number> {
  const rows = await query<Array<{ balance: string }>>('SELECT balance FROM users WHERE id = ?', [userId]);
  return Number(rows[0]?.balance ?? 0);
}

export async function createChatStream(
  messages: Array<{ role: string; content: string }>,
  model: string,
): Promise<Response> {
  const url = `${AI_API_BASE()}/v1/chat/completions`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY()}`,
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

export async function createChatCompletion(
  messages: Array<{ role: string; content: string }>,
  model: string,
): Promise<Response> {
  const url = `${AI_API_BASE()}/v1/chat/completions`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      max_tokens: 4096,
    }),
  });
}

function detectMimeType(base64: string): string {
  if (base64.startsWith('JVBERi')) return 'application/pdf';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw')) return 'image/png';
  if (base64.startsWith('Qk')) return 'image/bmp';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

export async function recognizeInvoiceAI(
  imageBase64: string,
  model: string,
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const url = `${AI_API_BASE()}/v1/chat/completions`;

  const prompt = `You are a professional invoice extraction assistant. Analyze the invoice image and return JSON only:\n\n{\n  "invoice_number": "invoice number",\n  "invoice_code": "invoice code if available",\n  "invoice_date": "YYYY-MM-DD",\n  "amount": "amount before tax (number)",\n  "tax_amount": "tax amount (number)",\n  "total_amount": "total amount (number)",\n  "seller_name": "seller name",\n  "buyer_name": "buyer name",\n  "invoice_type": "invoice type",\n  "remarks": "remarks"\n}\n\nRules:\n- Return numbers only for amount fields (no currency symbol).\n- Return empty string for unknown fields.\n- Use YYYY-MM-DD for dates.\n- Return JSON only, no extra text.`;

  const mimeType = detectMimeType(imageBase64);
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const userContent = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: dataUrl } },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: userContent }],
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
