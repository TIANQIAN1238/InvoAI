import { FileImage } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';
import { InvoiceDetail } from './InvoiceDetail';
import { isImageFile, isPdfFile } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface PreviewPanelProps {
  invoice: Invoice | null;
  localFile?: { path: string; name: string } | null;
}

export function PreviewPanel({ invoice, localFile }: PreviewPanelProps) {
  // 优先展示本地文件（从文件树选中的）
  if (localFile) {
    const isImage = isImageFile(localFile.name);
    const isPdf = isPdfFile(localFile.name);

    return (
      <div className="h-full flex flex-col bg-muted">
        {/* File name header */}
        <div className="h-8 flex items-center px-4 border-b border-border bg-card shrink-0">
          <span className="text-xs text-muted-foreground truncate">{localFile.name}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4">
          {isImage && <ImageViewer filePath={localFile.path} />}
          {isPdf && <PdfViewer filePath={localFile.path} />}
          {!isImage && !isPdf && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              不支持预览该文件格式
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
        <FileImage size={48} strokeWidth={1} />
        <p className="mt-3 text-sm">选择文件查看预览</p>
        <p className="text-xs mt-1">在左侧文件树或发票列表中选择</p>
      </div>
    );
  }

  const isImage = isImageFile(invoice.file_name);
  const isPdf = isPdfFile(invoice.file_name);

  return (
    <div className="h-full flex flex-col bg-muted">
      {/* File name header */}
      <div className="h-8 flex items-center px-4 border-b border-border bg-card shrink-0">
        <span className="text-xs text-muted-foreground truncate">{invoice.file_name}</span>
      </div>
      {/* File preview */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {isImage && <ImageViewer filePath={invoice.file_path} />}
        {isPdf && <PdfViewer filePath={invoice.file_path} />}
        {!isImage && !isPdf && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            不支持预览该文件格式
          </div>
        )}
      </div>

      {/* Invoice detail info */}
      {invoice.status === 'recognized' && (
        <>
          <Separator />
          <InvoiceDetail invoice={invoice} />
        </>
      )}
    </div>
  );
}
