import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function DataTable({
  columns,
  data,
  pagination = true,
  getRowId,
}) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    ...(pagination && { getPaginationRowModel: getPaginationRowModel() }),
    defaultColumn: {
      minSize: 80,
      maxSize: 400,
    },
  })

  return (
    <div className="space-y-3">
      <div className="bg-surface rounded-[8px] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map((header) => {
                    return (
                      <th
                        key={header.id}
                        className="h-9 px-4 text-left align-middle font-normal text-muted text-xs"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-rule">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="h-12 transition-colors hover:bg-raised/70"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5 align-middle text-ink text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-28 text-center text-muted text-sm">
                    Tidak ada data yang cocok dengan filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-muted num">
            Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
