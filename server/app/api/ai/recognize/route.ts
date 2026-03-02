import { getUserFromHeader } from '@/lib/auth';
import { checkBalance, checkAndDeductBalance, recognizeInvoiceAI, isAllowedModel } from '@/lib/ai-proxy';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

// 限制图片大小：20MB base64
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  const balance = await checkBalance(payload.userId);
  if (balance <= 0) {
    return error('余额不足，请充值', 402);
  }

  let body: { image_base64?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return error('请求格式错误');
  }

  const { image_base64, model = 'gemini-3-pro-preview' } = body;
  if (!image_base64) {
    return error('缺少图片数据');
  }

  if (image_base64.length > MAX_IMAGE_SIZE) {
    return error('图片过大，请压缩后重试');
  }

  if (!isAllowedModel(model)) {
    return error(`不支持的模型: ${model}`);
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
