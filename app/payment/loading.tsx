export default function PaymentLoading() {
    return (
        <main className="min-h-screen bg-[#f7f3ec] px-4 py-8 dark:bg-[#101113]">
            <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center">
                <div className="h-20 w-20 animate-pulse rounded-lg bg-white/75 dark:bg-white/10" />
                <div className="mt-6 w-full rounded-lg bg-white/80 p-6 dark:bg-white/10">
                    <div className="mx-auto h-24 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                    <div className="mx-auto mt-6 h-10 w-72 max-w-full animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                    <div className="mx-auto mt-4 h-5 w-80 max-w-full animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                    <div className="mx-auto mt-8 h-12 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                </div>
            </div>
        </main>
    );
}
