import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 附件信息：可以是 Web File 或 Tauri 文件路径
export interface AttachedFile {
  name: string;
  size?: number;
  type: string;
  // Web 环境用 File 对象
  file?: File;
  // Tauri 环境用文件路径
  filePath?: string;
}

interface ChatInputProps {
  onSend: (content: string, attachment?: AttachedFile) => void;
  disabled: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type: string) {
  if (type === 'application/pdf' || type === 'pdf') return <FileText size={14} className="text-red-500" />;
  if (type.startsWith('image/') || type === 'image') return <ImageIcon size={14} className="text-blue-500" />;
  return <FileText size={14} className="text-muted-foreground" />;
}

function isTauri(): boolean {
  return !!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__;
}

function guessFileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'application/pdf';
  if (['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif'].includes(ext)) return 'image/' + ext;
  return 'application/octet-stream';
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tauri 拖拽监听
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            setIsDragOver(true);
          } else if (event.payload.type === 'drop') {
            setIsDragOver(false);
            const paths = event.payload.paths;
            if (paths.length > 0) {
              const path = paths[0];
              const name = path.split('/').pop() || path.split('\\').pop() || 'file';
              const type = guessFileType(name);
              // 只接受 PDF 和图片
              if (type === 'application/pdf' || type.startsWith('image/')) {
                setAttachedFile({ name, type, filePath: path });
              }
            }
          } else if (event.payload.type === 'leave') {
            setIsDragOver(false);
          }
        });
      } catch (err) {
        console.error('Failed to setup Tauri drag drop:', err);
      }
    })();

    return () => {
      unlisten?.();
    };
  }, []);

  const handleSend = () => {
    if (disabled) return;

    if (attachedFile) {
      onSend(text || '', attachedFile);
      setAttachedFile(null);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    if (!text.trim()) return;
    onSend(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Web HTML5 拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isTauri()) return; // Tauri 用自己的事件
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (isTauri()) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isTauri()) return; // Tauri 用自己的事件
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    );

    if (validFile) {
      setAttachedFile({
        name: validFile.name,
        size: validFile.size,
        type: validFile.type,
        file: validFile,
      });
    }
  }, []);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => setAttachedFile(null);

  return (
    <div
      className="p-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attached file preview (mention style) */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
          {getFileIcon(attachedFile.type)}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{attachedFile.name}</div>
            {attachedFile.size != null && (
              <div className="text-[10px] text-muted-foreground">{formatFileSize(attachedFile.size)}</div>
            )}
          </div>
          <span className="text-[10px] text-primary font-medium shrink-0">@发票</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={removeFile}
            className="shrink-0"
          >
            <X size={12} />
          </Button>
        </div>
      )}

      {/* Drop overlay hint */}
      {isDragOver && (
        <div className="mb-2 border-2 border-dashed border-primary rounded-md p-3 text-center text-xs text-primary bg-primary/5">
          松开以添加文件（PDF/图片）
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFileSelect}
          disabled={disabled}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="添加文件"
        >
          <Paperclip size={16} />
        </Button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={
            disabled
              ? 'AI 正在处理...'
              : attachedFile
                ? '可输入补充说明，按 Enter 发送识别'
                : '输入消息或拖拽文件... (Enter 发送)'
          }
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachedFile)}
          size="icon"
        >
          <Send size={16} />
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.bmp,.webp"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
