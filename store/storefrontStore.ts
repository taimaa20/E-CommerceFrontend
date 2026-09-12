import { create } from 'zustand';
import {
    onlineShoppingApi,
    type OnlineMenuOrderContext,
    type OnlineStoreBranding,
} from '@/lib/api-online-shopping';

/**
 * Shared state for the public online store shell (header, cart drawer, branch
 * selection, brand colours). Ephemeral by design — nothing here is persisted, and the
 * order context is refetched whenever the shopper switches branch. The catalogue
 * itself is paged per page/route and therefore stays local to each page.
 */
interface StorefrontState {
    context: OnlineMenuOrderContext | null;
    branding: OnlineStoreBranding | null;
    branchId?: string;
    status: 'idle' | 'loading' | 'ready' | 'error';
    cartOpen: boolean;
    loadContext: () => Promise<void>;
    loadBranding: () => Promise<void>;
    setBranchId: (branchId: string) => void;
    setCartOpen: (open: boolean) => void;
}

export const useStorefrontStore = create<StorefrontState>()((set, get) => ({
    context: null,
    branding: null,
    branchId: undefined,
    status: 'idle',
    cartOpen: false,
    loadContext: async () => {
        set({ status: 'loading' });
        try {
            const context = await onlineShoppingApi.getOrderContext(get().branchId);
            set({ context, status: 'ready' });
        } catch {
            set({ context: null, status: 'error' });
        }
    },
    // Branding is optional decoration: a failure leaves the store on its neutral
    // theme rather than blocking the page.
    loadBranding: async () => {
        if (get().branding) return;
        try {
            set({ branding: await onlineShoppingApi.getBranding() });
        } catch {
            /* keep the neutral fallback palette */
        }
    },
    setBranchId: (branchId) => {
        if (get().branchId === branchId) return;
        set({ branchId });
        void get().loadContext();
    },
    setCartOpen: (cartOpen) => set({ cartOpen }),
}));

/** Branch the storefront is actually shopping: explicit choice → main → first. */
export function activeStorefrontBranchId(state: Pick<StorefrontState, 'context' | 'branchId'>): string | undefined {
    return state.branchId
        ?? state.context?.branches.find(branch => branch.isMainBranch)?.id
        ?? state.context?.branches[0]?.id;
}

/**
 * Turns the configured brand colours into the two custom properties the storefront
 * stylesheet derives everything else from. Anything unset is simply omitted, so the
 * CSS fallbacks (the neutral app theme) stay in force.
 */
export function storefrontBrandStyle(branding: OnlineStoreBranding | null): React.CSSProperties {
    const style: Record<string, string> = {};
    const primary = safeColor(branding?.primaryColor);
    const accent = safeColor(branding?.accentColor);
    if (primary) {
        style['--sf-brand'] = primary;
        style['--sf-brand-foreground'] = '#ffffff';
    }
    // Without a configured accent the store falls back to its action colour, which
    // keeps a single-colour brand looking deliberate rather than half-themed.
    if (accent || primary) style['--sf-accent'] = accent ?? primary!;
    return style as React.CSSProperties;
}

/** Only plain hex is accepted — the value reaches CSS, so nothing else may pass. */
function safeColor(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : undefined;
}
