export interface PublicPageSettings {
    restaurantName: string;
    restaurantTagline: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    restaurantAddress: string | null;
    restaurantPhone: string | null;
    whatsAppNumber: string | null;
    websiteUrl: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tikTokUrl: string | null;
    googleMapsLocationUrl: string | null;
    googleReviewUrl: string | null;
    qrMenuUrl: string | null;
    primaryColor: string;
    primaryForeground: string;
    accentColor: string;
    language: string;
    updatedAt: string | null;
}

export interface FollowUsLink {
    platform: string;
    label: string;
    href: string;
    description: string;
    tone: string;
    external: boolean;
}
