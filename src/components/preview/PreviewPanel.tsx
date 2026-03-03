import { FileImage } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';
import { InvoiceDetail } from './InvoiceDetail';
import { isImageFile, isPdfFile } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface PreviewPanelProps {
  invoice: Invoice | null;
}

export function PreviewPanel({ invoice }: PreviewPanelProps) {
  if (!invoice) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
        <FileImage size={48} strokeWidth={1} />
        <p className="mt-3 text-sm">Select an invoice to preview</p>
        <p className="text-xs mt-1">Pick one from the list on the left</p>
      </div>
    );
  }

  const isImage = isImageFile(invoice.file_name);
  const isPdf = isPdfFile(invoice.file_name);

  return (
    <div className="h-full flex flex-col bg-muted">
      <div className="h-8 flex items-center px-4 border-b border-border bg-card shrink-0">
        <span className="text-xs text-muted-foreground truncate">{invoice.file_name}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {isImage && <ImageViewer filePath={invoice.file_path} invoiceId={invoice.id} />}
        {isPdf && <PdfViewer filePath={invoice.file_path} invoiceId={invoice.id} />}
        {!isImage && !isPdf && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Preview is not available for this file type
          </div>
        )}
      </div>

      {invoice.status === 'recognized' && (
        <>
          <Separator />
          <InvoiceDetail invoice={invoice} />
        </>
      )}
    </div>
  );
}
