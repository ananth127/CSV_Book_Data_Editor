import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, RotateCcw, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CsvRecord, SortConfig, EditedCell } from '@/types/csv';

interface DataTableProps {
  data: CsvRecord[];
  originalData: CsvRecord[];
  onDataChange: (newData: CsvRecord[]) => void;
  onDownload: () => void;
  onReset: () => void;
}

const ITEMS_PER_PAGE = 50;

const DataTable: React.FC<DataTableProps> = ({
  data = [],
  originalData = [],
  onDataChange,
  onDownload,
  onReset
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: 'asc' });
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Dynamic headers
  const headers = useMemo(() => {
    return data.length > 0 ? Object.keys(data[0]) : [];
  }, [data]);

  // Track modified cells
  const modifiedCells = useMemo(() => {
    const modified: EditedCell[] = [];
    data.forEach((row, index) => {
      const originalRow = originalData[index];
      if (originalRow) {
        Object.keys(row).forEach(field => {
          if (String(row[field] || '') !== String(originalRow[field] || '')) {
            modified.push({
              rowIndex: index,
              field,
              originalValue: originalRow[field],
              newValue: row[field]
            });
          }
        });
      }
    });
    return modified;
  }, [data, originalData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig.field) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = String(a[sortConfig.field!] || '');
        const bValue = String(b[sortConfig.field!] || '');

        // Numeric sort if both are numbers
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String sort
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Sorting
  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  // Edit cell
  const handleEdit = (rowIndex: number, field: string, value: string) => {
    const actualIndex = data.findIndex(d => d === filteredAndSortedData[rowIndex]);
    if (actualIndex === -1) return; // safety check

    const newData = [...data];
    newData[actualIndex] = { ...newData[actualIndex], [field]: value };
    onDataChange(newData);
    setEditingCell(null);
  };

  const startEdit = (rowIndex: number, field: string, currentValue: string) => {
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue);
  };

  const isCellModified = (rowIndex: number, field: string) => {
    const actualIndex = data.findIndex(d => d === filteredAndSortedData[rowIndex]);
    return modifiedCells.some(cell =>
      cell.rowIndex === actualIndex && cell.field === field
    );
  };

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">CSV Data Editor</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{filteredAndSortedData.length} records</span>
            <span>•</span>
            <span>Page {currentPage} of {totalPages}</span>
            {modifiedCells.length > 0 && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="gap-1">
                  <Edit3 className="h-3 w-3" />
                  {modifiedCells.length} modified
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={modifiedCells.length === 0}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset All</span>
            <span className="sm:hidden">Reset</span>
          </Button>
          <Button onClick={onDownload} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download CSV</span>
            <span className="sm:hidden">Download</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across all fields..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {headers.length > 0 ? (
                  headers.map(field => (
                    <th key={field} className="min-w-[120px] sm:min-w-[150px]">
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold text-left justify-start gap-2 hover:bg-transparent text-xs sm:text-sm"
                        onClick={() => handleSort(field)}
                      >
                        <span className="truncate max-w-[80px] sm:max-w-none">{field}</span>
                        {getSortIcon(field)}
                      </Button>
                    </th>
                  ))
                ) : (
                  <th>No data loaded</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index}>
                  {headers.map(field => (
                    <td
                      key={field}
                      className={`${isCellModified(index, field) ? 'modified' : ''} group cursor-pointer`}
                      onClick={() => startEdit(index, field, String(row[field] || ''))}
                    >
                      {editingCell?.row === index && editingCell?.field === field ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleEdit(index, field, editValue)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(index, field, editValue);
                            else if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="h-8 text-xs sm:text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2 min-h-[32px]">
                          <span
                            className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[200px]"
                            title={String(row[field] || '')}
                          >
                            {String(row[field] || '—')}
                          </span>
                          <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedData.length)} of{' '}
              {filteredAndSortedData.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - 1);
                  if (page > totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 sm:w-10 text-xs sm:text-sm"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DataTable;
