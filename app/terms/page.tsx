"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  RotateCcw,
  ShieldCheck,
  Lock,
  Utensils,
  Truck,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LanguageSwitcher from "@/app/website/components/LanguageSwitcher";
import { useWebsiteLocale, isRTL } from "@/app/website/hooks/useWebsiteLocale";

// -------------------------------------------------------------
// Content model — bilingual, structured, single source of truth.
// Editing copy here is the only thing a content owner needs to do.
// -------------------------------------------------------------

type Block =
  | { kind: "p"; en: string; ar: string }
  | { kind: "list"; en: string[]; ar: string[] }
  | { kind: "subheading"; en: string; ar: string };

interface PolicySection {
  id: string;
  icon: LucideIcon;
  titleEn: string;
  titleAr: string;
  blocks: Block[];
}

const SECTIONS: PolicySection[] = [
  {
    id: "terms",
    icon: FileText,
    titleEn: "Terms & Conditions",
    titleAr: "الشروط والأحكام",
    blocks: [
      {
        kind: "p",
        en: "Welcome to Sando Box. By accessing or using our services, you agree to comply with the following terms and conditions:",
        ar: "مرحبًا بكم في Sando Box. باستخدامكم لخدماتنا، فإنكم توافقون على الالتزام بالشروط التالية:",
      },
      {
        kind: "list",
        en: [
          "All orders are subject to availability and confirmation.",
          "Prices may change without prior notice.",
          "We reserve the right to refuse or cancel any order at our discretion.",
          "Any misuse of the system, including fraudulent or abusive behavior, may result in suspension or termination of service.",
          "Users are responsible for providing accurate information when placing orders.",
        ],
        ar: [
          "جميع الطلبات تخضع للتوفر والتأكيد.",
          "الأسعار قابلة للتغيير دون إشعار مسبق.",
          "نحتفظ بالحق في رفض أو إلغاء أي طلب.",
          "أي استخدام غير قانوني أو احتيالي قد يؤدي إلى إيقاف الخدمة.",
          "يتحمل المستخدم مسؤولية إدخال بيانات صحيحة عند الطلب.",
        ],
      },
    ],
  },
  {
    id: "refund",
    icon: RotateCcw,
    titleEn: "Refund Policy",
    titleAr: "سياسة الاسترجاع",
    blocks: [
      {
        kind: "p",
        en: "We regret to inform you that we do not offer a refund policy. All services provided are non-refundable once payment has been made. If you have any inquiries, please feel free to contact us.",
        ar: "نأسف لإبلاغكم بأننا لا نقدّم سياسة استرجاع. جميع الخدمات المقدَّمة غير قابلة للاسترداد بعد إتمام الدفع. لأي استفسار، يسعدنا تواصلكم معنا.",
      },
    ],
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    titleEn: "Privacy Policy",
    titleAr: "سياسة الخصوصية",
    blocks: [
      {
        kind: "p",
        en: "We respect the privacy of our customers and are committed to protecting their data. When you use our services, we may collect certain personal information such as your name, email, and phone number to improve our services and communicate with you effectively.",
        ar: "نحترم خصوصية عملائنا ونلتزم بحماية بياناتهم. عند استخدامكم لخدماتنا، قد نجمع بعض البيانات الشخصية كالاسم والبريد الإلكتروني ورقم الهاتف بهدف تحسين خدماتنا والتواصل معكم بفاعلية.",
      },
      {
        kind: "p",
        en: "We do not sell or share your data with any third party without your consent unless required by law. All the information you provide is secured with appropriate measures to protect it from unauthorized access.",
        ar: "نحن لا نبيع أو نشارك بياناتكم مع أي طرف ثالث دون موافقتكم، إلا إذا اقتضى القانون ذلك. جميع المعلومات التي تقدّمونها محميّة بإجراءات أمنية مناسبة لمنع الوصول غير المصرّح به.",
      },
      {
        kind: "p",
        en: "If you have any questions regarding our privacy policy, please do not hesitate to contact us through the details provided in the Contact Us section.",
        ar: "إذا كان لديكم أي استفسار بشأن سياسة الخصوصية، فلا تتردّدوا في التواصل معنا عبر البيانات الموجودة في قسم تواصل معنا.",
      },
    ],
  },
  {
    id: "security",
    icon: Lock,
    titleEn: "Data Security",
    titleAr: "حماية البيانات",
    blocks: [
      {
        kind: "p",
        en: "We implement appropriate security measures to protect your data from unauthorized access, alteration, or disclosure.",
        ar: "نستخدم إجراءات أمنية لحماية بياناتكم من الوصول غير المصرح به أو الاستخدام غير الصحيح.",
      },
      {
        kind: "p",
        en: "However, no system is completely secure, and users share data at their own responsibility.",
        ar: "ومع ذلك، لا يوجد نظام آمن بنسبة 100%، ويتحمّل المستخدم مسؤولية مشاركة بياناته.",
      },
    ],
  },
  {
    id: "service",
    icon: Utensils,
    titleEn: "Service Policy",
    titleAr: "سياسة الخدمة",
    blocks: [
      {
        kind: "p",
        en: "Sando Box provides food ordering and related services.",
        ar: "تقدّم Sando Box خدمات الطلب والخدمات المرتبطة به.",
      },
      {
        kind: "list",
        en: [
          "Orders are prepared based on customer requests.",
          "Preparation time may vary depending on order volume.",
          "Once an order is marked as “Prepared,” cancellation may not be possible.",
          "Special requests are handled based on availability.",
        ],
        ar: [
          "يتم تجهيز الطلبات حسب طلب العميل.",
          "وقت التحضير قد يختلف حسب الضغط.",
          "بعد تجهيز الطلب، قد لا يمكن الإلغاء.",
          "الطلبات الخاصة تعتمد على التوفر.",
        ],
      },
      {
        kind: "subheading",
        en: "Order & Cancellation Policy",
        ar: "سياسة الطلب والإلغاء",
      },
      {
        kind: "list",
        en: [
          "Orders can be canceled only before preparation begins.",
          "Once preparation has started, cancellation may require approval and may be treated as waste.",
          "Paid takeaway orders cannot be canceled after confirmation.",
        ],
        ar: [
          "يمكن إلغاء الطلب قبل بدء التحضير فقط.",
          "بعد بدء التحضير، يتطلب الإلغاء موافقة وقد يُحتسب كهدر.",
          "لا يمكن إلغاء طلبات التيك أواي بعد الدفع.",
        ],
      },
    ],
  },
  {
    id: "shipping",
    icon: Truck,
    titleEn: "Shipping Policy",
    titleAr: "سياسة الشحن",
    blocks: [
      {
        kind: "p",
        en: "We provide only digital and advertising services; therefore, we do not have a shipping policy. If you need any clarification, please feel free to contact us.",
        ar: "نقدّم خدمات رقمية وإعلانية فقط؛ لذلك لا توجد لدينا سياسة شحن. لأي توضيح، يسعدنا تواصلكم معنا.",
      },
    ],
  },
  {
    id: "contact",
    icon: Mail,
    titleEn: "Contact Us",
    titleAr: "تواصل معنا",
    blocks: [
      {
        kind: "p",
        en: "For any questions about these policies, reach out — we usually reply within one business day.",
        ar: "لأي استفسار بشأن هذه السياسات، يسعدنا تواصلكم — عادةً نردّ خلال يوم عمل واحد.",
      },
    ],
  },
];

// -------------------------------------------------------------
// Page
// -------------------------------------------------------------

export default function TermsAndPoliciesPage() {
  const { locale } = useWebsiteLocale();
  const rtl = isRTL(locale);

  const ui = useMemo(
    () => ({
      eyebrow: locale === "ar" ? "المستندات القانونية" : "Legal & Policies",
      title: locale === "ar" ? "الشروط والسياسات" : "Terms & Policies",
      lead:
        locale === "ar"
          ? "نضع هنا كل ما تحتاج معرفته قبل استخدام خدمات Sando Box — بلغة واضحة، وبدون مفاجآت."
          : "Everything you need to know before using Sando Box — written plainly, no surprises.",
      lastUpdatedLabel: locale === "ar" ? "آخر تحديث" : "Last updated",
      lastUpdatedValue: locale === "ar" ? "٤ مايو ٢٠٢٦" : "May 4, 2026",
      onThisPage: locale === "ar" ? "في هذه الصفحة" : "On this page",
      contactCta: locale === "ar" ? "راسلنا" : "Email us",
      callCta: locale === "ar" ? "اتصل بنا" : "Call us",
      backToTop: locale === "ar" ? "العودة للأعلى" : "Back to top",
    }),
    [locale]
  );

  const activeId = useActiveSection(SECTIONS.map((s) => s.id));

  return (
    <main className="w-terms-page">
      <PageStyles />

      {/* Slim brand strip — ties the page back to /website */}
      <div className="w-terms-strip">
        <div className="w-container w-terms-strip-inner">
          <Link
            href="/website"
            className="w-terms-backlink"
            aria-label={locale === "ar" ? "العودة إلى الموقع" : "Back to site"}
          >
            <ArrowLeft size={15} className="w-terms-backlink-icon" />
            <span>{locale === "ar" ? "العودة إلى الموقع" : "Back to site"}</span>
          </Link>
          <span className="w-terms-strip-tag">
            {locale === "ar" ? "الشروط والسياسات" : "Terms & Policies"}
          </span>
        </div>
      </div>

      {/* Hero */}
      <header className="w-terms-hero">
        <div className="w-container w-terms-hero-inner">
          <div className="w-terms-hero-text">
            <span className="w-eyebrow w-terms-hero-eyebrow">{ui.eyebrow}</span>
            <h1 className="w-terms-hero-title">{ui.title}</h1>
            <p className="w-terms-hero-lead">{ui.lead}</p>
         
          </div>
          <div className="w-terms-hero-tools">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Content shell — sticky TOC + sections */}
      <div className="w-container w-terms-shell">
        {/* Table of contents */}
        <aside className="w-terms-toc" aria-label={ui.onThisPage}>
          <div className="w-terms-toc-inner">
            <div className="w-terms-toc-label">{ui.onThisPage}</div>
            <nav>
              <ul>
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeId === section.id;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={
                          "w-terms-toc-link" + (isActive ? " is-active" : "")
                        }
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span className="w-terms-toc-icon">
                          <Icon size={16} />
                        </span>
                        <span>{locale === "ar" ? section.titleAr : section.titleEn}</span>
                        <ChevronRight
                          size={14}
                          className="w-terms-toc-chev"
                          style={rtl ? { transform: "rotate(180deg)" } : undefined}
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Sections */}
        <article className="w-terms-content">
          {SECTIONS.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              locale={locale}
            />
          ))}

          {/* Contact CTA */}
          <div className="w-terms-contact-card">
            <div className="w-terms-contact-text">
              <h3>
                {locale === "ar"
                  ? "هل لديك سؤال إضافي؟"
                  : "Still have a question?"}
              </h3>
              <p>
                {locale === "ar"
                  ? "فريق الدعم متاح لخدمتكم لأي توضيح بخصوص الطلبات أو الخصوصية أو الخدمة."
                  : "Our support team is here to clarify anything about orders, privacy, or service."}
              </p>
            </div>
            <div className="w-terms-contact-actions">
              <a
                href="mailto:hello@sandobox.com"
                className="w-terms-btn w-terms-btn-primary"
              >
                <Mail size={16} />
                <span>{ui.contactCta}</span>
              </a>
              <a href="tel:+201000000000" className="w-terms-btn w-terms-btn-ghost">
                <Phone size={16} />
                <span dir="ltr">{ui.callCta}</span>
              </a>
            </div>
          </div>

          <div className="w-terms-foot">
            <a href="#top" className="w-terms-back-top">
              {ui.backToTop}
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}

// -------------------------------------------------------------
// Section card
// -------------------------------------------------------------

function SectionCard({
  section,
  index,
  locale,
}: {
  section: PolicySection;
  index: number;
  locale: "en" | "ar";
}) {
  const Icon = section.icon;
  const title = locale === "ar" ? section.titleAr : section.titleEn;

  return (
    <section id={section.id} className="w-terms-section">
      <header className="w-terms-section-head">
        <span className="w-terms-section-num">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="w-terms-section-icon" aria-hidden>
          <Icon size={20} />
        </span>
        <h2 className="w-terms-section-title">{title}</h2>
      </header>

      <div className="w-terms-section-body">
        {section.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function BlockRenderer({
  block,
  locale,
}: {
  block: Block;
  locale: "en" | "ar";
}) {
  if (block.kind === "p") {
    return <p className="w-terms-p">{locale === "ar" ? block.ar : block.en}</p>;
  }
  if (block.kind === "subheading") {
    return (
      <h3 className="w-terms-subheading">
        {locale === "ar" ? block.ar : block.en}
      </h3>
    );
  }
  const items = locale === "ar" ? block.ar : block.en;
  return (
    <ul className="w-terms-list">
      {items.map((item, i) => (
        <li key={i}>
          <span className="w-terms-bullet" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// -------------------------------------------------------------
// Active-section observer for the sticky TOC
// -------------------------------------------------------------

function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const ratios = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.current.set(entry.target.id, entry.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setActive(bestId);
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

// -------------------------------------------------------------
// Scoped styles. Kept in this file to honor the "one file" delivery,
// and prefixed `w-terms-*` so they cannot leak into the rest of the
// website module or the POS app.
// -------------------------------------------------------------

function PageStyles() {
  return (
    <style>{`
      /* =====================================================
         Terms & Policies — document-grade typography.
         The website module's brand fonts (Trebuchet/BiscuitGlitch)
         are intentionally overridden here: legal copy needs to
         read clean and serious, not playful.
         ===================================================== */

      .w-terms-page {
        --tp-ink: #0a0d12;
        --tp-ink-soft: #2c3038;
        --tp-muted: #6b7280;
        --tp-line: #ececec;
        --tp-line-strong: #d8d8d1;
        --tp-bg: #ffffff;
        --tp-bg-soft: #fafafa;
        --tp-bg-paper: #fcfcfb;
        --tp-accent: var(--w-primary);
        --tp-accent-2: #ff6b55;
        --tp-accent-soft: rgba(232, 51, 42, 0.08);
        --tp-accent-tint: rgba(232, 51, 42, 0.04);
        --tp-radius: 16px;
        --tp-radius-lg: 24px;
        --tp-shadow-sm: 0 1px 2px rgba(10,13,18,0.04), 0 1px 3px rgba(10,13,18,0.04);
        --tp-shadow-md: 0 4px 14px -4px rgba(10,13,18,0.08), 0 2px 6px rgba(10,13,18,0.04);
        --tp-shadow-lg: 0 24px 60px -20px rgba(10,13,18,0.18);

        --tp-font-sans: "Inter", "Segoe UI Variable Text", "Segoe UI",
          ui-sans-serif, system-ui, -apple-system, Roboto,
          "Helvetica Neue", Arial, sans-serif;
        --tp-font-serif: "Iowan Old Style", "Palatino Linotype", Palatino,
          "Source Serif Pro", Georgia, "Times New Roman", serif;

        background: var(--tp-bg);
        color: var(--tp-ink);
        min-height: 100vh;
        font-size: 16px;
        line-height: 1.7;
        -webkit-font-smoothing: antialiased;
        scroll-behavior: smooth;
      }

      /* Font override — beats globals.css \`html[lang="en"] .w-scope *\`
         which forces 'Biscuit' on every descendant with !important.
         Same specificity (1 attr + 1 class + 1 universal), declared later
         in source order so this rule wins the cascade. */
      html[lang="en"] .w-terms-page,
      html[lang="en"] .w-terms-page *,
      html[lang="en"] .w-terms-page *::before,
      html[lang="en"] .w-terms-page *::after {
        font-family: var(--tp-font-sans) !important;
        letter-spacing: 0 !important;
      }
      html[lang="en"] .w-terms-page :is(h1, h2, h3, h4) {
        font-family: var(--tp-font-serif) !important;
        font-weight: 600;
        letter-spacing: -0.012em !important;
      }
      html[lang="ar"] .w-terms-page,
      html[lang="ar"] .w-terms-page *,
      html[dir="rtl"] .w-terms-page,
      html[dir="rtl"] .w-terms-page * {
        font-family: 'NotoArabic', "Segoe UI", Tahoma, Arial, sans-serif !important;
      }
      /* Restore the brand display face for the small back-strip tag only */
      html[lang="en"] .w-terms-strip-tag {
        font-family: var(--w-font-brand) !important;
      }

      /* ---------- Brand strip ---------- */
      .w-terms-strip {
        background: #0e0e0e;
        color: #fff;
        font-size: 0.78rem;
      }
      .w-terms-strip-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding-block: 0.55rem;
      }
      .w-terms-backlink {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        color: rgba(255,255,255,0.85);
        text-decoration: none;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition: color 160ms ease;
      }
      .w-terms-backlink:hover { color: #fff; }
      .w-terms-backlink-icon { transition: transform 160ms ease; }
      .w-terms-backlink:hover .w-terms-backlink-icon { transform: translateX(-3px); }
      .w-scope[dir="rtl"] .w-terms-backlink-icon { transform: scaleX(-1); }
      .w-scope[dir="rtl"] .w-terms-backlink:hover .w-terms-backlink-icon {
        transform: scaleX(-1) translateX(-3px);
      }
      .w-terms-strip-tag {
        font-family: var(--w-font-brand);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.78rem;
        color: rgba(255,255,255,0.85);
      }

      /* ---------- Hero ---------- */
      .w-terms-hero {
        position: relative;
        background: linear-gradient(180deg, #fff 0%, var(--tp-bg-paper) 100%);
        border-bottom: 1px solid var(--tp-line);
        padding-block: clamp(3.5rem, 8vw, 6rem) clamp(2.25rem, 5vw, 4rem);
        overflow: hidden;
      }
      .w-terms-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(900px 320px at 92% -10%, rgba(232,51,42,0.10), transparent 55%),
          radial-gradient(700px 260px at -10% 110%, rgba(10,13,18,0.05), transparent 60%);
        pointer-events: none;
      }
      .w-terms-hero::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(circle at 1px 1px, rgba(10,13,18,0.05) 1px, transparent 0);
        background-size: 28px 28px;
        opacity: 0.45;
        mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
        pointer-events: none;
      }
      .w-terms-hero-inner {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 2rem;
        flex-wrap: wrap;
      }
      .w-terms-hero-text { max-width: 720px; }
      .w-terms-hero-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.18em !important;
        text-transform: uppercase;
        color: var(--tp-accent);
        margin-bottom: 1.1rem;
        padding: 0.35rem 0.75rem;
        background: var(--tp-accent-soft);
        border-radius: 999px;
      }
      .w-terms-hero-eyebrow::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--tp-accent);
        box-shadow: 0 0 0 4px rgba(232,51,42,0.15);
        display: inline-block;
      }
      .w-terms-hero-title {
        font-size: clamp(2.5rem, 5.2vw, 3.9rem);
        line-height: 1.05;
        font-weight: 600;
        letter-spacing: -0.025em !important;
        margin: 0 0 1rem;
        color: var(--tp-ink);
        background: linear-gradient(180deg, var(--tp-ink) 0%, #2a2f3a 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .w-terms-hero-lead {
        font-size: 1.075rem;
        line-height: 1.65;
        color: var(--tp-muted);
        margin: 0 0 1.6rem;
        max-width: 58ch;
      }
      .w-terms-updated {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--tp-muted);
        background: rgba(255,255,255,0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        padding: 0.45rem 0.9rem;
        border: 1px solid var(--tp-line);
        border-radius: 999px;
        margin: 0;
        box-shadow: var(--tp-shadow-sm);
      }
      .w-terms-hero-tools { flex-shrink: 0; }

      /* ---------- Shell ---------- */
      .w-terms-shell {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: clamp(2rem, 5vw, 4.5rem);
        padding-block: clamp(2.5rem, 5vw, 4.5rem);
        align-items: start;
      }
      @media (max-width: 980px) {
        .w-terms-shell { grid-template-columns: 1fr; gap: 1.5rem; }
      }

      /* ---------- TOC ---------- */
      .w-terms-toc {
        position: sticky;
        top: 1.75rem;
        align-self: start;
      }
      @media (max-width: 980px) {
        .w-terms-toc { position: relative; top: auto; }
      }
      .w-terms-toc-inner {
        background: linear-gradient(180deg, #fff 0%, var(--tp-bg-soft) 100%);
        border: 1px solid var(--tp-line);
        border-radius: var(--tp-radius);
        padding: 1.25rem 0.85rem 1rem;
        box-shadow: var(--tp-shadow-sm);
      }
      .w-terms-toc-label {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.18em !important;
        text-transform: uppercase;
        color: var(--tp-muted);
        padding: 0 0.65rem 0.9rem;
        border-bottom: 1px solid var(--tp-line);
        margin-bottom: 0.4rem;
      }
      .w-terms-toc nav ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .w-terms-toc nav { counter-reset: tp-toc; }
      .w-terms-toc nav li { counter-increment: tp-toc; }
      .w-terms-toc-link {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.6rem 0.65rem 0.6rem 0.85rem;
        border-radius: 10px;
        color: var(--tp-ink-soft);
        text-decoration: none;
        font-size: 0.9rem;
        line-height: 1.35;
        transition: background 200ms cubic-bezier(0.2,0.8,0.2,1),
                    color 200ms cubic-bezier(0.2,0.8,0.2,1),
                    transform 200ms cubic-bezier(0.2,0.8,0.2,1);
      }
      .w-scope[dir="rtl"] .w-terms-toc-link {
        padding: 0.6rem 0.85rem 0.6rem 0.65rem;
      }
      .w-terms-toc-link::before {
        content: counter(tp-toc, decimal-leading-zero);
        font-family: var(--tp-font-serif) !important;
        font-feature-settings: "tnum";
        font-size: 0.78rem;
        color: var(--tp-muted);
        font-weight: 500;
        min-width: 1.6rem;
        transition: color 200ms ease;
      }
      .w-terms-toc-link > .w-terms-toc-icon { display: none; }
      .w-terms-toc-link:hover {
        background: rgba(10,13,18,0.04);
        color: var(--tp-ink);
      }
      .w-terms-toc-link:hover::before { color: var(--tp-ink); }
      .w-terms-toc-link.is-active {
        background: linear-gradient(180deg, var(--tp-accent-soft), var(--tp-accent-tint));
        color: var(--tp-accent);
        font-weight: 600;
      }
      .w-terms-toc-link.is-active::before {
        color: var(--tp-accent);
        font-weight: 600;
      }
      .w-terms-toc-link.is-active::after {
        content: "";
        position: absolute;
        inset-inline-start: 0;
        top: 22%;
        bottom: 22%;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: linear-gradient(180deg, var(--tp-accent), var(--tp-accent-2));
      }
      .w-scope[dir="rtl"] .w-terms-toc-link.is-active::after {
        border-radius: 3px 0 0 3px;
      }
      .w-terms-toc-chev {
        margin-inline-start: auto;
        opacity: 0;
        transform: translateX(-3px);
        transition: opacity 200ms ease, transform 200ms ease;
      }
      .w-terms-toc-link.is-active .w-terms-toc-chev,
      .w-terms-toc-link:hover .w-terms-toc-chev {
        opacity: 0.7;
        transform: translateX(0);
      }

      /* ---------- Content ---------- */
      .w-terms-content {
        min-width: 0;
        max-width: 760px;
        display: flex;
        flex-direction: column;
        gap: clamp(1.5rem, 3vw, 2.25rem);
      }

      .w-terms-section {
        position: relative;
        background: var(--tp-bg);
        border: 1px solid var(--tp-line);
        border-radius: var(--tp-radius);
        padding: clamp(1.75rem, 3.2vw, 2.5rem) clamp(1.5rem, 3vw, 2.5rem);
        scroll-margin-top: 5rem;
        box-shadow: var(--tp-shadow-sm);
        transition: box-shadow 280ms cubic-bezier(0.2,0.8,0.2,1),
                    border-color 280ms cubic-bezier(0.2,0.8,0.2,1),
                    transform 280ms cubic-bezier(0.2,0.8,0.2,1);
      }
      .w-terms-section:hover {
        box-shadow: var(--tp-shadow-md);
        border-color: rgba(10,13,18,0.10);
      }
      .w-terms-section-head {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding-bottom: 1.1rem;
        border-bottom: 1px solid var(--tp-line);
        margin-bottom: 1.5rem;
      }
      .w-terms-section-num {
        font-family: var(--tp-font-serif) !important;
        font-size: 1.2rem;
        font-weight: 500;
        letter-spacing: 0.04em !important;
        color: var(--tp-muted);
        font-feature-settings: "tnum";
        min-width: 2ch;
      }
      .w-terms-section-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--tp-accent-soft), var(--tp-accent-tint));
        color: var(--tp-accent);
        flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(232,51,42,0.12);
      }
      .w-terms-section-title {
        font-size: clamp(1.3rem, 2.3vw, 1.6rem);
        font-weight: 600;
        line-height: 1.2;
        margin: 0;
        letter-spacing: -0.012em !important;
        color: var(--tp-ink);
      }
      .w-terms-section-body {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .w-terms-p {
        font-size: 0.98rem;
        line-height: 1.72;
        color: var(--tp-ink-soft);
        margin: 0;
      }
      .w-terms-subheading {
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--tp-ink);
        margin: 0.6rem 0 -0.2rem;
        line-height: 1.3;
      }
      .w-terms-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .w-terms-list li {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
        font-size: 0.98rem;
        line-height: 1.7;
        color: var(--tp-ink-soft);
        padding-inline-start: 0.25rem;
      }
      .w-terms-bullet {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--tp-accent), var(--tp-accent-2));
        margin-top: 0.65em;
        flex-shrink: 0;
        box-shadow: 0 0 0 3px var(--tp-accent-soft);
      }

      /* ---------- Contact CTA ---------- */
      .w-terms-contact-card {
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(700px 280px at 100% 0%, rgba(232,51,42,0.22), transparent 60%),
          radial-gradient(500px 200px at 0% 120%, rgba(255,107,85,0.16), transparent 60%),
          linear-gradient(135deg, #15171c 0%, var(--tp-ink) 100%);
        color: #fff;
        border-radius: var(--tp-radius-lg);
        padding: clamp(2rem, 4vw, 2.75rem);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
        flex-wrap: wrap;
        box-shadow: var(--tp-shadow-lg);
      }
      .w-terms-contact-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);
        background-size: 22px 22px;
        opacity: 0.6;
        pointer-events: none;
      }
      .w-terms-contact-text { position: relative; }
      .w-terms-contact-actions { position: relative; }
      .w-terms-page .w-terms-contact-text h3 {
        margin: 0 0 0.55rem;
        font-size: clamp(1.3rem, 2.3vw, 1.65rem);
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.012em !important;
        color: #fff;
      }
      .w-terms-contact-text p {
        margin: 0;
        color: rgba(255,255,255,0.74);
        font-size: 0.98rem;
        line-height: 1.65;
        max-width: 52ch;
      }
      .w-terms-contact-actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
      .w-terms-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.78rem 1.2rem;
        border-radius: 999px;
        font-size: 0.92rem;
        font-weight: 600;
        text-decoration: none;
        border: 1px solid transparent;
        transition: transform 220ms cubic-bezier(0.2,0.8,0.2,1),
                    background 220ms ease, color 220ms ease,
                    border-color 220ms ease, box-shadow 220ms ease;
      }
      .w-terms-btn:hover { transform: translateY(-2px); }
      .w-terms-btn-primary {
        background: linear-gradient(135deg, var(--tp-accent), var(--tp-accent-2));
        color: #fff;
        box-shadow: 0 8px 22px -8px rgba(232,51,42,0.55);
      }
      .w-terms-btn-primary:hover {
        box-shadow: 0 12px 28px -8px rgba(232,51,42,0.7);
      }
      .w-terms-btn-ghost {
        background: rgba(255,255,255,0.06);
        color: #fff;
        border-color: rgba(255,255,255,0.18);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .w-terms-btn-ghost:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.45);
      }

      /* ---------- Foot ---------- */
      .w-terms-foot {
        display: flex;
        justify-content: center;
        padding-top: 0.5rem;
      }
      .w-terms-back-top {
        font-size: 0.83rem;
        color: var(--tp-muted);
        text-decoration: none;
        border-bottom: 1px solid var(--tp-line);
        padding: 0 0 2px;
        transition: color 160ms ease, border-color 160ms ease;
      }
      .w-terms-back-top:hover {
        color: var(--tp-ink);
        border-color: var(--tp-ink);
      }

      .w-scope[dir="rtl"] .w-terms-toc-link { text-align: right; }
    `}</style>
  );
}
