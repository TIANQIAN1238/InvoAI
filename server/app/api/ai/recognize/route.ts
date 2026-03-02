import { getUserFromHeader } from '@/lib/auth';
import { checkBalance, checkAndDeductBalance, recognizeInvoiceAI } from '@/lib/ai-proxy';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  const balance = await checkBalance(payload.userId);
  if (balance <= 0) {
    return error('余额不足，请充值', 402);
  }

  const { image_base64, model = 'gpt-4o' } = await request.json();
  if (!image_base64) {
    return error('缺少图片数据');
  }

  try {
    const { content, usage } = await recognizeInvoiceAI(image_base64, model);

    // 扣费
    await checkAndDeductBalance(
      payload.userId,
      model,
      usage.prompt_tokens,
      usage.completion_tokens,
      'recognize'
    );

    return json({ content });
  } catch (err) {
    console.error('Recognize error:', err);
    const msg = err instanceof Error ? err.message : 'AI 识别失败';
    return error(msg, 502);
  }
}
