import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { Invoice, AppSettings, ChatMessage, User } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { LogOut, Wallet } from 'lucide-react';

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
          <Panel defaultSize="22%" minSize="16%" maxSize="35%">
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

          <Panel defaultSize="48%" minSize="30%">
            <PreviewPanel invoice={selectedInvoice} />
          </Panel>

          <PanelResizeHandle />

          <Panel defaultSize="30%" minSize="20%" collapsible>
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
      <div className="h-7 bg-[#f0f0f0] border-t border-[var(--color-border)] flex items-center justify-between px-4 text-xs text-[var(--color-text-secondary)] shrink-0">
        <div className="flex items-center">
          <span>共 {stats.count} 张发票</span>
          <span className="mx-3">|</span>
          <span>总金额: {formatCurrency(stats.totalAmount)}</span>
          {loading && (
            <>
              <span className="mx-3">|</span>
              <span className="text-[var(--color-primary)]">加载中...</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Wallet size={12} />
            ${Number(user.balance).toFixed(2)}
          </span>
          <span>{user.email}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-gray-400 hover:text-[var(--color-danger)] transition"
            title="退出登录"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
