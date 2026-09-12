"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Heart, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { BrandHeader } from "@/features/customer-qr/components/BrandHeader";
import { EmptyState } from "@/features/customer-qr/components/EmptyState";
import { SatisfactionScale } from "@/features/customer-qr/components/SatisfactionScale";
import { useOrder } from "@/features/customer-qr/store/orderStore";
import { useRestaurant } from "@/features/customer-qr/hooks/useRestaurant";
import { useT } from "@/features/customer-qr/i18n/useT";
import { tableUrl } from "@/features/customer-qr/constants";
import { feedbackService } from "@/features/customer-qr/services";

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = use(params);
  const t = useT();

  const order = useOrder(tableId, (s) => s.order);
  const feedback = useOrder(tableId, (s) => s.feedback);
  const setFeedback = useOrder(tableId, (s) => s.setFeedback);
  const { data: restaurant } = useRestaurant();

  const [rating, setRating] = useState(feedback?.rating ?? 5);
  const [comment, setComment] = useState(feedback?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (!order) {
    return (
      <MobileShell header={<BrandHeader title={t("feedback")} showBack />}>
        <EmptyState
          title={t("noResults")}
          description={t("noResultsHint")}
          action={
            <Link href={tableUrl(tableId, "menu")}>
              <Button className="rounded-full">{t("browseMenu")}</Button>
            </Link>
          }
        />
      </MobileShell>
    );
  }

  if (feedback) {
    return (
      <MobileShell header={<BrandHeader title={t("thankYou")} />}>
        <div className="px-5 py-8 space-y-5 text-center">
          <div className="cqr-success-pop size-16 mx-auto rounded-full bg-rose-100 text-rose-500 inline-flex items-center justify-center">
            <Heart className="size-7 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t("thankYou")}</h2>
            <p className="text-sm text-muted-foreground">{t("thankYouSub")}</p>
          </div>

          {restaurant?.social?.instagram && (
            <InstagramCard
              href={restaurant.social.instagram}
              title={t("followInstagram")}
              handle={t("instagramHandle")}
            />
          )}

          <Link href={tableUrl(tableId, "menu")} className="contents">
            <Button size="lg" className="rounded-2xl w-full h-14 mt-2">
              {t("orderAgain")}
            </Button>
          </Link>
        </div>
      </MobileShell>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sat: "bad" | "ok" | "great" =
        rating <= 2 ? "bad" : rating === 3 ? "ok" : "great";
      const saved = await feedbackService.submit({
        orderId: order.id,
        rating,
        satisfaction: sat,
        comment: comment.trim() || undefined,
      });
      setFeedback(saved);
      toast.success(t("thankYou"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell
      header={
        <BrandHeader title={t("feedbackTitle")} subtitle={t("feedbackSub")} showBack />
      }
      footer={
        <div className="p-4">
          <Button
            size="lg"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full rounded-2xl h-14"
          >
            {t("submitFeedback")}
          </Button>
        </div>
      }
    >
      <div className="px-5 py-5 space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("satisfactionShort")}</h3>
          <SatisfactionScale value={rating} onChange={setRating} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("additionalFeedback")}</h3>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("tellUsMore")}
            rows={4}
            maxLength={500}
            className="rounded-2xl"
          />
        </section>

        {restaurant?.social?.instagram && (
          <InstagramCard
            href={restaurant.social.instagram}
            title={t("followInstagram")}
            handle={t("instagramHandle")}
          />
        )}

        <div className="h-2" />
      </div>
    </MobileShell>
  );
}

function InstagramCard({
  href,
  title,
  handle,
}: {
  href: string;
  title: string;
  handle: string;
}) {
  const t = useT();
  const Arrow = t.isRtl ? ChevronLeft : ChevronRight;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 hover:bg-accent/40 transition"
    >
      <span className="size-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-amber-400 text-white inline-flex items-center justify-center">
        <Instagram className="size-5" />
      </span>
      <span className="flex-1 min-w-0 text-start">
        <span className="block text-sm font-semibold truncate">{title}</span>
        <span className="block text-[11px] text-muted-foreground truncate">
          {handle}
        </span>
      </span>
      <Arrow className="size-4 text-muted-foreground" />
    </a>
  );
}
