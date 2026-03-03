import { useState, useCallback, useEffect, useRef } from 'react';
import type { Invoice, InvoiceOcrResult } from '@/types/invoice';
import * as db from '@/lib/db';
import { recognizeInvoice } from '@/lib/ai';
import { hasToken } from '@/lib/api';

interface SearchParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UploadSettings {
  visionModel: string;
  workspaceDir: string;
}

interface ImportInvoiceInput {
  filePath: string;
  fileName: string;
  base64: string;
  visionModel: string;
  mimeType?: string;
  persistFileData?: boolean;
}

interface OcrNormalizedResult {
  invoice_number: string;
  invoice_code: string;
  invoice_date: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  seller_name: string;
  buyer_name: string;
  invoice_type: string;
  remarks: string;
  raw_ocr_result: string;
}

function isTauri(): boolean {
  return !!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__;
}

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
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

function readFileAsBase64Web(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function inferMimeTypeFromName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'bmp':
      return 'image/bmp';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function parseOcrJson(content: string): InvoiceOcrResult {
  let cleanJson = content.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleanJson) as InvoiceOcrResult;
}

function normalizeAmount(value: string | number | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = value.replace(/[^\d.-]/g, '');
  const matched = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!matched) return 0;

  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) return null;

  const parts = value.match(/\d+/g);
  if (!parts || parts.length < 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12) return null;

  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeOcrResult(raw: InvoiceOcrResult, rawOcrText: string): OcrNormalizedResult {
  return {
    invoice_number: normalizeText(raw.invoice_number),
    invoice_code: normalizeText(raw.invoice_code),
    invoice_date: normalizeDate(raw.invoice_date),
    amount: normalizeAmount(raw.amount),
    tax_amount: normalizeAmount(raw.tax_amount),
    total_amount: normalizeAmount(raw.total_amount),
    seller_name: normalizeText(raw.seller_name),
    buyer_name: normalizeText(raw.buyer_name),
    invoice_type: normalizeText(raw.invoice_type),
    remarks: normalizeText(raw.remarks),
    raw_ocr_result: rawOcrText,
  };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ count: 0, totalAmount: 0 });
  const [uploadProgress, setUploadProgress] = useState<{ processed: number; total: number } | null>(null);
  const searchParamsRef = useRef<SearchParams>({});

  const loadInvoices = useCallback(async (params?: SearchParams) => {
    if (!hasToken()) return;

    try {
      setLoading(true);
      const nextParams = params ?? searchParamsRef.current;
      const [rows, nextStats] = await Promise.all([
        db.getInvoices(nextParams),
        db.getStats(nextParams),
      ]);

      setInvoices(rows);
      setStats(nextStats);
      setSelectedInvoice((previous) => {
        if (rows.length === 0) return null;
        if (!previous) return rows[0];
        return rows.find((item) => item.id === previous.id) ?? rows[0];
      });
    } catch (err) {
      console.error('Failed to load invoices:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load invoices';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const processOcr = useCallback(async (
    id: number,
    base64: string,
    visionModel: string,
  ): Promise<OcrNormalizedResult | null> => {
    try {
      const ocrResultStr = await recognizeInvoice(base64, visionModel);
      const parsed = parseOcrJson(ocrResultStr);
      const normalized = normalizeOcrResult(parsed, ocrResultStr);

      await db.updateInvoiceOcr(id, {
        invoice_number: normalized.invoice_number,
        invoice_code: normalized.invoice_code,
        invoice_date: normalized.invoice_date,
        amount: normalized.amount,
        tax_amount: normalized.tax_amount,
        total_amount: normalized.total_amount,
        seller_name: normalized.seller_name,
        buyer_name: normalized.buyer_name,
        invoice_type: normalized.invoice_type,
        remarks: normalized.remarks,
        raw_ocr_result: normalized.raw_ocr_result,
        status: 'recognized',
      });

      return normalized;
    } catch (ocrErr) {
      console.error('OCR failed:', ocrErr);
      try {
        await db.updateInvoiceOcr(id, { status: 'failed' });
      } catch (updateErr) {
        console.error('Failed to update invoice status:', updateErr);
      }
      return null;
    }
  }, []);

  const importInvoice = useCallback(async ({
    filePath,
    fileName,
    base64,
    visionModel,
    mimeType,
    persistFileData,
  }: ImportInvoiceInput): Promise<{ id: number; ocr: OcrNormalizedResult | null }> => {
    const id = await db.insertInvoice({
      file_path: filePath,
      file_name: fileName,
      ...(persistFileData ? {
        file_data_base64: base64,
        file_mime: mimeType || inferMimeTypeFromName(fileName),
      } : {}),
    });

    await loadInvoices();
    const ocr = await processOcr(id, base64, visionModel);
    await loadInvoices();

    return { id, ocr };
  }, [loadInvoices, processOcr]);

  const uploadInvoice = useCallback(async (settings: UploadSettings) => {
    setError(null);

    try {
      if (isTauri()) {
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

        const filePaths = Array.isArray(files)
          ? files.map(item => typeof item === 'string' ? item : (item as { path: string }).path)
          : [typeof files === 'string' ? files : (files as { path: string }).path];

        await invoke('ensure_dir', { dirPath: settings.workspaceDir });

        setUploadProgress({ processed: 0, total: filePaths.length });
        for (let i = 0; i < filePaths.length; i++) {
          const path = filePaths[i];
          const fileName = path.split('/').pop() || path.split('\\').pop() || 'unknown';
          const copiedPath = await invoke<string>('copy_file_to_workspace', {
            sourcePath: path,
            workspaceDir: settings.workspaceDir,
          });
          const base64 = await invoke<string>('read_file_as_base64', { filePath: copiedPath });

          await importInvoice({
            filePath: copiedPath,
            fileName,
            base64,
            visionModel: settings.visionModel,
          });

          setUploadProgress({ processed: i + 1, total: filePaths.length });
        }
      } else {
        const files = await pickFilesWeb();
        if (files.length === 0) return;

        setUploadProgress({ processed: 0, total: files.length });
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const base64 = await readFileAsBase64Web(file);

          await importInvoice({
            filePath: `web:${file.name}`,
            fileName: file.name,
            base64,
            mimeType: file.type || inferMimeTypeFromName(file.name),
            visionModel: settings.visionModel,
            persistFileData: true,
          });

          setUploadProgress({ processed: i + 1, total: files.length });
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploadProgress(null);
    }
  }, [importInvoice]);

  const search = useCallback(async (params: SearchParams) => {
    searchParamsRef.current = params;
    await loadInvoices(params);
  }, [loadInvoices]);

  const removeInvoice = useCallback(async (id: number) => {
    try {
      setError(null);
      await db.deleteInvoice(id);
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
      await loadInvoices();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
    }
  }, [selectedInvoice, loadInvoices]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  return {
    invoices,
    selectedInvoice,
    setSelectedInvoice,
    loading,
    error,
    clearError,
    stats,
    uploadProgress,
    uploadInvoice,
    importInvoice,
    search,
    loadInvoices,
    removeInvoice,
  };
}
