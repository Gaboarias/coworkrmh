import { Skeleton } from "@/components/ui/Skeleton";

function HeaderBlock() {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  );
}

function Rows({ n = 6 }: { n?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

function CardGrid({ n = 3 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-elev-2"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="p-6 md:p-8">
      <HeaderBlock />
      <Rows />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-6 md:p-8">
      <HeaderBlock />
      <CardGrid n={3} />
      <Rows n={5} />
    </div>
  );
}

export function GridPageSkeleton() {
  return (
    <div className="p-6 md:p-8">
      <HeaderBlock />
      <CardGrid n={6} />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="p-6 md:p-8">
      <HeaderBlock />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface p-2">
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectHubSkeleton() {
  return (
    <div className="p-6 md:p-8">
      <HeaderBlock />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <Rows />
    </div>
  );
}
