import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/types/invoice';
import { apiChatStream } from '@/lib/api';
import { generateId } from '@/lib/utils';

export function useChat(options?: { onStreamDone?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: 'Hi! I am your invoice assistant. I can help you with:\n\n- **Invoice OCR**: drag a file or use the attachment button\n- **Search**: filter by date and keyword\n- **Analytics**: summarize totals by company/date\n\nSupported formats: PDF, JPG, PNG, BMP, WEBP.',
      timestamp: 0,
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const isStreamingRef = useRef(isStreaming);
  const onStreamDoneRef = useRef(options?.onStreamDone);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    onStreamDoneRef.current = options?.onStreamDone;
  }, [options?.onStreamDone]);

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
              content: last.content || `Error: ${err}`,
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
      content: 'Conversation cleared. What can I help you with next?',
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
