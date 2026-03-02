import { useState, useCallback, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { Invoice } from '@/types/invoice';
import * as db from '@/lib/db';
import { copyFileToWorkspace, readFileAsBase64, recognizeInvoice, ensureDir } from '@/lib/ai';
import type { InvoiceOcrResult } from '@/types/invoice';

const WORKSPACE_DIR = '/tmp/invoice-workspace';

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
      const files = await open({
        multiple: true,
        filters: [{
          name: 'Invoice Files',
          extensions: ['jpg', 'jpeg', 'png', 'pdf', 'bmp', 'webp'],
        }],
      });

      if (!files || (Array.isArray(files) && files.length === 0)) return;

      const filePaths: string[] = Array.isArray(files) ? files.map(f => typeof f === 'string' ? f : (f as { path: string }).path) : [typeof files === 'string' ? files : (files as { path: string }).path];

      await ensureDir(WORKSPACE_DIR);

      for (const path of filePaths) {
        const fileName = path.split('/').pop() || path.split('\\').pop() || 'unknown';

        // Copy to workspace
        const destPath = await copyFileToWorkspace(path, WORKSPACE_DIR);

        // Insert into DB via API
        const id = await db.insertInvoice({
          file_path: destPath,
          file_name: fileName,
        });

        // Auto-recognize with AI (through backend proxy)
        try {
          const base64 = await readFileAsBase64(destPath);
          const ocrResultStr = await recognizeInvoice(base64, settings.visionModel);

          // Parse OCR result - strip markdown code blocks if present
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
