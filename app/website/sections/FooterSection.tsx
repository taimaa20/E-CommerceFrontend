"use client";

import React from "react";
import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";
import BrandMark from "@/app/website/components/BrandMark";
import { useOffers } from "@/app/website/hooks/useOffers";
import type { BrandInfo, ContactInfo } from "@/app/website/types";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";

interface FooterSectionProps {
  brand: BrandInfo;
  contact: ContactInfo;
}

const NAV_LINKS = [
  { id: "about", label: "About", labelAr: "من نحن" },
  { id: "menu", label: "Menu", labelAr: "القائمة" },
  { id: "offers", label: "Offers", labelAr: "العروض" },
  { id: "gallery", label: "Gallery", labelAr: "المعرض" },
  { id: "contact", label: "Contact", labelAr: "تواصل" },
];

export default function FooterSection({ brand, contact }: FooterSectionProps) {
  const { locale } = useWebsiteLocale();
  const { offers } = useOffers();
  const navLinks = offers.length > 0
    ? NAV_LINKS
    : NAV_LINKS.filter((link) => link.id !== "offers");

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const brandName = pick(brand, "name", locale);
  const tagline = pick(brand, "tagline", locale);

  return (
    <footer className="w-footer">
      <div className="w-container">
        <div className="w-footer-top">
          <div>
            <div className="w-footer-brand">
              <BrandMark size={44} variant="wordmark-dark" />
            </div>
            <p className="w-footer-copy">{tagline}</p>
            <div className="w-footer-social" aria-label="Social links">
              {contact.social.instagram ? (
                <a href={contact.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
              ) : null}
              {contact.social.facebook ? (
                <a href={contact.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
              ) : null}
              {contact.social.tiktok ? (
                <a href={contact.social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
                  <span style={{ fontWeight: 800, fontSize: 14 }}>TT</span>
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <div className="w-footer-title">{locale === "ar" ? "روابط" : "Explore"}</div>
            <ul className="w-footer-list">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button type="button" onClick={() => scrollTo(link.id)}>
                    {pick(link, "label", locale)}
                  </button>
                </li>
              ))}
              <li>
                <Link href="/terms">
                  {locale === "ar" ? "الشروط والسياسات" : "Terms & Policies"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="w-footer-title">{locale === "ar" ? "تواصل" : "Contact"}</div>
            <ul className="w-footer-list">
              {contact.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:${p.replace(/\s/g, "")}`} dir="ltr">
                    {p}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${contact.email}`} dir="ltr">
                  {contact.email}
                </a>
              </li>
              <li style={{ color: "rgba(255,255,255,0.55)" }}>
                {pick(contact, "address", locale)}
              </li>
            </ul>
          </div>
        </div>

        <div className="w-footer-bottom">
          <div>
            © {new Date().getFullYear()} {brandName}.{" "}
            {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </div>
          <div>{locale === "ar" ? "مصنوع بحب في مصر." : "Crafted with love in Egypt."}</div>
        </div>
      </div>
    </footer>
  );
}
