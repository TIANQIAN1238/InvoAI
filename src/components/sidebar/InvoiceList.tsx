import { FileText, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { formatCurrency, cn } from '@/lib/utils';

interface InvoiceListProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onDelete: (id: number) => void;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', label: '待识别' },
  recognized: { icon: CheckCircle, color: 'text-green-500', label: '已识别' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: '识别失败' },
} as const;

export function InvoiceList({ invoices, selectedInvoice, onSelectInvoice, onDelete }: InvoiceListProps) {
  return (
    <div className="divide-y divide-gray-50">
      {invoices.map(invoice => {
        const isSelected = selectedInvoice?.id === invoice.id;
        const status = statusConfig[invoice.status] || statusConfig.pending;
        const StatusIcon = status.icon;

        return (
          <div
            key={invoice.id}
            onClick={() => onSelectInvoice(invoice)}
            className={cn(
              'px-3 py-2.5 cursor-pointer transition-colors group',
              isSelected ? 'bg-[var(--color-accent)] border-l-2 border-l-[var(--color-primary)]' : 'hover:bg-gray-50'
            )}
          >
            <div className="flex items-start gap-2">
              <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {invoice.seller_name || invoice.file_name}
                  </span>
                  <StatusIcon size={12} className={cn(status.color, 'shrink-0')} />
                </div>
                {invoice.status === 'recognized' && (
                  <>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {invoice.invoice_number && `No.${invoice.invoice_number}`}
                      {invoice.invoice_date && ` · ${invoice.invoice_date}`}
                    </div>
                    <div className="text-xs font-medium text-[var(--color-primary)] mt-0.5">
                      {formatCurrency(invoice.total_amount)}
                    </div>
                  </>
                )}
                {invoice.status === 'pending' && (
                  <div className="text-xs text-yellow-500 mt-0.5">正在识别中...</div>
                )}
                {invoice.status === 'failed' && (
                  <div className="text-xs text-red-500 mt-0.5">识别失败</div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(invoice.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
