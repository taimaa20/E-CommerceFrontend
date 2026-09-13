"use client";

import { createStoreText } from "@/lib/store-copy";
import {
    resolveWhatsAppContact,
    whatsAppHref,
    WHATSAPP_PURPOSE,
    type WhatsAppMessageContext,
} from "@/lib/whatsapp";
import type { OnlineWhatsAppPurpose } from "@/lib/api-online-shopping";
import { useStorefrontStore } from "@/store/storefrontStore";

/**
 * The WhatsApp brand glyph.
 *
 * Drawn here rather than taken from the icon set, which carries no brand marks: a generic
 * speech bubble does not read as WhatsApp, and a shopper has to recognise the destination
 * before they will tap it.
 */
function WhatsAppGlyph({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" className={className}>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.12.16 1.74 2.67 4.22 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29Z" />
        </svg>
    );
}

/** Default wording per destination, so each surface reads like what it actually does. */
const CAPTION_KEY: Record<OnlineWhatsAppPurpose, "chatOnWhatsApp" | "askAboutProduct" | "orderHelpOnWhatsApp"> = {
    [WHATSAPP_PURPOSE.general]: "chatOnWhatsApp",
    [WHATSAPP_PURPOSE.productInquiry]: "askAboutProduct",
    [WHATSAPP_PURPOSE.customerService]: "orderHelpOnWhatsApp",
};

/**
 * A WhatsApp action, wherever the store offers one.
 *
 * It asks for a PURPOSE — never for a phone number — so the business can point general
 * enquiries, catalogue enquiries and after-sale help at three different numbers without this
 * component, the category page, the product page or the footer changing at all.
 *
 * It renders nothing when WhatsApp is not configured, when the configured destination is
 * unusable, or before the contacts have loaded. There is no disabled state and no placeholder:
 * a WhatsApp button that appears is a WhatsApp button that opens a chat.
 */
export default function StoreWhatsAppLink({
    purpose = WHATSAPP_PURPOSE.general,
    context,
    isAr,
    variant = "button",
    label,
    className = "",
}: {
    purpose?: OnlineWhatsAppPurpose;
    /** Values for the template's placeholders — whatever this surface actually knows. */
    context?: WhatsAppMessageContext;
    isAr: boolean;
    /** `brand` is the WhatsApp-green call to action; `icon` is the round green glyph-only button. */
    variant?: "brand" | "button" | "icon";
    /** Overrides the default label; the surrounding surface decides what reads best. */
    label?: string;
    className?: string;
}) {
    const text = createStoreText(isAr);
    const contacts = useStorefrontStore(state => state.whatsAppContacts);
    const href = whatsAppHref(resolveWhatsAppContact(contacts, purpose), isAr, context ?? {});
    if (!href) return null;

    const caption = label ?? text(CAPTION_KEY[purpose]);
    // The visible caption rarely names WhatsApp on its own once a merchant has reworded it,
    // so the accessible name always does.
    const accessibleName = `${caption} — ${text("whatsApp")}`;

    if (variant === "icon") {
        // No visible text, so the caption travels as the accessible name and the tooltip.
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={caption}
                title={caption}
                className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white transition-colors hover:bg-[#1fba59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128c7e] ${className}`}
            >
                <WhatsAppGlyph className="size-6" />
            </a>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={accessibleName}
            className={`sf-btn ${variant === "brand" ? "sf-btn--whatsapp" : "sf-btn--outline"} ${className}`}
        >
            <WhatsAppGlyph className="size-[18px] shrink-0" />
            {caption}
        </a>
    );
}
