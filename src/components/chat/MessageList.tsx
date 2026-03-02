import { memo } from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/types/invoice';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

const MarkdownContent = memo(({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
      ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
      li: ({ children }) => <li>{children}</li>,
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      code: ({ children, className }) => {
        const isBlock = className?.includes('language-');
        if (isBlock) {
          return (
            <pre className="bg-foreground/10 rounded px-2 py-1.5 my-1.5 overflow-x-auto text-xs">
              <code>{children}</code>
            </pre>
          );
        }
        return <code className="bg-foreground/10 rounded px-1 py-0.5 text-xs">{children}</code>;
      },
      pre: ({ children }) => <>{children}</>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-foreground/20 pl-2 my-1.5 opacity-80">{children}</blockquote>
      ),
      h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
      h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
      table: ({ children }) => (
        <div className="overflow-x-auto my-1.5">
          <table className="text-xs border-collapse">{children}</table>
        </div>
      ),
      th: ({ children }) => <th className="border border-foreground/20 px-2 py-1 bg-foreground/5 font-semibold text-left">{children}</th>,
      td: ({ children }) => <td className="border border-foreground/20 px-2 py-1">{children}</td>,
      a: ({ children, href }) => (
        <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>
      ),
      hr: () => <hr className="border-foreground/20 my-2" />,
    }}
  >
    {content}
  </ReactMarkdown>
));
MarkdownContent.displayName = 'MarkdownContent';

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
              'max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed overflow-hidden',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            )}>
              {isUser ? (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              ) : (
                <div className="break-words">
                  <MarkdownContent content={msg.content} />
                  {showCursor && <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
