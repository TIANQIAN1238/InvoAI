import { getUserFromHeader } from '@/lib/auth';
import { checkBalance, checkAndDeductBalance, createChatStream, isAllowedModel } from '@/lib/ai-proxy';
import { error, corsResponse, corsHeaders } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('未登录', 401);

  // 检查余额
  const balance = await checkBalance(payload.userId);
  if (balance <= 0) {
    return error('余额不足，请充值', 402);
  }

  let body: { messages?: unknown; model?: string };
  try {
    body = await request.json();
  } catch {
    return error('请求格式错误');
  }

  const { messages, model = 'gemini-3-flash-preview' } = body;
  if (!messages || !Array.isArray(messages)) {
    return error('消息不能为空');
  }

  if (!isAllowedModel(model)) {
    return error(`不支持的模型: ${model}`);
  }

  try {
    const aiResponse = await createChatStream(messages, model);

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return error(`AI 服务错误: ${text}`, 502);
    }

    // 创建 SSE 流式转发
    const reader = aiResponse.body?.getReader();
    if (!reader) return error('无法获取流', 500);

    let totalContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) {
                controller.enqueue(encoder.encode('\n'));
                continue;
              }

              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) totalContent += delta;

                  // 提取 usage 信息（有些模型在最后一个 chunk 返回）
                  if (parsed.usage) {
                    promptTokens = parsed.usage.prompt_tokens || 0;
                    completionTokens = parsed.usage.completion_tokens || 0;
                  }
                } catch {
                  // 解析失败，原样转发
                }

                // 原样转发 SSE 数据
                controller.enqueue(encoder.encode(line + '\n'));
              } else {
                controller.enqueue(encoder.encode(line + '\n'));
              }
            }
          }

          // 流结束后扣费
          if (promptTokens === 0) {
            // 估算 token 数（当 API 不返回 usage 时）
            promptTokens = Math.ceil(JSON.stringify(messages).length / 4);
            completionTokens = Math.ceil(totalContent.length / 4);
          }

          await checkAndDeductBalance(
            payload.userId, model, promptTokens, completionTokens, 'chat'
          );
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat proxy error:', err);
    return error('AI 服务暂不可用', 502);
  }
}
