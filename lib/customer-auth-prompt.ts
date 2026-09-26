import { toast } from "sonner";

/**
 * Sign-in prompts tied to what the shopper is trying to do, never to timers.
 *
 * Soft reasons (saving a favourite) suggest an account once and let the shopper carry on as a
 * guest. Hard reasons (checkout, addresses, account pages) send them to sign-in and back again
 * to where they were. New prompts are added here as a reason, not scattered through components.
 */
export type AuthPromptReason = "favorite" | "checkout" | "address" | "account";

export const SIGN_IN_PATH = "/shop/account/sign-in";
export const ACCOUNT_PATH = "/shop/account";

const shownSoftPrompts = new Set<AuthPromptReason>();

export function signInHref(reason: AuthPromptReason, next: string): string {
    const query = new URLSearchParams({ reason, next });
    return `${SIGN_IN_PATH}?${query.toString()}`;
}

/** Only same-site storefront paths are honoured, so a crafted link cannot redirect off-site. */
export function safeNextPath(value: string | null | undefined): string {
    if (!value || !value.startsWith("/shop") || value.startsWith("//")) return ACCOUNT_PATH;
    return value;
}

export function authPromptMessage(reason: AuthPromptReason | null, isAr: boolean): string {
    switch (reason) {
        case "checkout":
            return isAr ? "سجّل الدخول أو أنشئ حساباً لإتمام طلبك. سلتك محفوظة." : "Sign in or create an account to place your order. Your cart is saved.";
        case "favorite":
            return isAr ? "سجّل الدخول لحفظ المفضلة على جميع أجهزتك." : "Sign in to keep your favourites on every device.";
        case "address":
            return isAr ? "سجّل الدخول لحفظ عناوينك." : "Sign in to save your addresses.";
        default:
            return isAr ? "سجّل الدخول إلى حسابك." : "Sign in to your account.";
    }
}

/** A one-time, dismissible suggestion per reason per page load. Never blocks the action. */
export function showSoftSignInPrompt(
    reason: AuthPromptReason,
    options: { isAr: boolean; next: string; navigate: (href: string) => void },
) {
    if (shownSoftPrompts.has(reason)) return;
    shownSoftPrompts.add(reason);
    toast(authPromptMessage(reason, options.isAr), {
        action: {
            label: options.isAr ? "تسجيل الدخول" : "Sign in",
            onClick: () => options.navigate(signInHref(reason, options.next)),
        },
    });
}
