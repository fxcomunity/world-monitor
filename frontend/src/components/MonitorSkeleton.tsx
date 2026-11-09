interface MonitorSkeletonProps {
  rows?: number;
  columns?: number;
}

function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded bg-gradient-to-r from-cyan-950/70 via-slate-700/40 to-cyan-950/70 ${className}`}
    />
  );
}

export function ValueSkeleton({ className = 'h-7 w-20' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Memuat data"
      className={`inline-block animate-pulse rounded bg-gradient-to-r from-cyan-950/70 via-slate-700/40 to-cyan-950/70 ${className}`}
    />
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Memuat daftar data" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 rounded-xl border border-cyan-900/30 bg-black/20 p-3">
          <SkeletonBar className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-3 w-4/5" />
            <SkeletonBar className="h-2.5 w-2/5" />
          </div>
          <SkeletonBar className="hidden h-3 w-16 shrink-0 sm:block" />
        </div>
      ))}
      <span className="sr-only">Memuat daftar data...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: MonitorSkeletonProps) {
  return (
    <div role="status" aria-label="Memuat tabel data" className="space-y-2">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} aria-hidden="true" className="grid gap-3 border-b border-cyan-900/20 px-3 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => (
            <SkeletonBar key={column} className={`h-3 ${column === 0 ? 'w-4/5' : 'w-full'}`} />
          ))}
        </div>
      ))}
      <span className="sr-only">Memuat tabel data...</span>
    </div>
  );
}
