import { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';
import { getInvoiceFile } from '@/lib/db';

interface ImageViewerProps {
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
    // not in Tauri
  }

  return filePath;
}

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

export function ImageViewer({ filePath, invoiceId }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [assetUrl, setAssetUrl] = useState('');
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
          setAssetUrl(directUrl);
          setLoading(false);
        }
        return;
      }

      try {
        const remoteFile = await getInvoiceFile(invoiceId);
        if (!cancelled) {
          setAssetUrl(toDataUrl(remoteFile.mimeType, remoteFile.base64));
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '图片加载失败';
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void resolveAsset();

    return () => {
      cancelled = true;
    };
  }, [filePath, invoiceId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        加载图片中...
      </div>
    );
  }

  if (!assetUrl || loadError) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {loadError || '图片预览不可用'}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-gray-500 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(3, s + 0.25))}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
          title="放大"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setRotation(r => (r + 90) % 360)}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
          title="旋转"
        >
          <RotateCw size={16} />
        </button>
        <button
          onClick={() => { setScale(1); setRotation(0); }}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-500"
        >
          重置
        </button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 rounded-lg">
        <img
          src={assetUrl}
          alt="发票预览"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
