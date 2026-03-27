"use client";

import { type ReactNode } from "react";

export interface SortEntry {
  key: string;
  dir: "asc" | "desc";
}

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  sorts?: SortEntry[];
  onRowClick?: (row: T) => void;
}

function SortChevron({ priority, dir, total }: { priority: number | null; dir?: "asc" | "desc"; total: number }) {
  if (priority === null) {
    return (
      <svg className="inline w-3 h-3 ml-1 text-ink-tertiary opacity-40" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 2L9 5H3L6 2ZM6 10L3 7H9L6 10Z" />
      </svg>
    );
  }
  return (
    <span className="inline-flex items-center ml-1">
      <svg className="inline w-3 h-3 text-ink-tertiary" viewBox="0 0 12 12" fill="currentColor">
        {dir === "asc" ? <path d="M6 2L10 8H2L6 2Z" /> : <path d="M6 10L2 4H10L6 10Z" />}
      </svg>
      {total > 1 && (
        <span className="text-[9px] text-ink-tertiary ml-0.5">{priority + 1}</span>
      )}
    </span>
  );
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  sorts = [],
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((col) => {
              const sortIndex = sorts.findIndex((s) => s.key === col.key);
              const sortEntry = sortIndex >= 0 ? sorts[sortIndex] : null;
              return (
                <th
                  key={col.key}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  className={`px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase tracking-wider bg-surface-elevated ${
                    col.sortable ? "cursor-pointer select-none" : ""
                  }`}
                >
                  {col.label}
                  {col.sortable && (
                    <SortChevron
                      priority={sortEntry ? sortIndex : null}
                      dir={sortEntry?.dir}
                      total={sorts.length}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`hover:bg-surface-sunken transition-fast border-b border-surface-sunken ${
                onRowClick ? "cursor-pointer" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm">
                  {col.render
                    ? col.render(row)
                    : (row[col.key] as ReactNode) ?? "\u2014"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
