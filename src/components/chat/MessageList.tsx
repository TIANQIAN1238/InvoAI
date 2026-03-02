import { Bot, User } from 'lucide-react';
import type { ChatMessage } from '@/types/invoice';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  return (
    <div className="p-3 space-y-4">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isLast = index === messages.length - 1;
        const showCursor = isStreaming && isLast && !isUser;

        return (
          <div key={msg.id} className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
            {/* Avatar */}
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              isUser ? 'bg-[var(--color-primary)]' : 'bg-gray-100'
            )}>
              {isUser ? (
                <User size={14} className="text-white" />
              ) : (
                <Bot size={14} className="text-[var(--color-primary)]" />
              )}
            </div>

            {/* Content */}
            <div className={cn(
              'max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed',
              isUser
                ? 'bg-[var(--color-primary)] text-white rounded-tr-sm'
                : 'bg-gray-100 text-[var(--color-text)] rounded-tl-sm'
            )}>
              <div className="whitespace-pre-wrap break-words">
                {msg.content}
                {showCursor && <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
