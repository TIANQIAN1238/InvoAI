import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types/invoice';
import { apiChatStream } from '@/lib/api';
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
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    settings: { model: string },
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

    const apiMessages: Array<{ role: string; content: string }> = [];

    if (systemContext) {
      apiMessages.push({ role: 'system', content: systemContext });
    }

    const recentMessages = [...messages.slice(-10), userMsg];
    for (const msg of recentMessages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const controller = apiChatStream(
      apiMessages,
      settings.model,
      (delta) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.id === assistantMsg.id) {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + delta,
            };
          }
          return updated;
        });
      },
      () => {
        setIsStreaming(false);
      },
      (err) => {
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
        setIsStreaming(false);
      },
    );

    abortRef.current = controller;
  }, [messages, isStreaming]);

  const clearMessages = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
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
