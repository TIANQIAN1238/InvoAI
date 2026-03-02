import { FileImage } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';
import { InvoiceDetail } from './InvoiceDetail';
import { isImageFile, isPdfFile } from '@/lib/utils';

interface PreviewPanelProps {
  invoice: Invoice | null;
}

export function PreviewPanel({ invoice }: PreviewPanelProps) {
  if (!invoice) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--color-bg)] text-gray-400">
        <FileImage size={48} strokeWidth={1} />
        <p className="mt-3 text-sm">选择一张发票查看详情</p>
        <p className="text-xs mt-1">在左侧列表中点击发票</p>
      </div>
    );
  }

  const isImage = isImageFile(invoice.file_name);
  const isPdf = isPdfFile(invoice.file_name);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* File preview */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {isImage && <ImageViewer filePath={invoice.file_path} />}
        {isPdf && <PdfViewer filePath={invoice.file_path} />}
        {!isImage && !isPdf && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            不支持预览该文件格式
          </div>
        )}
      </div>

      {/* Invoice detail info */}
      {invoice.status === 'recognized' && (
        <div className="border-t border-[var(--color-border)]">
          <InvoiceDetail invoice={invoice} />
        </div>
      )}
    </div>
  );
}
