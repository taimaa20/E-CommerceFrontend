import { create } from 'zustand';
import {
    CustomerApiError,
    customerSessionApi,
    setCustomerTokenProvider,
    type CustomerProfile,
    type CustomerSession,
    type CustomerSignUpInput,
} from '@/lib/api-customer-account';

/**
 * The storefront customer's session. Deliberately NOT persisted: the access token lives only in
 * memory, and the httpOnly refresh cookie (held by /api/customer-session) restores it on load.
 * Staff authentication (authStore) is a separate store and is never consulted here.
 *
 * `unknown` means "not checked yet" — UI must not flash a signed-out state before bootstrap.
 */
type SessionStatus = 'unknown' | 'guest' | 'authenticated';

/** Refresh this long before the access token expires, so a request never races the expiry. */
const EXPIRY_SKEW_MS = 30_000;

interface CustomerSessionState {
    status: SessionStatus;
    customer: CustomerProfile | null;
    accessToken: string | null;
    accessTokenExpiresAt: number;
    bootstrap: () => Promise<void>;
    signIn: (identifier: string, password: string) => Promise<void>;
    signUp: (input: CustomerSignUpInput) => Promise<void>;
    signOut: () => Promise<void>;
    setCustomer: (customer: CustomerProfile) => void;
}

const GUEST = { status: 'guest' as const, customer: null, accessToken: null, accessTokenExpiresAt: 0 };

let bootstrapPromise: Promise<void> | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const useCustomerSessionStore = create<CustomerSessionState>()((set, get) => {
    const apply = (session: CustomerSession) => set({
        status: 'authenticated',
        customer: session.customer,
        accessToken: session.accessToken,
        accessTokenExpiresAt: new Date(session.accessTokenExpiresAt).getTime(),
    });

    /** Single-flight: concurrent callers share one refresh, so rotation never races itself. */
    const refresh = (): Promise<string | null> => {
        refreshPromise ??= customerSessionApi.refresh()
            .then((session) => {
                apply(session);
                return session.accessToken;
            })
            .catch((error: unknown) => {
                // Only a definitive rejection signs the shopper out; a network blip or a rate
                // limit keeps the current state so the next action can try again.
                if (error instanceof CustomerApiError && error.status === 401) set(GUEST);
                else if (get().status === 'unknown') set(GUEST);
                return null;
            })
            .finally(() => { refreshPromise = null; });
        return refreshPromise;
    };

    setCustomerTokenProvider(async (forceRefresh) => {
        const state = get();
        if (state.status === 'guest') return null;
        const fresh = state.accessToken && Date.now() < state.accessTokenExpiresAt - EXPIRY_SKEW_MS;
        if (fresh && !forceRefresh) return state.accessToken;
        return refresh();
    });

    return {
        status: 'unknown',
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: 0,

        bootstrap: () => {
            bootstrapPromise ??= refresh().then(() => undefined);
            return bootstrapPromise;
        },

        signIn: async (identifier, password) => {
            apply(await customerSessionApi.login(identifier.trim(), password));
        },

        signUp: async (input) => {
            apply(await customerSessionApi.register(input));
        },

        signOut: async () => {
            // Local state is cleared even if revocation fails: the cookie is removed server-side
            // regardless, so this browser no longer holds a usable session.
            try {
                await customerSessionApi.logout();
            } finally {
                set(GUEST);
            }
        },

        setCustomer: (customer) => set({ customer }),
    };
});

/** Display name for the header and account screens. */
export function customerDisplayName(customer: CustomerProfile | null): string {
    if (!customer) return '';
    return `${customer.firstName} ${customer.lastName}`.trim() || customer.email || customer.mobileNumber;
}
