export type CsvRecord = Record<string, string>;

export interface CsvData {
  headers: string[];
  rows: CsvRecord[];
  originalRows: CsvRecord[];
}

export interface EditedCell {
  rowIndex: number;
  field: string;
  originalValue: string;
  newValue: string;
}

export interface TableFilters {
  search: string;
  [key: string]: string | [number, number];
}

export interface SortConfig {
  field: string | null;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}