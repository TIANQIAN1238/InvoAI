import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/components/auth/LoginPage';
import { useInvoices } from '@/hooks/useInvoices';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import type { AppSettings } from '@/types/invoice';
import type { AttachedFile } from '@/components/chat/ChatInput';

const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-2.5-flash',
  visionModel: 'gemini-2.5-flash',
  workspaceDir: '/tmp/invoice-workspace',
};

interface OcrSummary {
  invoice_type: string;
  invoice_number: string;
  invoice_code: string;
  invoice_date: string | null;
  seller_name: string;
  buyer_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  remarks: string;
}

function formatOcrResult(fileName: string, ocr: OcrSummary | null): string {
  if (!ocr) {
    return `**Invoice recognition failed** (${fileName})\n\nThe file was saved in the invoice list, but OCR could not be completed.`;
  }

  return [
    `**Invoice Recognition Result** (${fileName})`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    ocr.invoice_type ? `| Invoice Type | ${ocr.invoice_type} |` : '',
    ocr.invoice_number ? `| Invoice Number | ${ocr.invoice_number} |` : '',
    ocr.invoice_code ? `| Invoice Code | ${ocr.invoice_code} |` : '',
    ocr.invoice_date ? `| Issue Date | ${ocr.invoice_date} |` : '',
    ocr.seller_name ? `| Seller | ${ocr.seller_name} |` : '',
    ocr.buyer_name ? `| Buyer | ${ocr.buyer_name} |` : '',
    `| Amount (excl. tax) | CNY ${ocr.amount.toFixed(2)} |`,
    `| Tax | CNY ${ocr.tax_amount.toFixed(2)} |`,
    `| Total | CNY ${ocr.total_amount.toFixed(2)} |`,
    ocr.remarks ? `| Remarks | ${ocr.remarks} |` : '',
  ].filter(Boolean).join('\n');
}

function App() {
  const { user, loading: authLoading, error: authError, login, register, logout, refreshUser, clearError } = useAuth();

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
    error: invoiceError,
    clearError: clearInvoiceError,
    stats,
    uploadProgress,
    uploadInvoice,
    importInvoice,
    search,
    loadInvoices,
    removeInvoice,
  } = useInvoices();

  const {
    messages,
    isStreaming,
    setIsStreaming,
    sendMessage,
    clearMessages,
    addMessage,
    updateLastAssistant,
  } = useChat({ onStreamDone: refreshUser });

  useEffect(() => {
    if (user) {
      void loadInvoices();
    }
  }, [user, loadInvoices]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('invoice-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    await uploadInvoice({ visionModel: settings.visionModel, workspaceDir: settings.workspaceDir });
    await refreshUser();
  }, [uploadInvoice, settings, refreshUser]);

  const handleSendFile = useCallback(async (attachment: AttachedFile, note?: string) => {
    if (isStreaming) return;

    addMessage('user', note?.trim() ? `[File] ${attachment.name}\n${note.trim()}` : `[File] ${attachment.name}`);
    addMessage('assistant', 'Uploading and recognizing invoice...');
    setIsStreaming(true);

    try {
      let base64: string;
      let filePath: string;
      let persistFileData = false;

      if (attachment.file) {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(attachment.file as File);
        });
        filePath = `web:${attachment.name}`;
        persistFileData = true;
      } else if (attachment.filePath) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('ensure_dir', { dirPath: settings.workspaceDir });
        const copiedPath = await invoke<string>('copy_file_to_workspace', {
          sourcePath: attachment.filePath,
          workspaceDir: settings.workspaceDir,
        });
        base64 = await invoke<string>('read_file_as_base64', { filePath: copiedPath });
        filePath = copiedPath;
      } else {
        throw new Error('Unable to read attachment');
      }

      const { ocr } = await importInvoice({
        filePath,
        fileName: attachment.name,
        base64,
        visionModel: settings.visionModel,
        mimeType: attachment.type,
        persistFileData,
      });

      const formatted = formatOcrResult(attachment.name, ocr);
      updateLastAssistant(formatted);
      await refreshUser();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Recognition failed';
      updateLastAssistant(`Processing failed: ${msg}`);
    } finally {
      setIsStreaming(false);
    }
  }, [
    isStreaming,
    addMessage,
    updateLastAssistant,
    setIsStreaming,
    settings.workspaceDir,
    settings.visionModel,
    importInvoice,
    refreshUser,
  ]);

  const handleSendMessage = useCallback((content: string, attachment?: AttachedFile) => {
    if (attachment) {
      void handleSendFile(attachment, content);
      return;
    }

    const invoiceDetails = invoices
      .filter(inv => inv.status === 'recognized')
      .map(inv => `- ${inv.seller_name} -> ${inv.buyer_name} | No:${inv.invoice_number} | Date:${(inv.invoice_date || '').slice(0, 10)} | Amount:CNY ${inv.total_amount} | Type:${inv.invoice_type}`)
      .join('\n');

    const systemContext = `You are an invoice management assistant. The user currently has ${stats.count} invoices with a total amount of CNY ${stats.totalAmount}.\n\nRecognized invoice list:\n${invoiceDetails || 'No recognized invoices yet'}\n\nCapabilities:\n1. Invoice analytics by company/date/amount\n2. Help locate specific invoices\n3. Provide tax-related guidance\n4. User may attach an invoice file in chat for OCR\n\nPlease respond in English. For analytics, use only the invoice list above.`;

    sendMessage(content, { model: settings.model }, systemContext);
  }, [handleSendFile, sendMessage, settings.model, stats, invoices]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} error={authError} onClearError={clearError} />;
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
      invoiceError={invoiceError}
      onClearInvoiceError={clearInvoiceError}
      uploadProgress={uploadProgress}
      chatMessages={messages}
      isStreaming={isStreaming}
      onSendMessage={handleSendMessage}
      onClearChat={clearMessages}
      settings={settings}
      onUpdateSettings={updateSettings}
      user={user}
      onLogout={logout}
    />
  );
}

export default App;
