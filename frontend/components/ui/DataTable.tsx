"use client"

import * as React from "react"

type Column = {
  key: string
  header: string
  width?: string
}

type RowRecord = Record<string, React.ReactNode>

type DataTableProps<T extends RowRecord> = {
  columns: Column[]
  rows: T[]
  className?: string
  emptyLabel?: string
}

export function DataTable<T extends RowRecord>({ columns, rows, className, emptyLabel = "No data" }: DataTableProps<T>) {
  return (
    <div className={["w-full overflow-x-auto", className].filter(Boolean).join(" ")}> 
      <table className="min-w-full table-fixed border-collapse text-sm">
        <thead className="sticky top-0 bg-white dark:bg-gray-900">
          <tr className="border-b border-gray-200 dark:border-gray-800">
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width }} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">{emptyLabel}</td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/50"}>
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    {row[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
