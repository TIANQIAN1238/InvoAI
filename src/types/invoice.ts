export interface Invoice {
  id: number;
  user_id?: number;
  invoice_number: string;
  invoice_code: string;
  invoice_date: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  seller_name: string;
  buyer_name: string;
  invoice_type: string;
  file_path: string;
  file_name: string;
  remarks: string | null;
  raw_ocr_result: string | null;
  status: 'pending' | 'recognized' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface InvoiceOcrResult {
  invoice_number: string;
  invoice_code: string;
  invoice_date: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  seller_name: string;
  buyer_name: string;
  invoice_type: string;
  remarks: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AppSettings {
  model: string;
  visionModel: string;
  workspaceDir: string;
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  balance: number;
  createdAt: string;
}
