// Shared types for the Sando Box website module.
// Contract is intentionally identical to what a future REST API would return.

export type Locale = "en" | "ar";

export interface BilingualField {
  name: string;
  nameAr: string;
}

export interface BrandInfo {
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  logo: string;
}

export interface HeroContent {
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  ctaPrimary: string;
  ctaPrimaryAr: string;
  ctaSecondary: string;
  ctaSecondaryAr: string;
}

export interface AboutStat {
  value: string;
  label: string;
  labelAr: string;
}

export interface AboutContent {
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  paragraphs: string[];
  paragraphsAr: string[];
  image: string;
  stats: AboutStat[];
}

export type ExperienceIcon = "chef" | "leaf" | "flame" | "box";

export interface ExperienceItem {
  icon: ExperienceIcon;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
}

export interface ExperienceContent {
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  items: ExperienceItem[];
}

export interface GalleryImage {
  src: string;
  alt: string;
  altAr: string;
}

export interface WorkingHours {
  days: string;
  daysAr: string;
  time: string;
}

export interface ContactInfo {
  address: string;
  addressAr: string;
  phones: string[];
  email: string;
  hours: WorkingHours[];
  social: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  mapEmbed: string;
}

export interface RestaurantInfo {
  brand: BrandInfo;
  hero: HeroContent;
  about: AboutContent;
  experience: ExperienceContent;
  gallery: GalleryImage[];
  contact: ContactInfo;
}

export interface MenuCategory {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  subcategories?: MenuSubcategory[];
}

export interface MenuSubcategory {
  id: string;
  categoryId: string;
  name: string;
  nameAr: string;
  displayOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  subcategoryNameAr?: string | null;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string | null;
  badge?: string;
  badgeAr?: string;
  /** If true, this item is shown in the website preview grid. Website only — POS ignores this flag. */
  featured?: boolean;
  /** Mirrors Product.IsActive from the API. Inactive items are hidden from the website. */
  isAvailable?: boolean;
  /** Mirrors Product.IsSoon — informative site renders "Coming Soon" instead of price. */
  isSoon?: boolean;
}

export interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface Offer {
  id: string;
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  originalPrice: number;
  image: string;
  badge: string;
  badgeAr: string;
  color: "red" | "black";
}
