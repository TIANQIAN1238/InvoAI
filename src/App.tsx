import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useInvoices } from '@/hooks/useInvoices';
import { useChat } from '@/hooks/useChat';
import type { AppSettings } from '@/types/invoice';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  apiBase: 'https://api.openai-next.com',
  model: 'gpt-4o-mini',
  visionModel: 'gpt-4o',
  mysqlUrl: 'mysql://root:root@localhost/invoice_db',
  workspaceDir: '/tmp/invoice-workspace',
};

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('invoice-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const {
    invoices,
    selectedInvoice,
    setSelectedInvoice,
    loading,
    stats,
    uploadInvoice,
    search,
    removeInvoice,
  } = useInvoices();

  const {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  } = useChat();

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('invoice-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleUpload = useCallback(() => {
    uploadInvoice({
      apiKey: settings.apiKey,
      apiBase: settings.apiBase,
      visionModel: settings.visionModel,
    });
  }, [uploadInvoice, settings]);

  const handleSendMessage = useCallback((content: string) => {
    const systemContext = `你是一个发票管理助手。用户当前有 ${stats.count} 张发票，总金额 ${stats.totalAmount} 元。请用中文回答。如果用户询问发票统计相关问题，请基于已知信息回答。`;
    sendMessage(content, {
      apiKey: settings.apiKey,
      apiBase: settings.apiBase,
      model: settings.model,
    }, systemContext);
  }, [sendMessage, settings, stats]);

  return (
    <AppLayout
      invoices={invoices}
      selectedInvoice={selectedInvoice}
      onSelectInvoice={setSelectedInvoice}
      onUpload={handleUpload}
      onSearch={search}
      onDelete={removeInvoice}
      stats={stats}
      loading={loading}
      chatMessages={messages}
      isStreaming={isStreaming}
      onSendMessage={handleSendMessage}
      onClearChat={clearMessages}
      settings={settings}
      onUpdateSettings={updateSettings}
    />
  );
}

export default App;
