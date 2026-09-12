"use client";

import React from "react";

interface TitleBlockProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  tone?: "light" | "dark";
}

// Small heading + eyebrow + subtitle — used at the top of every section.
export default function TitleBlock({
  eyebrow,
  title,
  description,
  align = "start",
  tone = "dark",
}: TitleBlockProps) {
  const color = tone === "light" ? "#fff" : "var(--w-ink)";
  const mutedColor =
    tone === "light" ? "rgba(255,255,255,0.7)" : "var(--w-muted)";

  return (
    <div
      style={{
        textAlign: align === "center" ? "center" : "start",
        maxWidth: align === "center" ? "720px" : undefined,
        marginInline: align === "center" ? "auto" : undefined,
      }}
    >
      {eyebrow ? <div className="w-eyebrow">{eyebrow}</div> : null}
      <h2
        className="w-h1"
        style={{ marginTop: eyebrow ? "1rem" : 0, color }}
      >
        {title}
      </h2>
      {description ? (
        <p
          className="w-body"
          style={{ marginTop: "1.25rem", maxWidth: "60ch", color: mutedColor }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
