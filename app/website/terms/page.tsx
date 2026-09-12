"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
        en: "All payments made through our system are final.",
        ar: "جميع المدفوعات نهائية.",
      },
      {
        kind: "list",
        en: [
          "We do not offer refunds once an order is confirmed and processed.",
          "In case of service issues, quality concerns, or disputes, please contact our support team.",
          "Any compensation (if applicable) will be evaluated internally based on the situation.",
        ],
        ar: [
          "لا يمكن استرجاع المبالغ بعد تأكيد الطلب.",
          "في حال وجود مشكلة في الخدمة أو الجودة، يرجى التواصل مع الدعم.",
          "أي تعويض يتم بناءً على تقييم الحالة.",
        ],
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
        en: "We respect your privacy and are committed to protecting your personal data.",
        ar: "نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم.",
      },
      { kind: "subheading", en: "We may collect:", ar: "قد نقوم بجمع:" },
      {
        kind: "list",
        en: ["Full name", "Phone number", "Email address", "Order history and preferences"],
        ar: ["الاسم", "رقم الهاتف", "البريد الإلكتروني", "سجل الطلبات"],
      },
      { kind: "subheading", en: "We use this data to:", ar: "نستخدم هذه البيانات من أجل:" },
      {
        kind: "list",
        en: ["Process and manage orders", "Improve our services", "Communicate with customers"],
        ar: ["تنفيذ الطلبات", "تحسين الخدمات", "التواصل مع العملاء"],
      },
      { kind: "subheading", en: "We do NOT:", ar: "نحن لا:" },
      {
        kind: "list",
        en: [
          "Sell your data",
          "Share your data with third parties without consent (except when required by law)",
        ],
        ar: ["نبيع بياناتكم", "نشاركها دون إذن (إلا في الحالات القانونية)"],
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
        en: "We do not provide physical shipping services.",
        ar: "لا نقدم خدمات شحن.",
      },
      { kind: "subheading", en: "Our services include:", ar: "الخدمات تشمل:" },
      {
        kind: "list",
        en: ["Dine-in", "Takeaway", "On-site service"],
        ar: ["داخل المطعم", "استلام", "خدمات مباشرة"],
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
              <h3 style={{ color: "white" }}>
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
      .w-terms-page {
        background: var(--w-bg);
        color: var(--w-ink);
        min-height: 100vh;
      }

      /* Hero */
      .w-terms-hero {
        background:
          radial-gradient(circle at 90% 0%, rgba(232,51,42,0.10), transparent 55%),
          var(--w-bg-alt);
        border-bottom: 1px solid var(--w-line);
        padding-block: clamp(3.5rem, 8vw, 6rem) clamp(2.5rem, 6vw, 4rem);
      }
      .w-terms-hero-inner {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--w-sp-5);
        flex-wrap: wrap;
      }
      .w-terms-hero-text { max-width: 720px; }
      .w-terms-hero-eyebrow {
        color: var(--w-primary);
        display: inline-block;
        margin-bottom: var(--w-sp-3);
      }
      .w-terms-hero-title {
        font-size: clamp(2rem, 5vw, 3.5rem);
        line-height: var(--w-heading-line);
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0 0 var(--w-sp-3);
        color: var(--w-ink);
      }
      .w-terms-hero-lead {
        font-size: var(--w-text-md);
        line-height: var(--w-body-line);
        color: var(--w-muted);
        margin: 0 0 var(--w-sp-4);
        max-width: 60ch;
      }
      .w-terms-updated {
        display: inline-flex;
        align-items: center;
        gap: var(--w-sp-2);
        font-size: var(--w-text-sm);
        color: var(--w-muted);
        background: rgba(255,255,255,0.7);
        padding: 0.4rem 0.8rem;
        border: 1px solid var(--w-line);
        border-radius: var(--w-radius-pill);
        margin: 0;
      }
      .w-terms-hero-tools { flex-shrink: 0; }

      /* Layout shell */
      .w-terms-shell {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: clamp(2rem, 5vw, 4rem);
        padding-block: clamp(2.5rem, 5vw, 4.5rem);
        align-items: start;
      }
      @media (max-width: 900px) {
        .w-terms-shell {
          grid-template-columns: 1fr;
          gap: var(--w-sp-5);
        }
      }

      /* TOC */
      .w-terms-toc {
        position: sticky;
        top: clamp(1rem, 3vw, 2rem);
        align-self: start;
      }
      @media (max-width: 900px) {
        .w-terms-toc {
          position: relative;
          top: auto;
        }
      }
      .w-terms-toc-inner {
        background: var(--w-bg);
        border: 1px solid var(--w-line);
        border-radius: var(--w-radius-md);
        padding: var(--w-sp-4);
        box-shadow: var(--w-shadow-sm);
      }
      .w-terms-toc-label {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--w-muted);
        margin-bottom: var(--w-sp-3);
      }
      .w-terms-toc nav ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .w-terms-toc-link {
        display: flex;
        align-items: center;
        gap: var(--w-sp-2);
        padding: 0.55rem 0.7rem;
        border-radius: var(--w-radius-sm);
        color: var(--w-ink-soft);
        text-decoration: none;
        font-size: 0.92rem;
        line-height: 1.3;
        transition: background 160ms var(--w-ease), color 160ms var(--w-ease);
      }
      .w-terms-toc-link:hover {
        background: var(--w-bg-alt);
        color: var(--w-ink);
      }
      .w-terms-toc-link.is-active {
        background: var(--w-ink);
        color: #fff;
      }
      .w-terms-toc-link.is-active .w-terms-toc-icon {
        color: #fff;
      }
      .w-terms-toc-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--w-primary);
        flex-shrink: 0;
      }
      .w-terms-toc-chev {
        margin-inline-start: auto;
        opacity: 0;
        transition: opacity 160ms var(--w-ease);
      }
      .w-terms-toc-link.is-active .w-terms-toc-chev,
      .w-terms-toc-link:hover .w-terms-toc-chev {
        opacity: 0.7;
      }

      /* Content */
      .w-terms-content {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: clamp(1.5rem, 3vw, 2.25rem);
      }

      .w-terms-section {
        background: var(--w-bg);
        border: 1px solid var(--w-line);
        border-radius: var(--w-radius-lg);
        padding: clamp(1.5rem, 3vw, 2.25rem);
        scroll-margin-top: 6rem;
        box-shadow: var(--w-shadow-sm);
      }
      .w-terms-section-head {
        display: flex;
        align-items: center;
        gap: var(--w-sp-3);
        padding-bottom: var(--w-sp-3);
        border-bottom: 1px solid var(--w-line);
        margin-bottom: var(--w-sp-4);
      }
      .w-terms-section-num {
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--w-muted);
        font-feature-settings: "tnum";
      }
      .w-terms-section-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--w-radius-sm);
        background: var(--w-primary-soft);
        color: var(--w-primary);
        flex-shrink: 0;
      }
      .w-terms-section-title {
        font-size: clamp(1.25rem, 2.4vw, 1.6rem);
        font-weight: 700;
        line-height: var(--w-heading-line);
        margin: 0;
        color: var(--w-ink);
      }
      .w-terms-section-body {
        display: flex;
        flex-direction: column;
        gap: var(--w-sp-3);
      }
      .w-terms-p {
        font-size: var(--w-text-base);
        line-height: var(--w-body-line);
        color: var(--w-ink-soft);
        margin: 0;
      }
      .w-terms-subheading {
        font-size: var(--w-text-md);
        font-weight: 600;
        color: var(--w-ink);
        margin: var(--w-sp-2) 0 0;
        line-height: var(--w-heading-line);
      }
      .w-terms-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }
      .w-terms-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        font-size: var(--w-text-base);
        line-height: var(--w-body-line);
        color: var(--w-ink-soft);
      }
      .w-terms-bullet {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--w-primary);
        margin-top: 0.65em;
        flex-shrink: 0;
      }

      /* Contact CTA */
      .w-terms-contact-card {
        background: var(--w-ink);
        color: #fff;
        border-radius: var(--w-radius-lg);
        padding: clamp(1.75rem, 4vw, 2.5rem);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--w-sp-5);
        flex-wrap: wrap;
      }
      .w-terms-contact-text h3 {
        margin: 0 0 0.4rem;
        font-size: clamp(1.2rem, 2.4vw, 1.5rem);
        font-weight: 700;
        line-height: 1.2;
      }
      .w-terms-contact-text p {
        margin: 0;
        color: rgba(255,255,255,0.72);
        font-size: var(--w-text-base);
        line-height: var(--w-body-line);
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
        padding: 0.7rem 1.1rem;
        border-radius: var(--w-radius-pill);
        font-size: 0.92rem;
        font-weight: 600;
        text-decoration: none;
        border: 1px solid transparent;
        transition: transform 160ms var(--w-ease), background 160ms var(--w-ease),
          color 160ms var(--w-ease);
      }
      .w-terms-btn:hover { transform: translateY(-1px); }
      .w-terms-btn-primary {
        background: var(--w-primary);
        color: #fff;
      }
      .w-terms-btn-primary:hover { background: var(--w-primary-dark); }
      .w-terms-btn-ghost {
        background: transparent;
        color: #fff;
        border-color: rgba(255,255,255,0.25);
      }
      .w-terms-btn-ghost:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.5);
      }

      /* Footer */
      .w-terms-foot {
        display: flex;
        justify-content: center;
        padding-top: var(--w-sp-3);
      }
      .w-terms-back-top {
        font-size: 0.85rem;
        color: var(--w-muted);
        text-decoration: none;
        border-bottom: 1px dashed var(--w-line);
        padding-bottom: 2px;
      }
      .w-terms-back-top:hover { color: var(--w-ink); }

      /* RTL adjustments — flip arrows; everything else is logical-property safe */
      .w-scope[dir="rtl"] .w-terms-toc-link { text-align: right; }
    `}</style>
  );
}
