import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerProps {
  filePath: string;
}

function toViewableUrl(filePath: string): string {
  if (filePath.startsWith('web:')) return '';
  try {
    // Tauri 环境：convertFileSrc 通过 __TAURI_INTERNALS__ 访问
    const tauri = (window as unknown as { __TAURI_INTERNALS__: { convertFileSrc: (path: string) => string } }).__TAURI_INTERNALS__;
    if (tauri?.convertFileSrc) return tauri.convertFileSrc(filePath);
  } catch { /* not in Tauri */ }
  return filePath;
}

export function ImageViewer({ filePath }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const assetUrl = toViewableUrl(filePath);

  if (!assetUrl) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Web 模式暂不支持图片预览
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
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

      {/* Image */}
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
