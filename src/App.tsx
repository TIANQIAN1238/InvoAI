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
    return `**发票识别失败** (${fileName})\n\n文件已保存到发票列表，但 OCR 识别未成功。你可以在左侧选择该发票后重新处理。`;
  }

  return [
    `**发票识别结果** (${fileName})`,
    '',
    '| 字段 | 内容 |',
    '| --- | --- |',
    ocr.invoice_type ? `| 发票类型 | ${ocr.invoice_type} |` : '',
    ocr.invoice_number ? `| 发票号码 | ${ocr.invoice_number} |` : '',
    ocr.invoice_code ? `| 发票代码 | ${ocr.invoice_code} |` : '',
    ocr.invoice_date ? `| 开票日期 | ${ocr.invoice_date} |` : '',
    ocr.seller_name ? `| 销售方 | ${ocr.seller_name} |` : '',
    ocr.buyer_name ? `| 购买方 | ${ocr.buyer_name} |` : '',
    `| 不含税金额 | ¥${ocr.amount.toFixed(2)} |`,
    `| 税额 | ¥${ocr.tax_amount.toFixed(2)} |`,
    `| 价税合计 | ¥${ocr.total_amount.toFixed(2)} |`,
    ocr.remarks ? `| 备注 | ${ocr.remarks} |` : '',
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

    addMessage('user', note?.trim() ? `[发送文件] ${attachment.name}\n${note.trim()}` : `[发送文件] ${attachment.name}`);
    addMessage('assistant', '正在上传并识别发票内容...');
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
          reader.onerror = () => reject(new Error('文件读取失败'));
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
        throw new Error('无法读取附件内容');
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
      const msg = err instanceof Error ? err.message : '识别失败';
      updateLastAssistant(`处理失败: ${msg}`);
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
      .map(inv => `- ${inv.seller_name} → ${inv.buyer_name} | 发票号:${inv.invoice_number} | 日期:${(inv.invoice_date || '').slice(0, 10)} | 金额:¥${inv.total_amount} | 类型:${inv.invoice_type}`)
      .join('\n');

    const systemContext = `你是一个发票管理助手。用户当前有 ${stats.count} 张发票，总金额 ¥${stats.totalAmount} 元。

已识别发票列表：
${invoiceDetails || '暂无已识别发票'}

你的能力：
1. 回答发票统计分析问题（按公司、日期、金额等维度）
2. 帮助查找特定发票
3. 提供税务相关建议
4. 用户可以拖拽/附加发票文件到聊天框进行OCR识别

请用中文回答。对于统计类问题，请基于上面的发票列表数据进行分析。`;

    sendMessage(content, { model: settings.model }, systemContext);
  }, [handleSendFile, sendMessage, settings.model, stats, invoices]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm text-gray-500">加载中...</span>
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
