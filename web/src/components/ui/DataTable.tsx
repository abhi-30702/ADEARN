import { clsx } from 'clsx';

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'No data to display',
  loading = false,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-white/[0.04]">
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4">
                    <div className="h-4 rounded bg-white/[0.06] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-white/[0.04] transition-colors duration-100',
                  onRowClick && 'cursor-pointer hover:bg-white/[0.03]'
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4 text-slate-300">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
