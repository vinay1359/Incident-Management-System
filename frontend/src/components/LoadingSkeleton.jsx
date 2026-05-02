export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 animate-fade-in">
      {/* Left Column */}
      <div className="lg:col-span-8 flex flex-col order-2 lg:order-1">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-10 space-y-3">
          <div className="skeleton h-8 sm:h-10 w-48 sm:w-64" />
          <div className="skeleton h-4 sm:h-5 w-72 sm:w-96" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="skeleton h-10 sm:h-9 w-40 sm:w-48 rounded" />
          <div className="skeleton h-10 sm:h-9 w-48 sm:w-56 rounded" />
        </div>

        {/* Incident Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="card p-4 sm:p-6 flex flex-col sm:flex-row gap-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-3 h-3 rounded-full" />
                  <div className="skeleton h-4 sm:h-5 w-32 sm:w-48" />
                  <div className="skeleton h-4 sm:h-5 w-12" />
                </div>
                <div className="flex gap-3">
                  <div className="skeleton h-3 sm:h-4 w-20" />
                  <div className="skeleton h-3 sm:h-4 w-24" />
                  <div className="skeleton h-3 sm:h-4 w-16" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="skeleton h-8 w-16" />
                <div className="skeleton h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-4 flex flex-col gap-6 sm:gap-10 order-1 lg:order-2">
        {/* Telemetry Skeleton */}
        <div>
          <div className="skeleton h-4 w-28 mb-3 sm:mb-4" />
          <div className="p-4 sm:p-5 border rounded space-y-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-4 w-12" />
            </div>
            <div className="flex justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="skeleton h-3 w-16" />
              <div className="flex items-center gap-2">
                <div className="skeleton w-2 h-2 rounded-full" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Skeleton */}
        <div>
          <div className="skeleton h-4 w-32 mb-3 sm:mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="metric-card p-3 sm:p-4 lg:p-4 lg:px-6 border" style={{ borderColor: 'var(--color-border)' }}>
                <div className="skeleton h-3 w-20 mb-2" />
                <div className="skeleton h-6 sm:h-7 lg:h-8 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function IncidentDetailSkeleton() {
  return (
    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-20">
      {/* Left Column */}
      <div className="lg:col-span-8 flex flex-col gap-8 sm:gap-12 order-2 lg:order-1">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="skeleton h-4 w-20" />
          <div className="flex items-center gap-3">
            <div className="skeleton h-5 w-12" />
            <div className="skeleton h-4 w-24" />
          </div>
          <div className="skeleton h-7 sm:h-8 w-64 sm:w-96" />
        </div>

        {/* Status Card Skeleton */}
        <div className="p-4 sm:p-6 border rounded space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-4">
            <div className="skeleton w-3 h-3 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-5 w-32" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="skeleton h-10 w-32" />
            <div className="skeleton h-10 w-28" />
          </div>
        </div>

        {/* Signals Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-24" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 sm:p-4 border rounded space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <div className="skeleton h-4 w-10" />
                  <div className="skeleton h-4 w-20" />
                </div>
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-20 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-4 flex flex-col gap-6 sm:gap-8 order-1 lg:order-2">
        {/* Quick Stats Skeleton */}
        <div className="lg:hidden grid grid-cols-2 gap-3">
          <div className="p-3 border rounded space-y-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-6 w-12" />
          </div>
          <div className="p-3 border rounded space-y-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-6 w-16" />
          </div>
        </div>

        {/* Timeline Skeleton */}
        <div>
          <div className="skeleton h-4 w-20 mb-3 sm:mb-4" />
          <div className="p-4 sm:p-5 border rounded space-y-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="space-y-2">
              <div className="skeleton h-3 w-32" />
              <div className="skeleton h-4 w-48" />
            </div>
            <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
