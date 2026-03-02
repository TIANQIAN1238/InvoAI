import { invoke } from '@tauri-apps/api/core';
import type { Channel } from '@tauri-apps/api/core';

export interface StreamChunk {
  content: string;
  done: boolean;
}

export async function chatStream(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  apiBase: string,
  model: string,
  onChunk: Channel<StreamChunk>,
): Promise<string> {
  return await invoke<string>('chat_stream', {
    messages,
    apiKey,
    apiBase,
    model,
    onChunk,
  });
}

export async function recognizeInvoice(
  imageBase64: string,
  apiKey: string,
  apiBase: string,
  model: string,
): Promise<string> {
  return await invoke<string>('recognize_invoice', {
    imageBase64,
    apiKey,
    apiBase,
    model,
  });
}

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
