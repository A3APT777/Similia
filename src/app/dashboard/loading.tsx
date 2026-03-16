import { DashboardSkeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[100dvh] lg:h-screen lg:overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar placeholder */}
      <div className="hidden lg:flex w-[220px] shrink-0" style={{ backgroundColor: 'var(--color-sidebar)' }} />
      {/* Content */}
      <div className="flex-1 min-w-0">
        <DashboardSkeleton />
      </div>
    </div>
  )
}
