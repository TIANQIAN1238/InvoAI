import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { Invoice, AppSettings, ChatMessage, User } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { LogOut, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AppLayoutProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onUpload: () => void;
  onSearch: (params: { search?: string; dateFrom?: string; dateTo?: string }) => void;
  onDelete: (id: number) => void;
  stats: { count: number; totalAmount: number };
  loading: boolean;
  chatMessages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  user: User;
  onLogout: () => void;
  onRefreshUser: () => void;
}

export function AppLayout({
  invoices,
  selectedInvoice,
  onSelectInvoice,
  onUpload,
  onSearch,
  onDelete,
  stats,
  loading,
  chatMessages,
  isStreaming,
  onSendMessage,
  onClearChat,
  settings,
  onUpdateSettings,
  user,
  onLogout,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex-1 min-h-0">
        <PanelGroup orientation="horizontal">
          <Panel defaultSize={22} minSize={16} maxSize={35}>
            <Sidebar
              invoices={invoices}
              selectedInvoice={selectedInvoice}
              onSelectInvoice={onSelectInvoice}
              onUpload={onUpload}
              onSearch={onSearch}
              onDelete={onDelete}
              loading={loading}
            />
          </Panel>

          <PanelResizeHandle />

          <Panel defaultSize={48} minSize={30}>
            <PreviewPanel invoice={selectedInvoice} />
          </Panel>

          <PanelResizeHandle />

          <Panel defaultSize={30} minSize={20} collapsible>
            <ChatPanel
              messages={chatMessages}
              isStreaming={isStreaming}
              onSendMessage={onSendMessage}
              onClearChat={onClearChat}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Status bar */}
      <div className="h-7 bg-muted border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-5 text-[10px] font-normal">
            {stats.count} 张发票
          </Badge>
          <Separator orientation="vertical" className="h-3.5" />
          <span>{formatCurrency(stats.totalAmount)}</span>
          {loading && (
            <>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="text-primary animate-pulse">加载中...</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-5 text-[10px] font-normal gap-1">
            <Wallet size={10} />
            ${Number(user.balance).toFixed(2)}
          </Badge>
          <Separator orientation="vertical" className="h-3.5" />
          <span>{user.email}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onLogout}
            className="text-muted-foreground hover:text-destructive"
            title="退出登录"
          >
            <LogOut size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
