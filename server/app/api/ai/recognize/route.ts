import { getUserFromHeader } from '@/lib/auth';
import { checkBalance, checkAndDeductBalance, recognizeInvoiceAI, isAllowedModel } from '@/lib/ai-proxy';
import { json, error, corsResponse } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

// Base64 payload limit: 20MB.
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const balance = await checkBalance(payload.userId);
  if (balance <= 0) {
    return error('Insufficient balance', 402);
  }

  let body: { image_base64?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid request payload');
  }

  const { image_base64, model = 'gemini-3-pro-preview' } = body;
  if (!image_base64) {
    return error('Missing image data');
  }

  if (image_base64.length > MAX_IMAGE_SIZE) {
    return error('Image is too large. Please compress and retry.');
  }

  if (!isAllowedModel(model)) {
    return error(`Unsupported model: ${model}`);
  }

  try {
    const { content, usage } = await recognizeInvoiceAI(image_base64, model);

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
    const msg = err instanceof Error ? err.message : 'Invoice recognition failed';
    return error(msg, 502);
  }
}
