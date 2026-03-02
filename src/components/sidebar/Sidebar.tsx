import { useState } from 'react';
import { Upload, Search, Calendar } from 'lucide-react';
import { InvoiceList } from './InvoiceList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Invoice } from '@/types/invoice';

interface SidebarProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onUpload: () => void;
  onSearch: (params: { search?: string; dateFrom?: string; dateTo?: string }) => void;
  onDelete: (id: number) => void;
  loading: boolean;
}

export function Sidebar({
  invoices,
  selectedInvoice,
  onSelectInvoice,
  onUpload,
  onSearch,
  onDelete,
  loading,
}: SidebarProps) {
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleSearch = () => {
    onSearch({
      search: searchText || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleClear = () => {
    setSearchText('');
    setDateFrom('');
    setDateTo('');
    onSearch({});
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <Button onClick={onUpload} className="w-full">
          <Upload size={16} />
          上传发票
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索发票号、公司名..."
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
            查询
          </Button>
          <Button onClick={handleClear} variant="secondary" size="sm" className="flex-1 h-7 text-xs">
            清空
          </Button>
        </div>
      </div>

      {/* Invoice list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            加载中...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
            <p>暂无发票</p>
            <p className="text-xs mt-1">点击上方按钮上传</p>
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
