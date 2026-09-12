/**
 * The shopper's own checkout details, remembered on their device.
 *
 * The storefront is a guest checkout: an anonymous visitor is not identified, so there is no
 * safe server-side lookup that could prefill a name, phone or address — a public endpoint that
 * returned a stored address for a typed phone number would hand anyone else's address to
 * anyone who guessed the number. What the shopper typed on THIS device is therefore what gets
 * remembered, exactly like the order-tracking tokens beside it.
 *
 * The order itself remains the record of where a delivery went; this is only a convenience.
 */
const CHECKOUT_DETAILS_KEY = "online-shopping:checkout-details:v1";

export interface StoreCheckoutDetails {
    name: string;
    phone: string;
    email: string;
    zoneId: string;
    address: string;
    buildingNo: string;
    street: string;
    floor: string;
}

export const EMPTY_CHECKOUT_DETAILS: StoreCheckoutDetails = {
    name: "",
    phone: "",
    email: "",
    zoneId: "",
    address: "",
    buildingNo: "",
    street: "",
    floor: "",
};

export function rememberCheckoutDetails(details: StoreCheckoutDetails): void {
    try {
        window.localStorage.setItem(CHECKOUT_DETAILS_KEY, JSON.stringify(details));
    } catch {
        /* private mode / storage disabled — the shopper simply retypes next time */
    }
}

export function readCheckoutDetails(): StoreCheckoutDetails {
    try {
        const raw = window.localStorage.getItem(CHECKOUT_DETAILS_KEY);
        if (!raw) return EMPTY_CHECKOUT_DETAILS;
        const parsed = JSON.parse(raw) as Partial<Record<keyof StoreCheckoutDetails, unknown>>;
        // Rebuilt field by field from the empty shape: anything the stored entry does not
        // supply as a string stays empty, so an old or hand-edited value can never reach an
        // input as something other than a string.
        const details = { ...EMPTY_CHECKOUT_DETAILS };
        for (const key of Object.keys(details) as (keyof StoreCheckoutDetails)[]) {
            if (typeof parsed[key] === "string") details[key] = parsed[key];
        }
        return details;
    } catch {
        return EMPTY_CHECKOUT_DETAILS;
    }
}
