/**
 * The one place a WhatsApp click-to-chat link is built.
 *
 * Every storefront surface — the header, the footer, a product card, the product page — goes
 * through `whatsAppHref`, so the destination number, the message and the encoding rules exist
 * once. Adding a second destination later is a configuration change, not a component change.
 *
 * Nothing customer-facing is written here: the message text is the template the business
 * configured in the back office. This module only substitutes placeholders into it.
 */
import type { OnlineWhatsAppContact, OnlineWhatsAppPurpose } from "@/lib/api-online-shopping";

/**
 * Values a configured template may refer to by placeholder. Table-driven so a future one is a
 * single line here and nothing else. Everything else in braces is stripped — see
 * `applyTemplate`.
 *
 * A surface fills in only what it actually knows: a product page knows the product, a
 * department knows the department, an order page knows the order number. Whatever it leaves
 * out simply drops out of the message, so one template serves every surface that asks for the
 * same destination.
 */
export interface WhatsAppMessageContext {
    productName?: string | null;
    sku?: string | null;
    productUrl?: string | null;
    categoryName?: string | null;
    categoryUrl?: string | null;
    orderNumber?: string | null;
}

const PLACEHOLDERS: Record<string, (context: WhatsAppMessageContext) => string | null | undefined> = {
    productname: context => context.productName,
    sku: context => context.sku,
    producturl: context => context.productUrl,
    categoryname: context => context.categoryName,
    categoryurl: context => context.categoryUrl,
    ordernumber: context => context.orderNumber,
};

/** `{Anything}`, matched case-insensitively so `{SKU}` and `{Sku}` behave the same. */
const PLACEHOLDER_PATTERN = /\{([A-Za-z]+)\}/g;

/** wa.me accepts digits only — no plus sign, spaces, dashes or parentheses. */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string {
    return (phone ?? "").replace(/\D/g, "");
}

/**
 * A number that cannot open a chat must never become a button. Matches the range the API
 * enforces when the destination is saved, so a link the storefront draws always works.
 */
export function isUsableWhatsAppPhone(phone: string | null | undefined): boolean {
    const digits = normalizeWhatsAppPhone(phone);
    return digits.length >= 7 && digits.length <= 15;
}

/**
 * Substitutes the supported placeholders and removes the rest.
 *
 * Failing safely means: an unknown placeholder disappears rather than reaching the shopper as
 * literal `{Foo}`; a supported placeholder with no value for this product disappears too; and
 * a line whose placeholders ALL came back empty — "Reference: {SKU}" for a product that has no
 * SKU — is dropped whole rather than sent as a dangling "Reference:".
 *
 * That decision is made per line from what the line actually contained, never from how the
 * finished text happens to look. A line carrying no placeholder at all — a greeting, a
 * sign-off — is therefore always kept, in any language and whatever it ends with.
 */
export function applyTemplate(template: string, context: WhatsAppMessageContext): string {
    return template
        .split("\n")
        .map(line => {
            let placeholders = 0;
            let resolved = 0;
            const substituted = line.replace(PLACEHOLDER_PATTERN, (_match, name: string) => {
                placeholders += 1;
                const value = PLACEHOLDERS[name.toLowerCase()]?.(context);
                if (!value) return "";
                resolved += 1;
                return String(value).trim();
            });
            // Every placeholder on this line came back empty, so the line existed only to
            // carry them and goes with them.
            return placeholders > 0 && resolved === 0 ? "" : substituted.trimEnd();
        })
        .filter(line => line.trim().length > 0)
        .join("\n")
        .trim();
}

/**
 * The destination for a purpose: its own configured contact, otherwise the general one.
 *
 * This fallback is what lets the storefront ask for "product inquiry" from day one while the
 * business still runs a single number — and lets them split the two later without a deploy.
 */
export function resolveWhatsAppContact(
    contacts: readonly OnlineWhatsAppContact[] | null | undefined,
    purpose: OnlineWhatsAppPurpose,
): OnlineWhatsAppContact | null {
    const usable = (contacts ?? []).filter(contact => isUsableWhatsAppPhone(contact.phone));
    return usable.find(contact => contact.purpose === purpose)
        ?? usable.find(contact => contact.purpose === WHATSAPP_PURPOSE.general)
        ?? null;
}

/**
 * The click-to-chat URL, or null when there is nothing safe to open.
 *
 * Returning null rather than a partial URL is deliberate: a caller renders no control at all
 * when WhatsApp is unconfigured or misconfigured, so there is never a button that goes nowhere.
 */
export function whatsAppHref(
    contact: OnlineWhatsAppContact | null | undefined,
    isAr: boolean,
    context: WhatsAppMessageContext = {},
): string | null {
    if (!contact) return null;

    const digits = normalizeWhatsAppPhone(contact.phone);
    if (!isUsableWhatsAppPhone(digits)) return null;

    // An empty template is a working link, not a broken one — WhatsApp simply opens the chat
    // with no prefilled text, which is the right behaviour when nothing was configured.
    const template = (isAr ? contact.messageTemplateAr || contact.messageTemplate : contact.messageTemplate) ?? "";
    const message = applyTemplate(template, context);
    return message
        ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${digits}`;
}

/** Mirrors WhatsAppContactPurpose on the API. Append only — the numbers travel over the wire. */
export const WHATSAPP_PURPOSE = {
    general: 0,
    productInquiry: 1,
    customerService: 2,
} as const;
