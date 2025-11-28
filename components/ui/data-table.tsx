"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  disablePagination?: boolean
  infiniteScroll?: boolean
  pageSize?: number
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "검색...",
  disablePagination = false,
  infiniteScroll = false,
  pageSize = 20,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = React.useState(pageSize)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: (disablePagination || infiniteScroll) ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Get all filtered rows
  const allRows = table.getFilteredRowModel().rows

  // For infinite scroll, only show visible rows
  const displayRows = infiniteScroll
    ? allRows.slice(0, visibleCount)
    : table.getRowModel().rows

  const hasMore = infiniteScroll && visibleCount < allRows.length

  // Reset visible count when filter changes
  React.useEffect(() => {
    if (infiniteScroll) {
      setVisibleCount(pageSize)
    }
  }, [columnFilters, infiniteScroll, pageSize])

  // Intersection Observer for infinite scroll
  React.useEffect(() => {
    if (!infiniteScroll || !loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + pageSize, allRows.length))
        }
      },
      {
        threshold: 0.1,
        root: containerRef.current
      }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [infiniteScroll, hasMore, pageSize, allRows.length])

  return (
    <div className="space-y-3 md:space-y-4">
      {(searchKey || toolbar) && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {searchKey && (
            <div className="flex items-center">
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="w-full md:max-w-sm text-sm md:text-base"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}
      <div className="rounded-md border overflow-hidden">
        <div
          ref={containerRef}
          className={`overflow-x-auto -mx-0.5 ${infiniteScroll ? 'max-h-[70vh] overflow-y-auto' : ''}`}
        >
          <Table>
            <TableHeader className={infiniteScroll ? 'sticky top-0 bg-background z-10' : ''}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-xs md:text-sm whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {displayRows?.length ? (
                <>
                  {displayRows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-xs md:text-sm whitespace-nowrap">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Infinite scroll trigger */}
                  {infiniteScroll && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        <div ref={loadMoreRef} className="h-1" />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-xs md:text-sm"
                  >
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Traditional pagination */}
      {!disablePagination && !infiniteScroll && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          <div className="flex-1 text-xs md:text-sm text-muted-foreground order-2 sm:order-1">
            {table.getFilteredRowModel().rows.length}개 중{" "}
            {table.getFilteredSelectedRowModel().rows.length}개 선택됨
          </div>
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-none text-xs md:text-sm"
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-none text-xs md:text-sm"
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
