import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileImage, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isImageFile, isPdfFile } from '@/lib/utils';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  expanded?: boolean;
  loaded?: boolean;
}

interface FileTreeProps {
  onSelectFile: (path: string, name: string) => void;
  selectedPath: string | null;
}

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return null; // handled by Folder/FolderOpen
  if (isImageFile(name)) return <FileImage size={14} className="text-green-500 shrink-0" />;
  if (isPdfFile(name)) return <FileText size={14} className="text-red-500 shrink-0" />;
  return <File size={14} className="text-muted-foreground shrink-0" />;
}

function TreeItem({
  node,
  depth,
  onToggle,
  onSelect,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  onToggle: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
  selectedPath: string | null;
}) {
  const isSelected = node.path === selectedPath;
  const isInvoiceFile = isImageFile(node.name) || isPdfFile(node.name);

  return (
    <>
      <div
        onClick={() => {
          if (node.is_dir) {
            onToggle(node);
          } else if (isInvoiceFile) {
            onSelect(node);
          }
        }}
        className={cn(
          'flex items-center gap-1 py-0.5 px-2 text-xs cursor-pointer hover:bg-accent/50 transition-colors',
          isSelected && 'bg-accent',
          !node.is_dir && !isInvoiceFile && 'opacity-40 cursor-default'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.is_dir ? (
          <>
            {node.expanded ? (
              <ChevronDown size={12} className="text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight size={12} className="text-muted-foreground shrink-0" />
            )}
            {node.expanded ? (
              <FolderOpen size={14} className="text-amber-500 shrink-0" />
            ) : (
              <Folder size={14} className="text-amber-500 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {getFileIcon(node.name, false)}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.is_dir && node.expanded && node.children?.map(child => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </>
  );
}

export function FileTree({ onSelectFile, selectedPath }: FileTreeProps) {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [rootName, setRootName] = useState<string>('');
  const [tree, setTree] = useState<TreeNode[]>([]);

  const loadDir = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
    try {
      const entries = await invoke<FileEntry[]>('list_dir', { dirPath });
      return entries.map(e => ({
        ...e,
        expanded: false,
        loaded: false,
        children: e.is_dir ? [] : undefined,
      }));
    } catch (err) {
      console.error('Failed to list dir:', err);
      return [];
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({ directory: true });
      if (!selected) return;

      const dirPath = typeof selected === 'string' ? selected : (selected as { path: string }).path;
      const dirName = dirPath.split('/').pop() || dirPath.split('\\').pop() || dirPath;

      setRootPath(dirPath);
      setRootName(dirName);
      const children = await loadDir(dirPath);
      setTree(children);
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }, [loadDir]);

  const handleToggle = useCallback(async (node: TreeNode) => {
    if (!node.is_dir) return;

    if (!node.loaded) {
      const children = await loadDir(node.path);
      node.children = children;
      node.loaded = true;
    }

    node.expanded = !node.expanded;
    setTree(prev => [...prev]); // trigger re-render
  }, [loadDir]);

  const handleSelect = useCallback((node: TreeNode) => {
    onSelectFile(node.path, node.name);
  }, [onSelectFile]);

  if (!rootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
        <Folder size={32} strokeWidth={1} className="mb-2" />
        <p className="text-xs text-center mb-3">打开一个文件夹开始管理发票</p>
        <button
          onClick={handleOpenFolder}
          className="text-xs text-primary hover:underline"
        >
          选择文件夹...
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Folder header */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-accent/50"
        onClick={handleOpenFolder}
        title="点击切换文件夹"
      >
        <FolderOpen size={14} className="text-amber-500 shrink-0" />
        <span className="truncate">{rootName}</span>
      </div>

      {/* File tree */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            文件夹为空
          </div>
        ) : (
          tree.map(node => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              onToggle={handleToggle}
              onSelect={handleSelect}
              selectedPath={selectedPath}
            />
          ))
        )}
      </div>
    </div>
  );
}
