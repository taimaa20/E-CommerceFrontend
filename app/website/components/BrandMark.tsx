"use client";

import React from "react";
import Image from "next/image";

interface BrandMarkProps {
  size?: number;
  variant?: "mark" | "wordmark" | "wordmark-dark";
}

// Responsive height via clamp() — desktop large, tablet medium, mobile reduced.
// Width stays auto so the wordmark never distorts.
export default function BrandMark({ size = 36, variant = "mark" }: BrandMarkProps) {
  if (variant === "wordmark") {
    return (
      <Image
        src="/website/brand/logo-wordmark.png"
        alt="Sando Box"
         width={670}
        height={425}
        priority
        unoptimized
        style={{
          height: `clamp(${Math.round(size * 0.9)}px, 6vw, ${Math.round(size * 1.4)}px)`,
          width: "auto",
          objectFit: "contain",
          maxHeight: "72px",
        }}
      />
    );
  }

  if (variant === "wordmark-dark") {
    return (
      <Image
        src="/website/brand/logo-wordmark-dark.jpg"
        alt="Sando Box"
        width={670}
        height={425}
        priority
        unoptimized
     style={{
          height: `clamp(${Math.round(size * 0.9)}px, 6vw, ${Math.round(size * 1.4)}px)`,
          width: "auto",
          objectFit: "contain",
          maxHeight: "72px",
        }}
      />
    );
  }

  return (
    <Image
      src="/website/brand/logo-mark.png"
      alt="Sando Box"
      width={125}
      height={125}
      priority
      unoptimized
      style={{
        width: `clamp(${Math.round(size * 0.85)}px, 5vw, ${Math.round(size * 1.25)}px)`,
        height: "auto",
        objectFit: "contain",
      }}
    />
  );
}
