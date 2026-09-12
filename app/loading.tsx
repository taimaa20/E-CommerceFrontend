export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-muted/70" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-border bg-card shadow-sm"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-[28rem] animate-pulse rounded-2xl border border-border bg-card shadow-sm" />
          <div className="h-[28rem] animate-pulse rounded-2xl border border-border bg-card shadow-sm" />
        </div>
      </div>
    </main>
  )
}
