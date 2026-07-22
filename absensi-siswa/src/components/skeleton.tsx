import { cn } from "@/lib/helpers";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/80",
        className
      )}
      {...props}
    />
  );
}

/* ============================================================
   SkeletonCard - Clay card loading placeholder
   ============================================================ */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "clay-card p-6",
        className
      )}
    >
      <div className="flex items-center justify-between pb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16 mt-2" />
    </div>
  );
}

/* ============================================================
   SkeletonStats - Stats cards grid loading state
   ============================================================ */
export function SkeletonStats({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ============================================================
   SkeletonTable - Table loading state
   ============================================================ */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="clay-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted/30 px-6 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-4 flex gap-4 border-b border-border/30 last:border-0">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={cn(
                  "h-4 flex-1",
                  colIdx === cols - 1 && "w-20 flex-none"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SkeletonForm - Form loading state
   ============================================================ */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="clay-card p-6 space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-2xl mt-4" />
    </div>
  );
}

/* ============================================================
   SkeletonChart - Chart loading state
   ============================================================ */
export function SkeletonChart() {
  return (
    <div className="clay-card p-6">
      <Skeleton className="h-5 w-48 mb-6" />
      <div className="flex items-end gap-3 h-[250px]">
        {[45, 72, 58, 85, 40, 68, 52].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-xl"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SkeletonPage - Full page loading state
   ============================================================ */
export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-8 w-48" />
      <SkeletonStats count={6} />
      <SkeletonChart />
    </div>
  );
}

export { Skeleton };
