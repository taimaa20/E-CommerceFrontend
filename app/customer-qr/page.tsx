"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  LayoutGrid,
  QrCode,
  Smartphone,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import { OperatorShell } from "@/features/customer-qr/components/OperatorShell";
import { useRestaurant } from "@/features/customer-qr/hooks/useRestaurant";
import { useT } from "@/features/customer-qr/i18n/useT";

export default function ScanAndOrderHubPage() {
  const t = useT();
  const { data: restaurant } = useRestaurant();

  const features = [
    { Icon: QrCode, en: "QR per table", ar: "رمز لكل طاولة" },
    { Icon: CreditCard, en: "Pay & split", ar: "ادفع وقسّم" },
    { Icon: Timer, en: "Live tracking", ar: "تتبع مباشر" },
    { Icon: Star, en: "Feedback", ar: "تقييم" },
  ];

  return (
    <OperatorShell>
      {/* ── Hero — brand front, no duplicated CTAs ── */}
      <section className="relative overflow-hidden rounded-[28px] cqr-grad-brand text-white cqr-shadow-lg">
        <div className="pointer-events-none absolute -end-20 -top-24 size-80 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -start-16 -bottom-24 size-80 rounded-full bg-black/20 blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:p-14">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
              <Sparkles className="size-3.5" />
              {t("scanToOrder")}
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-[1.08] sm:text-4xl lg:text-5xl">
              {t.bi({
                en: "Order & pay, right from the table.",
                ar: "اطلب وادفع، مباشرةً من الطاولة.",
              })}
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/85 sm:text-base">
              {t("scanIntro")}
            </p>

            {/* Slim real-feature strip (replaces the dead chip boxes) */}
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
              {features.map(({ Icon, en, ar }) => (
                <li
                  key={en}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/90"
                >
                  <Icon className="size-4 text-white/70" />
                  {t.bi({ en, ar })}
                </li>
              ))}
            </ul>
          </div>

          {/* Elegant phone preview — decorative, desktop only */}
          <div className="relative hidden justify-self-center lg:flex" aria-hidden>
            <PhonePreview restaurantName={restaurant ? t.bi(restaurant.name) : "Menu"} />
          </div>
        </div>
      </section>

      {/* ── Two real entry points ── */}
      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <ActionCard
          href="/customer-qr/table/T1"
          Icon={Smartphone}
          eyebrow={t.bi({ en: "For diners", ar: "للضيوف" })}
          title={t("openCustomerView")}
          subtitle={t.bi({
            en: "Preview the full ordering journey your guests see after scanning.",
            ar: "عاين رحلة الطلب الكاملة التي يراها ضيوفك بعد المسح.",
          })}
          cta={t("openCustomerView")}
          primary
        />
        <ActionCard
          href="/customer-qr/tables"
          Icon={LayoutGrid}
          eyebrow={t.bi({ en: "For staff", ar: "للطاقم" })}
          title={t("tablesAdminTitle")}
          subtitle={t("tablesAdminSub")}
          cta={t("tablesAdminTitle")}
        />
      </section>
    </OperatorShell>
  );
}

function ActionCard({
  href,
  Icon,
  eyebrow,
  title,
  subtitle,
  cta,
  primary,
}: {
  href: string;
  Icon: typeof LayoutGrid;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  primary?: boolean;
}) {
  const t = useT();
  const Arrow = t.isRtl ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-7 flex flex-col gap-4 cqr-lift cqr-shadow-card"
    >
      {primary && (
        <span className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" />
      )}
      <span
        className={
          "relative inline-flex size-12 items-center justify-center rounded-2xl " +
          (primary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
        }
      >
        <Icon className="size-6" />
      </span>
      <div className="relative flex-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </span>
        <h3 className="mt-1 text-lg font-bold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
          {subtitle}
        </p>
      </div>
      <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {cta}
        <Arrow className="size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Lightweight decorative phone mock so the hero reads as a product front. */
function PhonePreview({ restaurantName }: { restaurantName: string }) {
  return (
    <div className="w-[210px] rounded-[2rem] border border-white/15 bg-white/10 p-2.5 shadow-2xl backdrop-blur">
      <div className="overflow-hidden rounded-[1.6rem] bg-card text-card-foreground">
        <div className="cqr-hero-twilight px-4 pt-5 pb-7 text-white">
          <div className="mx-auto h-1 w-10 rounded-full bg-white/25" />
          <div className="mt-4 truncate text-center text-sm font-bold">
            {restaurantName}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-white/70">
            <Star className="size-3 fill-current text-[var(--cqr-gold)]" /> 4.8 ·{" "}
            <span className="text-emerald-300">Open</span>
          </div>
        </div>
        <div className="-mt-3 space-y-2 rounded-t-2xl bg-card p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border/60 p-2">
              <div className="size-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-3/4 rounded-full bg-muted" />
                <div className="h-2 w-1/3 rounded-full bg-primary/30" />
              </div>
              <div className="size-6 rounded-full bg-primary/80" />
            </div>
          ))}
          <div className="mt-1 h-8 rounded-xl bg-primary/90" />
        </div>
      </div>
    </div>
  );
}
