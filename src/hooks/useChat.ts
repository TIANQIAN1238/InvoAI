import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/types/invoice';
import { apiChatStream } from '@/lib/api';
import { generateId } from '@/lib/utils';

export function useChat(options?: { onStreamDone?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: '你好！我是发票管理助手，可以帮你：\n\n- **识别发票** — 拖拽或点击 📎 添加发票文件进行OCR识别\n- **查询发票** — 按日期、关键词搜索\n- **统计分析** — 汇总金额、按公司/日期分析\n\n支持 PDF、JPG、PNG 等格式。试试拖拽一张发票到下方输入框吧！',
      timestamp: 0,
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const isStreamingRef = useRef(isStreaming);
  const onStreamDoneRef = useRef(options?.onStreamDone);

  // 同步 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    onStreamDoneRef.current = options?.onStreamDone;
  }, [options?.onStreamDone]);

  // 组件卸载时中止 SSE 连接
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    settings: { model: string },
    systemContext?: string,
  ) => {
    if (!content.trim() || isStreamingRef.current) return;

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

    // 使用 ref 获取最新 messages，避免闭包陈旧问题
    const recentMessages = [...messagesRef.current.slice(-10), userMsg];
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
        onStreamDoneRef.current?.();
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
  }, []);

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
    setIsStreaming(false);
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
    }]);
  }, []);

  const updateLastAssistant = useCallback((content: string) => {
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'assistant') {
          updated[i] = { ...updated[i], content };
          break;
        }
      }
      return updated;
    });
  }, []);

  return {
    messages,
    isStreaming,
    setIsStreaming,
    sendMessage,
    clearMessages,
    addMessage,
    updateLastAssistant,
  };
}
