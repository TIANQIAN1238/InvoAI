import type { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface InvoiceDetailProps {
  invoice: Invoice;
}

const fields: Array<{ key: keyof Invoice; label: string; format?: (v: unknown) => string }> = [
  { key: 'invoice_type', label: 'Type' },
  { key: 'invoice_number', label: 'Number' },
  { key: 'invoice_code', label: 'Code' },
  { key: 'invoice_date', label: 'Issue Date', format: v => String(v).slice(0, 10) },
  { key: 'amount', label: 'Amount (excl. tax)', format: v => formatCurrency(v as number) },
  { key: 'tax_amount', label: 'Tax', format: v => formatCurrency(v as number) },
  { key: 'total_amount', label: 'Total', format: v => formatCurrency(v as number) },
  { key: 'seller_name', label: 'Seller' },
  { key: 'buyer_name', label: 'Buyer' },
  { key: 'remarks', label: 'Remarks' },
];

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  return (
    <div className="p-3 bg-card max-h-48 overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Invoice Details
      </h3>
      <Separator className="mb-2" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {fields.map(({ key, label, format }) => {
          const value = invoice[key];
          if (!value && value !== 0) return null;
          const display = format ? format(value) : String(value);
          return (
            <div key={key} className="flex items-baseline gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">{label}</span>
              <span className="text-xs font-medium truncate">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
