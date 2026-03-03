import { useMemo, useState } from 'react';
import { Upload, Search, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { InvoiceList } from './InvoiceList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Invoice } from '@/types/invoice';

interface SidebarProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onUpload: () => void;
  onSearch: (params: { search?: string; dateFrom?: string; dateTo?: string }) => void;
  onDelete: (id: number) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  uploadProgress: { processed: number; total: number } | null;
}

export function Sidebar({
  invoices,
  selectedInvoice,
  onSelectInvoice,
  onUpload,
  onSearch,
  onDelete,
  loading,
  error,
  onClearError,
  uploadProgress,
}: SidebarProps) {
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasActiveFilters = useMemo(() => {
    return Boolean(searchText || dateFrom || dateTo);
  }, [searchText, dateFrom, dateTo]);

  const validateDateRange = (): boolean => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setValidationError('Start date cannot be later than end date');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSearch = () => {
    if (!validateDateRange()) return;

    onSearch({
      search: searchText.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleClear = () => {
    setSearchText('');
    setDateFrom('');
    setDateTo('');
    setValidationError(null);
    onSearch({});
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-3 border-b border-border space-y-2">
        <Button onClick={onUpload} className="w-full" size="sm" disabled={Boolean(uploadProgress)}>
          {uploadProgress ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploadProgress ? `Uploading ${uploadProgress.processed}/${uploadProgress.total}` : 'Upload Invoice'}
        </Button>
        {uploadProgress && (
          <div className="text-[11px] text-muted-foreground">
            Running OCR in background...
          </div>
        )}
      </div>

      <div className="p-3 border-b border-border space-y-2">
        {(error || validationError) && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs flex items-center justify-between gap-2">
              <span>{validationError || error}</span>
              {error && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={onClearError}
                  className="h-5 px-1.5 text-[10px]"
                >
                  Close
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search number, company, type, remarks..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex gap-1.5 items-center">
          <Calendar size={12} className="text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 min-w-0 h-7 px-1.5 text-xs"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 min-w-0 h-7 px-1.5 text-xs"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSearch} size="sm" className="flex-1 h-7 text-xs">
            Search
          </Button>
          <Button onClick={handleClear} variant="secondary" size="sm" className="flex-1 h-7 text-xs" disabled={!hasActiveFilters}>
            Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
            <p>No invoices yet</p>
            <p className="text-xs mt-1">Use the upload button above</p>
          </div>
        ) : (
          <InvoiceList
            invoices={invoices}
            selectedInvoice={selectedInvoice}
            onSelectInvoice={onSelectInvoice}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}
