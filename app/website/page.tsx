"use client";

import React, { useEffect, useState } from "react";
import { restaurantService } from "@/app/website/services/restaurant.service";
import type { RestaurantInfo } from "@/app/website/types";

import NavbarSection from "@/app/website/sections/NavbarSection";
import HeroSection from "@/app/website/sections/HeroSection";
import AboutSection from "@/app/website/sections/AboutSection";
import MenuSection from "@/app/website/sections/MenuSection";
import OffersSection from "@/app/website/sections/OffersSection";
import ExperienceSection from "@/app/website/sections/ExperienceSection";
import GallerySection from "@/app/website/sections/GallerySection";
import ContactSection from "@/app/website/sections/ContactSection";
import FooterSection from "@/app/website/sections/FooterSection";

export default function WebsitePage() {
  const [info, setInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    let alive = true;
    restaurantService.getRestaurantInfo().then((data) => {
      if (alive) setInfo(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!info) {
    // Lightweight first paint — matches the hero background so there is
    // no flash-of-white during the async resolve. When the service becomes
    // a real API call, this is where a skeleton would go.
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "rgba(255,255,255,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.85rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        Sando Box
      </div>
    );
  }

  return (
    <main>
      <NavbarSection brand={info.brand} />
      <HeroSection hero={info.hero} />
      <AboutSection about={info.about} />
      <MenuSection />
      <OffersSection />
      <ExperienceSection experience={info.experience} />
      <GallerySection gallery={info.gallery} />
      <ContactSection contact={info.contact} />
      <FooterSection brand={info.brand} contact={info.contact} />
    </main>
  );
}
