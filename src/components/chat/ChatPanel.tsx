import { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, Settings, Trash2, X } from 'lucide-react';
import { ChatInput } from './ChatInput';
import type { AttachedFile } from './ChatInput';
import { MessageList } from './MessageList';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ChatMessage, AppSettings } from '@/types/invoice';

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (content: string, attachment?: AttachedFile) => void;
  onClearChat: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const CHAT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gpt-4o-mini',
  'gpt-4o',
];

const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gpt-4o-mini',
  'gpt-4o',
];

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
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (scrollRef.current && shouldAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="h-10 flex items-center justify-between px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-primary" />
          <span className="text-sm font-medium">AI 助手</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClearChat}
            title="清空对话"
          >
            <Trash2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowSettings(!showSettings)}
            title="设置"
          >
            <Settings size={14} />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="border-b border-border p-3 bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">模型设置</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setShowSettings(false)}>
              <X size={14} />
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">对话模型</Label>
            <Select value={settings.model} onValueChange={(value) => onUpdateSettings({ model: value })}>
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {CHAT_MODELS.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">视觉模型</Label>
            <Select value={settings.visionModel} onValueChange={(value) => onUpdateSettings({ visionModel: value })}>
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {VISION_MODELS.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto" onScroll={handleScroll}>
        <MessageList messages={messages} isStreaming={isStreaming} />
      </div>

      <Separator />

      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
