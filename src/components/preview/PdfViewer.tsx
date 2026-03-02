import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  filePath: string;
}

function toViewableUrl(filePath: string): string {
  if (filePath.startsWith('web:')) return '';
  try {
    const tauri = (window as unknown as { __TAURI_INTERNALS__: { convertFileSrc: (path: string) => string } }).__TAURI_INTERNALS__;
    if (tauri?.convertFileSrc) return tauri.convertFileSrc(filePath);
  } catch { /* not in Tauri */ }
  return filePath;
}

export function PdfViewer({ filePath }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const fileUrl = toViewableUrl(filePath);

  if (!fileUrl) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Web 模式暂不支持 PDF 预览
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-gray-500">
          {pageNumber} / {numPages}
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

      {/* PDF */}
      <div className="flex-1 overflow-auto bg-gray-100 rounded-lg flex justify-center">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div className="p-8 text-sm text-gray-400">加载PDF中...</div>}
          error={<div className="p-8 text-sm text-red-400">PDF加载失败</div>}
        >
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
}
