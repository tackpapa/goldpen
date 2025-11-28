import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// 테이블 스켈레톤
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* 로우 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// 카드 스켈레톤
function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

// 카드 그리드 스켈레톤
function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// 페이지 스켈레톤 (헤더 + 카드 + 테이블)
function PageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 통계 카드 */}
      <CardGridSkeleton count={4} />

      {/* 테이블 */}
      <div className="rounded-lg border p-4">
        <TableSkeleton rows={8} cols={5} />
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, CardGridSkeleton, PageSkeleton }
