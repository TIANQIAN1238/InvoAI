import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/components/auth/LoginPage';
import { useInvoices } from '@/hooks/useInvoices';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import type { AppSettings } from '@/types/invoice';

const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-3-flash-preview',
  visionModel: 'gemini-3-pro-preview',
  workspaceDir: '/tmp/invoice-workspace',
};

function App() {
  const { user, loading: authLoading, error: authError, login, register, logout, refreshUser } = useAuth();

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
    uploadInvoice({ visionModel: settings.visionModel });
  }, [uploadInvoice, settings]);

  const handleSendMessage = useCallback((content: string) => {
    const systemContext = `你是一个发票管理助手。用户当前有 ${stats.count} 张发票，总金额 ${stats.totalAmount} 元。请用中文回答。如果用户询问发票统计相关问题，请基于已知信息回答。`;
    sendMessage(content, { model: settings.model }, systemContext);
  }, [sendMessage, settings, stats]);

  // 加载中
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  // 未登录
  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} error={authError} />;
  }

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
      user={user}
      onLogout={logout}
      onRefreshUser={refreshUser}
    />
  );
}

export default App;
