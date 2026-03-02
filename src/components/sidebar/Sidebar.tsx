import { useState } from 'react';
import { Upload, Search, Calendar } from 'lucide-react';
import { InvoiceList } from './InvoiceList';
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <button
          onClick={onUpload}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Upload size={16} />
          上传发票
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索发票号、公司名..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex gap-1.5 items-center">
          <Calendar size={12} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[var(--color-primary)]"
          />
          <span className="text-xs text-gray-400">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 py-1 text-xs bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            查询
          </button>
          <button
            onClick={handleClear}
            className="flex-1 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {/* Invoice list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            加载中...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400">
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
