
export interface SiteSettings {
    id?: string;
    restaurantId?: string;
    themeColor: 'black' | 'white' | 'red' | 'blue' | 'green' | 'orange';
    fontFamily?: string;
    darkMode: boolean;
    bannerActive: boolean;
    bannerUrls: string[];
    bannerOverlayVisible?: boolean;
    bannerTag?: string;
    bannerTitle?: string;
    bannerSubtitle?: string;
    mobileBannerUrls?: string[];
    popupActive: boolean;
    popupUrl: string;
    logoUrl: string;
    logoWidth: number;
    siteName?: string;
    siteDescription?: string;
    defaultProductImage?: string;
    categoryFontSize?: 'medium' | 'large' | 'xl';
    categoryFontWeight?: 'normal' | 'bold' | 'black';
    categoryRowHeight?: 'small' | 'medium' | 'large';
    categoryGap?: 'small' | 'medium' | 'large';
    categoryOverlayOpacity?: number;
    categoryFontFamily?: string;
    categoryLetterSpacing?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
    categoryCharConvert?: boolean;

    menuTitleText?: string;

    // Product Styling
    productTitleColor?: string;
    productDescriptionColor?: string;
    productPriceColor?: string;
    productTitleSize?: 'medium' | 'large' | 'xl';
    productDescriptionSize?: 'small' | 'medium' | 'large';
    productPriceSize?: 'medium' | 'large' | 'xl';

    // Footer & Social
    socialInstagram?: string;
    socialFacebook?: string;
    socialTwitter?: string;
    socialWhatsapp?: string;
    footerText?: string;
    footerCopyright?: string;
}

export const defaultSettings: SiteSettings = {
    themeColor: 'black',
    darkMode: false,
    bannerActive: false,
    bannerUrls: [],
    popupActive: false,
    popupUrl: '',
    logoUrl: '',
    logoWidth: 150,
    defaultProductImage: '',
    categoryFontSize: 'large',
    categoryFontWeight: 'black',
    categoryRowHeight: 'medium',
    categoryGap: 'medium',
    categoryOverlayOpacity: 50,
    categoryFontFamily: 'Inter',
    categoryLetterSpacing: 'normal',
    categoryCharConvert: false
};
