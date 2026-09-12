"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperatorShell } from "@/features/customer-qr/components/OperatorShell";
import { QRCard } from "@/features/customer-qr/components/QRCard";
import { LoadingState } from "@/features/customer-qr/components/LoadingState";
import { useTables } from "@/features/customer-qr/hooks/useTable";
import { useT } from "@/features/customer-qr/i18n/useT";

// Origin is a browser-only value that never changes for the session, so it is
// read through useSyncExternalStore: "" on the server snapshot, the real origin
// on the client — SSR-safe with no setState-in-effect.
const subscribeNoop = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export default function CustomerQrTablesPage() {
  const t = useT();
  const { data: tables, loading } = useTables();
  const origin = useSyncExternalStore(subscribeNoop, getOrigin, getServerOrigin);
  const Back = t.isRtl ? ArrowRight : ArrowLeft;

  return (
    <OperatorShell>
      <div className="flex items-start justify-between gap-3 mb-7">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            <QrCode className="size-3.5" />
            {t("scanToOrder")}
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            {t("tablesAdminTitle")}
            {tables && (
              <span className="ms-2 align-middle text-base font-semibold text-muted-foreground">
                ({tables.length})
              </span>
            )}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            {t("tablesAdminSub")}
          </p>
        </div>
        <Link href="/customer-qr" className="shrink-0">
          <Button variant="outline" className="rounded-xl">
            <Back className="size-4" />
            {t("back")}
          </Button>
        </Link>
      </div>

      {loading || !tables ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <QRCard key={table.id} table={table} origin={origin} />
          ))}
        </div>
      )}
    </OperatorShell>
  );
}
