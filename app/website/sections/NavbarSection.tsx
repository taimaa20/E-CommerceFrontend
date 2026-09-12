"use client";

import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import BrandMark from "@/app/website/components/BrandMark";
import LanguageSwitcher from "@/app/website/components/LanguageSwitcher";
import { useOffers } from "@/app/website/hooks/useOffers";
import { useScrollPosition } from "@/app/website/hooks/useScrollPosition";
import { pick, useWebsiteLocale } from "@/app/website/hooks/useWebsiteLocale";
import type { BrandInfo } from "@/app/website/types";
import { useRouter } from "next/navigation";
interface NavLink {
  id: string;
  label: string;
  labelAr: string;
   path?: string;
}

const NAV_LINKS: NavLink[] = [
  { id: "about", label: "About", labelAr: "من نحن" },
  { id: "menu", label: "Menu", labelAr: "القائمة", path: "/shop"  },
  { id: "offers", label: "Offers", labelAr: "العروض" },
  { id: "gallery", label: "Gallery", labelAr: "المعرض" },
  { id: "contact", label: "Contact", labelAr: "تواصل" },
];

interface NavbarSectionProps {
  brand: BrandInfo;
}
export default function NavbarSection({ brand }: NavbarSectionProps) {

  const { locale } = useWebsiteLocale();
  const { offers } = useOffers();
  const scrolled = useScrollPosition(40);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navLinks = offers.length > 0
    ? NAV_LINKS
    : NAV_LINKS.filter((link) => link.id !== "offers");
const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const scrollTo = (id: string) => {
    setDrawerOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const brandName = pick(brand, "name", locale);

  return (
    <>
      <header className={`w-nav ${scrolled ? "w-nav--solid" : "w-nav--transparent"}`}>
        <div className="w-container w-nav-inner">
          <button
            type="button"
            onClick={() => scrollTo("top")}
            className="w-nav-brand"
            aria-label={brandName as string}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <BrandMark size={50} variant={scrolled ? "wordmark" : "wordmark-dark"} />
          </button>

          <nav aria-label="Primary">
            <ul className="w-nav-links">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    className="w-nav-link"
                   onClick={() => {
  if (link.path) {
    router.push(link.path);
    setDrawerOpen(false);
  } else {
    scrollTo(link.id);
  }
}}
                  >
                    {pick(link, "label", locale)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="w-nav-right">
            <LanguageSwitcher />
            <button
              type="button"
              className="w-nav-toggle"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`w-nav-drawer ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      >
        <aside
          className="w-nav-drawer-panel"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <div className="w-nav-brand" style={{ color: "var(--w-ink)" }}>
              <BrandMark size={38} variant="wordmark" />
            </div>
            <button
              type="button"
              className="w-nav-toggle"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              style={{ display: "inline-flex" }}
            >
              <X size={22} />
            </button>
          </div>
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              className="w-nav-drawer-link"
             onClick={() => {
  if (link.path) {
    router.push(link.path);
    setDrawerOpen(false);
  } else {
    scrollTo(link.id);
  }
}}
            >
              {pick(link, "label", locale)}
            </button>
          ))}
          <div style={{ marginTop: "1.25rem" }}>
            <LanguageSwitcher />
          </div>
        </aside>
      </div>
    </>
  );
}
