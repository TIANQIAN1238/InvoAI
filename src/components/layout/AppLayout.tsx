import { useState, useCallback, useRef } from 'react';
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

function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const handle = e.currentTarget as HTMLElement;
    handle.setAttribute('data-dragging', 'true');

    const onMouseMove = (ev: MouseEvent) => {
      onDrag(ev.clientX - startX);
      // We don't update startX — parent tracks cumulative via ref
    };
    const onMouseUp = () => {
      handle.removeAttribute('data-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-[3px] shrink-0 cursor-col-resize bg-border hover:bg-primary data-[dragging]:bg-primary transition-colors"
    />
  );
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
  const [localFile, setLocalFile] = useState<{ path: string; name: string } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(380);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartSidebar = useRef(260);
  const dragStartChat = useRef(380);

  const handleOpenFile = useCallback((path: string, name: string) => {
    setLocalFile({ path, name });
    onSelectInvoice(null as unknown as Invoice);
  }, [onSelectInvoice]);

  const handleSelectInvoice = useCallback((invoice: Invoice) => {
    setLocalFile(null);
    onSelectInvoice(invoice);
  }, [onSelectInvoice]);

  const handleSidebarDragStart = useCallback(() => {
    dragStartSidebar.current = sidebarWidth;
  }, [sidebarWidth]);

  const handleSidebarDrag = useCallback((delta: number) => {
    // On first move of this drag, snapshot the current width
    if (dragStartSidebar.current === -1) return;
    const containerWidth = containerRef.current?.offsetWidth ?? 1200;
    const minW = 180;
    const maxW = containerWidth * 0.35;
    // delta is relative to mousedown position
    setSidebarWidth(Math.max(minW, Math.min(maxW, dragStartSidebar.current + delta)));
  }, []);

  const handleChatDrag = useCallback((delta: number) => {
    if (dragStartChat.current === -1) return;
    const containerWidth = containerRef.current?.offsetWidth ?? 1200;
    const minW = 200;
    const maxW = containerWidth * 0.45;
    // For chat, dragging left = bigger chat (negative delta = wider)
    setChatWidth(Math.max(minW, Math.min(maxW, dragStartChat.current - delta)));
  }, []);

  // Snapshot widths when drag starts
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartSidebar.current = sidebarWidth;
    const startX = e.clientX;
    const el = e.currentTarget as HTMLElement;
    el.setAttribute('data-dragging', 'true');

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const containerWidth = containerRef.current?.offsetWidth ?? 1200;
      setSidebarWidth(Math.max(180, Math.min(containerWidth * 0.35, dragStartSidebar.current + delta)));
    };
    const onUp = () => {
      el.removeAttribute('data-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  const handleChatMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartChat.current = chatWidth;
    const startX = e.clientX;
    const el = e.currentTarget as HTMLElement;
    el.setAttribute('data-dragging', 'true');

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const containerWidth = containerRef.current?.offsetWidth ?? 1200;
      setChatWidth(Math.max(200, Math.min(containerWidth * 0.45, dragStartChat.current - delta)));
    };
    const onUp = () => {
      el.removeAttribute('data-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [chatWidth]);

  return (
    <div className="flex flex-col h-screen w-screen">
      <div ref={containerRef} className="flex-1 min-h-0 flex">
        {/* Sidebar */}
        <div style={{ width: sidebarWidth }} className="shrink-0 h-full overflow-hidden">
          <Sidebar
            invoices={invoices}
            selectedInvoice={selectedInvoice}
            onSelectInvoice={handleSelectInvoice}
            onUpload={onUpload}
            onSearch={onSearch}
            onDelete={onDelete}
            loading={loading}
            onOpenFile={handleOpenFile}
          />
        </div>

        {/* Resize handle 1 */}
        <div
          onMouseDown={handleSidebarMouseDown}
          className="w-[3px] shrink-0 cursor-col-resize bg-border hover:bg-primary data-[dragging]:bg-primary transition-colors"
        />

        {/* Preview - takes remaining space */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <PreviewPanel invoice={selectedInvoice} localFile={localFile} />
        </div>

        {/* Resize handle 2 */}
        <div
          onMouseDown={handleChatMouseDown}
          className="w-[3px] shrink-0 cursor-col-resize bg-border hover:bg-primary data-[dragging]:bg-primary transition-colors"
        />

        {/* Chat */}
        <div style={{ width: chatWidth }} className="shrink-0 h-full overflow-hidden">
          <ChatPanel
            messages={chatMessages}
            isStreaming={isStreaming}
            onSendMessage={onSendMessage}
            onClearChat={onClearChat}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
          />
        </div>
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
