"use client";

import React from "react";
import { useReveal } from "@/app/website/hooks/useReveal";

interface SectionWrapperProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  size?: "default" | "sm";
  background?: "white" | "cream" | "dark";
  reveal?: boolean;
  stagger?: boolean;
}

// One container for every section so spacing, width, and entrance
// animation stay consistent across the whole page.
export default function SectionWrapper({
  id,
  className = "",
  children,
  size = "default",
  background = "white",
  reveal = true,
  stagger = false,
}: SectionWrapperProps) {
  const [ref, visible] = useReveal<HTMLDivElement>();

  const bgStyle =
    background === "cream"
      ? { background: "var(--w-bg-alt)" }
      : background === "dark"
      ? { background: "var(--w-bg-dark)", color: "#fff" }
      : undefined;

  const classes = [
    size === "sm" ? "w-section-sm" : "w-section",
    reveal ? "w-reveal" : "",
    stagger ? "w-stagger" : "",
    visible && reveal ? "is-visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section id={id} ref={ref} className={classes} style={bgStyle}>
      <div className="w-container">{children}</div>
    </section>
  );
}
