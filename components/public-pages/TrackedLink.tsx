"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

interface TrackedLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    platform: string;
    href: string;
    children: ReactNode;
}

const CLICK_ENDPOINT = "/api/api-proxy/followus/clicks";

export function TrackedLink({ platform, href, children, onClick, ...props }: TrackedLinkProps) {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        const payload = JSON.stringify({ platform, url: href });
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(CLICK_ENDPOINT, blob);
            return;
        }

        void fetch(CLICK_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
        });
    };

    return (
        <a href={href} onClick={handleClick} {...props}>
            {children}
        </a>
    );
}
