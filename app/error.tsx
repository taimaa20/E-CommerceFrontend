"use client"

import { AlertCircle, RefreshCw } from "lucide-react"

import { useLocale } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          {t("anErrorOccurred")}
        </h1>
        <Button onClick={reset} className="mt-6 w-full sm:w-auto">
          <RefreshCw className="h-4 w-4" />
          {t("retryBtn")}
        </Button>
      </div>
    </main>
  )
}
