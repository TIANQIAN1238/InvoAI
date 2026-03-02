import { useState, useCallback, useEffect } from 'react';
import type { Invoice } from '@/types/invoice';
import * as db from '@/lib/db';
import { recognizeInvoice } from '@/lib/ai';
import type { InvoiceOcrResult } from '@/types/invoice';
import { hasToken } from '@/lib/api';

// 检测是否在 Tauri 环境
function isTauri(): boolean {
  return !!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__;
}

// Web 方式：用 <input type="file"> 选择文件
function pickFilesWeb(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.jpg,.jpeg,.png,.pdf,.bmp,.webp';
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      resolve(files);
    };
    // 用户取消时也 resolve 空数组
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

// Web 方式：读取 File 为 base64
function readFileAsBase64Web(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉 "data:xxx;base64," 前缀
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ count: 0, totalAmount: 0 });
  const [searchParams, setSearchParams] = useState<{
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const loadInvoices = useCallback(async (params?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    if (!hasToken()) return;
    try {
      setLoading(true);
      const p = params ?? searchParams;
      const [rows, s] = await Promise.all([
        db.getInvoices(p),
        db.getStats(p),
      ]);
      setInvoices(rows);
      setStats(s);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const uploadInvoice = useCallback(async (settings: {
    visionModel: string;
  }) => {
    try {
      if (isTauri()) {
        // Tauri 环境：用原生对话框
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { invoke } = await import('@tauri-apps/api/core');

        const files = await open({
          multiple: true,
          filters: [{
            name: 'Invoice Files',
            extensions: ['jpg', 'jpeg', 'png', 'pdf', 'bmp', 'webp'],
          }],
        });

        if (!files || (Array.isArray(files) && files.length === 0)) return;

        const filePaths: string[] = Array.isArray(files)
          ? files.map(f => typeof f === 'string' ? f : (f as { path: string }).path)
          : [typeof files === 'string' ? files : (files as { path: string }).path];

        const workspaceDir = '/tmp/invoice-workspace';
        await invoke('ensure_dir', { dirPath: workspaceDir });

        for (const path of filePaths) {
          const fileName = path.split('/').pop() || path.split('\\').pop() || 'unknown';
          const destPath = await invoke<string>('copy_file_to_workspace', { sourcePath: path, workspaceDir });

          const id = await db.insertInvoice({ file_path: destPath, file_name: fileName });

          try {
            const base64 = await invoke<string>('read_file_as_base64', { filePath: destPath });
            const ocrResultStr = await recognizeInvoice(base64, settings.visionModel);
            let cleanJson = ocrResultStr.trim();
            if (cleanJson.startsWith('```')) {
              cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }
            const ocrResult: InvoiceOcrResult = JSON.parse(cleanJson);

            await db.updateInvoiceOcr(id, {
              invoice_number: ocrResult.invoice_number || '',
              invoice_code: ocrResult.invoice_code || '',
              invoice_date: ocrResult.invoice_date || null,
              amount: parseFloat(ocrResult.amount) || 0,
              tax_amount: parseFloat(ocrResult.tax_amount) || 0,
              total_amount: parseFloat(ocrResult.total_amount) || 0,
              seller_name: ocrResult.seller_name || '',
              buyer_name: ocrResult.buyer_name || '',
              invoice_type: ocrResult.invoice_type || '',
              remarks: ocrResult.remarks || '',
              raw_ocr_result: ocrResultStr,
              status: 'recognized',
            });
          } catch (ocrErr) {
            console.error('OCR failed:', ocrErr);
            await db.updateInvoiceOcr(id, { status: 'failed' });
          }
        }
      } else {
        // Web 环境：用 HTML input[type=file]
        const files = await pickFilesWeb();
        if (files.length === 0) return;

        for (const file of files) {
          const fileName = file.name;

          const id = await db.insertInvoice({ file_path: `web:${fileName}`, file_name: fileName });

          try {
            const base64 = await readFileAsBase64Web(file);
            const ocrResultStr = await recognizeInvoice(base64, settings.visionModel);
            let cleanJson = ocrResultStr.trim();
            if (cleanJson.startsWith('```')) {
              cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }
            const ocrResult: InvoiceOcrResult = JSON.parse(cleanJson);

            await db.updateInvoiceOcr(id, {
              invoice_number: ocrResult.invoice_number || '',
              invoice_code: ocrResult.invoice_code || '',
              invoice_date: ocrResult.invoice_date || null,
              amount: parseFloat(ocrResult.amount) || 0,
              tax_amount: parseFloat(ocrResult.tax_amount) || 0,
              total_amount: parseFloat(ocrResult.total_amount) || 0,
              seller_name: ocrResult.seller_name || '',
              buyer_name: ocrResult.buyer_name || '',
              invoice_type: ocrResult.invoice_type || '',
              remarks: ocrResult.remarks || '',
              raw_ocr_result: ocrResultStr,
              status: 'recognized',
            });
          } catch (ocrErr) {
            console.error('OCR failed:', ocrErr);
            await db.updateInvoiceOcr(id, { status: 'failed' });
          }
        }
      }

      await loadInvoices();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, [loadInvoices]);

  const search = useCallback(async (params: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setSearchParams(params);
    await loadInvoices(params);
  }, [loadInvoices]);

  const removeInvoice = useCallback(async (id: number) => {
    await db.deleteInvoice(id);
    if (selectedInvoice?.id === id) setSelectedInvoice(null);
    await loadInvoices();
  }, [selectedInvoice, loadInvoices]);

  useEffect(() => {
    loadInvoices();
  }, []);

  return {
    invoices,
    selectedInvoice,
    setSelectedInvoice,
    loading,
    stats,
    uploadInvoice,
    search,
    loadInvoices,
    removeInvoice,
  };
}
