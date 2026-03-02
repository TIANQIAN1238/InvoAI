import { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, Settings, Trash2, X } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import type { ChatMessage, AppSettings } from '@/types/invoice';

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  onSendMessage,
  onClearChat,
  settings,
  onUpdateSettings,
}: ChatPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 如果用户滚动到距底部 80px 以内，认为在底部
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (scrollRef.current && shouldAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-[var(--color-primary)]" />
          <span className="text-sm font-medium">AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClearChat}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="清空对话"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="设置"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings panel — 只保留模型选择 */}
      {showSettings && (
        <div className="border-b border-[var(--color-border)] p-3 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">模型设置</span>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">对话模型</label>
              <input
                type="text"
                value={settings.model}
                onChange={e => onUpdateSettings({ model: e.target.value })}
                className="w-full mt-0.5 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">视觉模型</label>
              <input
                type="text"
                value={settings.visionModel}
                onChange={e => onUpdateSettings({ visionModel: e.target.value })}
                className="w-full mt-0.5 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto" onScroll={handleScroll}>
        <MessageList messages={messages} isStreaming={isStreaming} />
      </div>

      {/* Input */}
      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
