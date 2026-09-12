"use client";

import React from "react";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import SectionWrapper from "@/app/website/components/SectionWrapper";
import TitleBlock from "@/app/website/components/TitleBlock";
import type { ContactInfo } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

interface ContactSectionProps {
  contact: ContactInfo;
}

export default function ContactSection({ contact }: ContactSectionProps) {
  const { locale } = useWebsiteLocale();
  const labels = {
    address: locale === "ar" ? "العنوان" : "Address",
    phone: locale === "ar" ? "تواصل" : "Call Us",
    email: locale === "ar" ? "البريد" : "Email",
    hours: locale === "ar" ? "مواعيد العمل" : "Hours",
  };

  return (
    <SectionWrapper id="contact">
      <TitleBlock
        eyebrow={locale === "ar" ? "تواصل معنا" : "Visit Us"}
        title={locale === "ar" ? "نحن في انتظارك." : "We'd love to see you."}
        description={
          locale === "ar"
            ? "مرّ علينا أو اتصل بنا. طعامنا أطعم عندما نُحضره لك شخصيًا."
            : "Drop by, give us a ring, or say hi online — we're always around."
        }
      />

      <div className="w-contact-grid">
        <div className="w-contact-card">
          <div className="w-contact-row">
            <span className="w-contact-row-icon">
              <MapPin size={18} />
            </span>
            <div>
              <div className="w-contact-row-label">{labels.address}</div>
              <div className="w-contact-row-value">{pick(contact, "address", locale)}</div>
            </div>
          </div>

          <div className="w-contact-row">
            <span className="w-contact-row-icon">
              <Phone size={18} />
            </span>
            <div>
              <div className="w-contact-row-label">{labels.phone}</div>
              <div className="w-contact-row-value">
                {contact.phones.map((p) => (
                  <a key={p} href={`tel:${p.replace(/\s/g, "")}`} dir="ltr">
                    {p}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="w-contact-row">
            <span className="w-contact-row-icon">
              <Mail size={18} />
            </span>
            <div>
              <div className="w-contact-row-label">{labels.email}</div>
              <div className="w-contact-row-value">
                <a href={`mailto:${contact.email}`} dir="ltr">
                  {contact.email}
                </a>
              </div>
            </div>
          </div>

          <div className="w-contact-row">
            <span className="w-contact-row-icon">
              <Clock size={18} />
            </span>
            <div>
              <div className="w-contact-row-label">{labels.hours}</div>
              <div className="w-contact-row-value">
                {contact.hours.map((h, i) => (
                  <div
                    key={i}
                    style={{ fontWeight: 500, fontSize: "0.95rem", marginBottom: "0.2rem" }}
                  >
                    <span style={{ color: "var(--w-muted)" }}>
                      {pick(h, "days", locale)}
                    </span>
                    {"  ·  "}
                    <span dir="ltr">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-map-frame">
          <iframe
            src={contact.mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Sando Box location"
            allowFullScreen
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
