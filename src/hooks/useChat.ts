import { useState, useCallback, useRef } from 'react';
import { Channel } from '@tauri-apps/api/core';
import type { ChatMessage } from '@/types/invoice';
import type { StreamChunk } from '@/lib/ai';
import { chatStream } from '@/lib/ai';
import { generateId } from '@/lib/utils';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      role: 'assistant',
      content: '你好！我是发票管理助手，可以帮你：\n\n- **识别发票** — 上传发票自动提取信息\n- **查询发票** — 按日期、关键词搜索\n- **统计分析** — 汇总金额、张数等\n\n有什么需要帮忙的吗？',
      timestamp: Date.now(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);

  const sendMessage = useCallback(async (
    content: string,
    settings: { apiKey: string; apiBase: string; model: string },
    systemContext?: string,
  ) => {
    if (!content.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    abortRef.current = false;

    try {
      const apiMessages: Array<{ role: string; content: string }> = [];

      if (systemContext) {
        apiMessages.push({
          role: 'system',
          content: systemContext,
        });
      }

      // Include last 10 messages for context
      const recentMessages = [...messages.slice(-10), userMsg];
      for (const msg of recentMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const channel = new Channel<StreamChunk>();
      channel.onmessage = (chunk: StreamChunk) => {
        if (abortRef.current) return;
        if (chunk.content) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.id === assistantMsg.id) {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk.content,
              };
            }
            return updated;
          });
        }
      };

      await chatStream(
        apiMessages,
        settings.apiKey,
        settings.apiBase,
        settings.model,
        channel,
      );
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.id === assistantMsg.id) {
          updated[updated.length - 1] = {
            ...last,
            content: last.content || `出错了: ${err}`,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: '对话已清空，有什么需要帮忙的吗？',
      timestamp: Date.now(),
    }]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
