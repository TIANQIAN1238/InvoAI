import { FileText, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InvoiceListProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onDelete: (id: number) => void;
}

const statusConfig = {
  pending: { icon: Loader2, variant: 'outline' as const, label: 'Recognizing', animate: true },
  recognized: { icon: CheckCircle, variant: 'secondary' as const, label: 'Ready', animate: false },
  failed: { icon: AlertCircle, variant: 'destructive' as const, label: 'Failed', animate: false },
} as const;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export function InvoiceList({ invoices, selectedInvoice, onSelectInvoice, onDelete }: InvoiceListProps) {
  return (
    <div className="divide-y divide-border/50">
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
              isSelected ? 'bg-accent border-l-2 border-l-primary' : 'hover:bg-accent/50'
            )}
          >
            <div className="flex items-start gap-2">
              <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {invoice.seller_name || invoice.file_name}
                  </span>
                  <Badge variant={status.variant} className="h-4 text-[10px] px-1.5 gap-0.5 shrink-0">
                    <StatusIcon size={10} className={status.animate ? 'animate-spin' : ''} />
                    {status.label}
                  </Badge>
                </div>

                {invoice.status === 'pending' && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    OCR is running...
                  </div>
                )}

                {invoice.status === 'recognized' && (
                  <>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {invoice.invoice_number && `No.${invoice.invoice_number}`}
                      {invoice.invoice_date && ` | ${formatDate(invoice.invoice_date)}`}
                    </div>
                    <div className="text-xs font-medium text-primary mt-0.5">
                      {formatCurrency(invoice.total_amount)}
                    </div>
                  </>
                )}

                {invoice.status === 'failed' && (
                  <div className="text-xs text-destructive mt-0.5">
                    Recognition failed. You can try again.
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete invoice "${invoice.file_name}"?`)) {
                    onDelete(invoice.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
