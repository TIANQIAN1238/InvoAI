import { invoke } from '@tauri-apps/api/core';
import { apiRecognizeInvoice } from './api';

// Tauri local file operations.
export async function readFileAsBase64(filePath: string): Promise<string> {
  return await invoke<string>('read_file_as_base64', { filePath });
}

export async function copyFileToWorkspace(
  sourcePath: string,
  workspaceDir: string,
): Promise<string> {
  return await invoke<string>('copy_file_to_workspace', {
    sourcePath,
    workspaceDir,
  });
}

export async function ensureDir(dirPath: string): Promise<void> {
  await invoke('ensure_dir', { dirPath });
}

// Invoice OCR through backend proxy.
export async function recognizeInvoice(
  imageBase64: string,
  model: string,
): Promise<string> {
  const result = await apiRecognizeInvoice(imageBase64, model);
  return result.content;
}
