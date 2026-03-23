import { PatientCardSkeleton, TimelineSkeleton, Skeleton } from '@/components/ui/skeleton'

export default function PatientLoading() {
  return (
    <div className="flex min-h-[100dvh] lg:h-screen lg:overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="hidden lg:flex w-[220px] shrink-0" style={{ backgroundColor: 'var(--color-sidebar)' }} />
      <div className="flex-1 min-w-0 lg:overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          {/* Back link */}
          <Skeleton className="h-4 w-28 mb-6" />
          {/* Patient card */}
          <PatientCardSkeleton />
          {/* Action buttons */}
          <div className="flex gap-2 mb-5">
            <Skeleton className="h-10 w-40 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
          </div>
          {/* Timeline */}
          <Skeleton className="h-3 w-20 mb-5" />
          <TimelineSkeleton />
        </div>
      </div>
    </div>
  )
}
