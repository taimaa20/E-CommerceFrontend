"use client";

import React, { useState } from "react";

interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

// Native lazy-loaded <img> with an automatic gradient fallback when
// the source is missing or fails to load. We avoid next/image here
// because item images come from multiple remote hosts that we do not
// want to enumerate in next.config.mjs.
export default function SmartImage({ src, alt, className, style }: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <>
      {showImage ? (
        <img
          src={src as string}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={className}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            ...style,
          }}
        />
      ) : (
        <div
          aria-hidden
          className={className}
          style={{
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, var(--w-primary-soft) 0%, var(--w-accent) 50%, #ffe9cd 100%)",
            position: "relative",
            ...style,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 30% 30%, rgba(232, 51, 42, 0.25), transparent 55%), radial-gradient(circle at 70% 70%, rgba(17, 17, 17, 0.18), transparent 55%)",
            }}
          />
        </div>
      )}
    </>
  );
}
