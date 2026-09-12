import { api } from "@/lib/api";

/** Mirrors StorefrontBannerLinkType on the API. Append only — values are persisted. */
export const BANNER_LINK_TYPES = {
    none: 0,
    category: 1,
    product: 2,
    offers: 3,
    search: 4,
    external: 5,
} as const;

export type BannerLinkType = (typeof BANNER_LINK_TYPES)[keyof typeof BANNER_LINK_TYPES];

export interface StorefrontBanner {
    id: string;
    title: string;
    titleAr?: string;
    subtitle?: string;
    subtitleAr?: string;
    imageUrl: string;
    imageKey?: string;
    mobileImageUrl?: string;
    mobileImageKey?: string;
    ctaLabel?: string;
    ctaLabelAr?: string;
    linkType: BannerLinkType;
    linkValue?: string;
    placement: number;
    isActive: boolean;
    startsAtUtc?: string;
    endsAtUtc?: string;
    sortOrder: number;
    /** Whether shoppers are seeing this banner right now. Decided by the API, not here. */
    isLiveNow: boolean;
}

export interface StorefrontBannerInput {
    title: string;
    titleAr?: string;
    subtitle?: string;
    subtitleAr?: string;
    imageUrl: string;
    imageKey?: string;
    mobileImageUrl?: string;
    mobileImageKey?: string;
    ctaLabel?: string;
    ctaLabelAr?: string;
    linkType: BannerLinkType;
    linkValue?: string;
    placement: number;
    isActive: boolean;
    startsAtUtc?: string | null;
    endsAtUtc?: string | null;
    sortOrder: number;
}

const BASE = "/storefront-banners";

export const storefrontBannerApi = {
    list: async (): Promise<StorefrontBanner[]> =>
        (await api.get<StorefrontBanner[]>(BASE)).data ?? [],

    create: async (input: StorefrontBannerInput): Promise<StorefrontBanner> =>
        (await api.post<StorefrontBanner>(BASE, input)).data,

    update: async (id: string, input: StorefrontBannerInput): Promise<StorefrontBanner> =>
        (await api.put<StorefrontBanner>(`${BASE}/${id}`, input)).data,

    remove: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/${id}`);
    },
};
