import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { getInvoiceFile } from '@/lib/db';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  filePath: string;
  invoiceId: number;
}

function toViewableUrl(filePath: string): string {
  if (filePath.startsWith('data:')) return filePath;
  if (filePath.startsWith('web:')) return '';

  try {
    const tauri = (window as unknown as { __TAURI_INTERNALS__: { convertFileSrc: (path: string) => string } }).__TAURI_INTERNALS__;
    if (tauri?.convertFileSrc) return tauri.convertFileSrc(filePath);
  } catch {
    // Not in Tauri.
  }

  return filePath;
}

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

export function PdfViewer({ filePath, invoiceId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveAsset() {
      setLoading(true);
      setLoadError(null);

      const directUrl = toViewableUrl(filePath);
      if (directUrl) {
        if (!cancelled) {
          setFileUrl(directUrl);
          setLoading(false);
        }
        return;
      }

      try {
        const remoteFile = await getInvoiceFile(invoiceId);
        if (!cancelled) {
          setFileUrl(toDataUrl(remoteFile.mimeType, remoteFile.base64));
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load PDF';
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setPageNumber(1);
    setNumPages(0);
    void resolveAsset();

    return () => {
      cancelled = true;
    };
  }, [filePath, invoiceId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading PDF...
      </div>
    );
  }

  if (!fileUrl || loadError) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {loadError || 'PDF preview is unavailable'}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-gray-500">
          {pageNumber} / {numPages || '-'}
        </span>
        <button
          onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-gray-500 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(3, s + 0.25))}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 rounded-lg flex justify-center">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
          loading={<div className="p-8 text-sm text-gray-400">Loading PDF...</div>}
          error={<div className="p-8 text-sm text-red-400">Failed to load PDF</div>}
        >
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
}
