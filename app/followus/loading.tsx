export default function FollowUsLoading() {
    return (
        <main className="min-h-screen bg-[#f7f3ec] px-4 py-8 dark:bg-[#101113]">
            <div className="mx-auto flex max-w-2xl flex-col items-center">
                <div className="h-24 w-24 animate-pulse rounded-lg bg-white/70 dark:bg-white/10" />
                <div className="mt-6 h-10 w-64 max-w-full animate-pulse rounded-lg bg-white/70 dark:bg-white/10" />
                <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-lg bg-white/60 dark:bg-white/10" />
                <div className="mt-8 flex gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-12 w-12 animate-pulse rounded-lg bg-white/70 dark:bg-white/10" />
                    ))}
                </div>
                <div className="mt-8 grid w-full gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-lg bg-white/75 dark:bg-white/10" />
                    ))}
                </div>
            </div>
        </main>
    );
}
