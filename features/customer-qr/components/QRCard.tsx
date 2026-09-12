"use client";

import { Download, ExternalLink, Eye, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildQrDownloadUrl, buildQrImageUrl } from "../utils/qr";
import { tableQrPayload, tableUrl } from "../constants";
import { useT } from "../i18n/useT";
import type { CustomerTable } from "../types";

interface Props {
  table: CustomerTable;
  origin: string;
}

export function QRCard({ table, origin }: Props) {
  const t = useT();
  const payload = tableQrPayload(origin, table.id);
  const previewSrc = buildQrImageUrl(payload, { size: 320, margin: 1 });
  const downloadSrc = buildQrDownloadUrl(payload, 720);
  const customerHref = tableUrl(table.id);

  const handlePrint = () => {
    const w = window.open("", "_blank", "noopener,noreferrer,width=420,height=620");
    if (!w) return;
    const tableLabel = t.bi(table.label);
    const areaLabel = t.bi(table.area);
    w.document.write(`<!doctype html>
<html dir="${t.isRtl ? "rtl" : "ltr"}" lang="${t.locale}">
<head>
<meta charset="utf-8" />
<title>${tableLabel} — QR</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;margin:0;padding:32px;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#fff;border-radius:24px;padding:32px;text-align:center;box-shadow:0 30px 80px -30px rgba(15,23,42,.25);max-width:360px;width:100%}
  .brand{font-size:13px;color:#64748b;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px}
  .table{font-size:28px;font-weight:700;color:#0f172a;margin-bottom:4px}
  .area{font-size:14px;color:#64748b;margin-bottom:24px}
  img{width:100%;height:auto;border-radius:16px;border:1px solid #e2e8f0;background:#fff}
  .hint{font-size:13px;color:#475569;margin-top:18px}
  .url{font-size:12px;color:#94a3b8;margin-top:6px;word-break:break-all}
  @media print{body{padding:0;background:#fff}.card{box-shadow:none;border:1px solid #e2e8f0}}
</style>
</head>
<body>
  <div class="card">
    <div class="brand">${t("scanToOrder")}</div>
    <div class="table">${tableLabel}</div>
    <div class="area">${areaLabel}</div>
    <img alt="QR ${tableLabel}" src="${downloadSrc}" />
    <div class="hint">${t("qrPayloadHint")}</div>
    <div class="url">${payload}</div>
  </div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)})</script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <Card className="gap-4 py-5 px-5 rounded-3xl border-slate-200/70 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("table")} {table.code}
          </div>
          <div className="text-lg font-semibold">{t.bi(table.label)}</div>
          <div className="text-xs text-muted-foreground">
            {t.bi(table.area)} · {table.seats} {t("seats")}
          </div>
        </div>
        <Link
          href={customerHref}
          target="_blank"
          rel="noopener"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          {t("openCustomerView")}
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={`QR ${t.bi(table.label)}`}
          className="absolute inset-0 size-full object-contain p-3"
          loading="lazy"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} className="h-auto w-full flex-col gap-1 rounded-xl px-1 py-2 text-xs">
          <Printer className="size-4 shrink-0" />
          <span>{t("printQr")}</span>
        </Button>
        <a href={downloadSrc} download={`qr-${table.id}.png`} className="contents">
          <Button variant="outline" size="sm" className="h-auto w-full flex-col gap-1 rounded-xl px-1 py-2 text-xs" asChild={false}>
            <span className="inline-flex flex-col items-center gap-1">
              <Download className="size-4 shrink-0" />
              <span>{t("downloadQr")}</span>
            </span>
          </Button>
        </a>
        <Link href={customerHref} target="_blank" className="contents">
          <Button size="sm" className="h-auto w-full flex-col gap-1 rounded-xl px-1 py-2 text-xs">
            <Eye className="size-4 shrink-0" />
            <span>{t("previewQr")}</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
