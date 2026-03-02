import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerProps {
  filePath: string;
}

export function ImageViewer({ filePath }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const assetUrl = convertFileSrc(filePath);

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
