export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-100 ${className}`}
    />
  )
}

export function PatientCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 mb-5 shadow-sm">
      <div className="flex items-start gap-3 sm:gap-4">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  )
}

export function PatientRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
      <Skeleton className="w-8 h-8 rounded-2xl shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-3.5 w-32 mb-1.5" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-20 hidden sm:block" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
      {/* Hero skeleton */}
      <Skeleton className="h-36 w-full rounded-2xl mb-7" />

      {/* Patient list skeleton */}
      <Skeleton className="h-3 w-20 mb-3" />
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {[...Array(5)].map((_, i) => (
          <PatientRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-5">
          <div className="flex flex-col items-center shrink-0 w-8">
            <Skeleton className="w-3.5 h-3.5 rounded-full mt-1" />
            {i < 2 && <div className="flex-1 w-px bg-gray-100 mt-1.5" />}
          </div>
          <div className="flex-1 pb-6">
            <Skeleton className="h-3 w-28 mb-2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
