import { FileText, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
  pending: { icon: Clock, variant: 'outline' as const, label: '待识别' },
  recognized: { icon: CheckCircle, variant: 'secondary' as const, label: '已识别' },
  failed: { icon: AlertCircle, variant: 'destructive' as const, label: '识别失败' },
} as const;

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
                  <Badge variant={status.variant} className="h-4 text-[10px] px-1.5 gap-0.5">
                    <StatusIcon size={10} />
                    {status.label}
                  </Badge>
                </div>
                {invoice.status === 'recognized' && (
                  <>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {invoice.invoice_number && `No.${invoice.invoice_number}`}
                      {invoice.invoice_date && ` · ${invoice.invoice_date}`}
                    </div>
                    <div className="text-xs font-medium text-primary mt-0.5">
                      {formatCurrency(invoice.total_amount)}
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(invoice.id);
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
