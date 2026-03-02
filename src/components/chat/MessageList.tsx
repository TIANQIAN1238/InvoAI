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
              isUser ? 'bg-primary' : 'bg-muted'
            )}>
              {isUser ? (
                <User size={14} className="text-primary-foreground" />
              ) : (
                <Bot size={14} className="text-primary" />
              )}
            </div>

            {/* Content */}
            <div className={cn(
              'max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
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
