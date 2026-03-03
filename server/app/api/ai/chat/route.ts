import { getUserFromHeader } from '@/lib/auth';
import { checkBalance, checkAndDeductBalance, createChatStream, isAllowedModel } from '@/lib/ai-proxy';
import { error, corsResponse, corsHeaders } from '@/lib/response';

export async function OPTIONS() { return corsResponse(); }

export async function POST(request: Request) {
  const payload = await getUserFromHeader(request);
  if (!payload) return error('Unauthorized', 401);

  const balance = await checkBalance(payload.userId);
  if (balance <= 0) {
    return error('Insufficient balance', 402);
  }

  let body: { messages?: unknown; model?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid request payload');
  }

  const { messages, model = 'gemini-3-flash-preview' } = body;
  if (!messages || !Array.isArray(messages)) {
    return error('Messages are required');
  }

  if (!isAllowedModel(model)) {
    return error(`Unsupported model: ${model}`);
  }

  try {
    const aiResponse = await createChatStream(messages, model);

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return error(`AI service error: ${text}`, 502);
    }

    const reader = aiResponse.body?.getReader();
    if (!reader) return error('Unable to read upstream stream', 500);

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

                  if (parsed.usage) {
                    promptTokens = parsed.usage.prompt_tokens || 0;
                    completionTokens = parsed.usage.completion_tokens || 0;
                  }
                } catch {
                  // Keep forwarding upstream chunks.
                }

                controller.enqueue(encoder.encode(`${line}\n`));
              } else {
                controller.enqueue(encoder.encode(`${line}\n`));
              }
            }
          }

          if (promptTokens === 0) {
            promptTokens = Math.ceil(JSON.stringify(messages).length / 4);
            completionTokens = Math.ceil(totalContent.length / 4);
          }

          await checkAndDeductBalance(
            payload.userId,
            model,
            promptTokens,
            completionTokens,
            'chat'
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
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat proxy error:', err);
    return error('AI service is temporarily unavailable', 502);
  }
}
