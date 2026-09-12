import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FullTheme } from '@/lib/colorExtract';
import { generateFullTheme } from '@/lib/colorExtract';

export interface BrandingConfig {
    logoUrl: string | null;
    businessName: string | null;
    primaryColor: string;
    primaryForeground: string;
    accentColor: string;
    updatedAt: string | null;  // ISO string — used as cache version
}

interface BrandingState extends BrandingConfig {
    isLoaded: boolean;
    setBranding: (config: Partial<BrandingConfig>) => void;
    applyTheme: () => void;
    loadBranding: () => Promise<void>;
}

const DEFAULTS: BrandingConfig = {
    logoUrl: null,
    businessName: null,
    primaryColor: '#f97316',        // orange-500 — current system default
    primaryForeground: '#ffffff',
    accentColor: '#ea6b0f',         // slightly darker orange
    updatedAt: null,
};

/** Maps FullTheme keys to CSS custom property names */
const THEME_VAR_MAP: Record<keyof FullTheme, string> = {
    primary: '--primary',
    primaryForeground: '--primary-foreground',
    background: '--background',
    foreground: '--foreground',
    card: '--card',
    cardForeground: '--card-foreground',
    popover: '--popover',
    popoverForeground: '--popover-foreground',
    secondary: '--secondary',
    secondaryForeground: '--secondary-foreground',
    muted: '--muted',
    mutedForeground: '--muted-foreground',
    accent: '--accent',
    accentForeground: '--accent-foreground',
    border: '--border',
    input: '--input',
    ring: '--ring',
    destructive: '--destructive',
    success: '--success',
    successForeground: '--success-foreground',
    warning: '--warning',
    warningForeground: '--warning-foreground',
    info: '--info',
    infoForeground: '--info-foreground',
    sidebar: '--sidebar',
    sidebarForeground: '--sidebar-foreground',
    sidebarPrimary: '--sidebar-primary',
    sidebarPrimaryForeground: '--sidebar-primary-foreground',
    sidebarAccent: '--sidebar-accent',
    sidebarAccentForeground: '--sidebar-accent-foreground',
    sidebarBorder: '--sidebar-border',
    sidebarRing: '--sidebar-ring',
    chart1: '--chart-1',
    chart2: '--chart-2',
    chart3: '--chart-3',
    chart4: '--chart-4',
    chart5: '--chart-5',
};

export const useBrandingStore = create<BrandingState>()(
    persist(
        (set, get) => ({
            ...DEFAULTS,
            isLoaded: false,

            setBranding: (config) => set((state) => ({ ...state, ...config })),

            applyTheme: () => {
                if (typeof document === 'undefined') return;
                const { primaryColor } = get();
                const theme = generateFullTheme(primaryColor);
                const root = document.documentElement;

                // Apply every CSS variable from the generated theme
                for (const [key, cssVar] of Object.entries(THEME_VAR_MAP)) {
                    const value = theme[key as keyof FullTheme];
                    if (value) {
                        root.style.setProperty(cssVar, value);
                    }
                }
            },

            loadBranding: async () => {
                try {
                    const { getTenantBranding } = await import('@/lib/api');
                    const data = await getTenantBranding();
                    if (!data) return;

                    const current = get();

                    // Only update if server version is newer than cached version
                    if (data.updatedAt && data.updatedAt === current.updatedAt) {
                        get().applyTheme();
                        set({ isLoaded: true });
                        return;
                    }

                    const merged: Partial<BrandingConfig> = {
                        logoUrl: data.logoUrl ?? current.logoUrl,
                        businessName: data.businessName ?? current.businessName,
                        primaryColor: data.primaryColor || current.primaryColor,
                        primaryForeground: data.primaryForeground || current.primaryForeground,
                        accentColor: data.accentColor || current.accentColor,
                        updatedAt: data.updatedAt ?? current.updatedAt,
                    };

                    set({ ...merged, isLoaded: true });
                    setTimeout(() => get().applyTheme(), 0);
                } catch {
                    get().applyTheme();
                    set({ isLoaded: true });
                }
            },
        }),
        {
            name: 'pos-branding',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                logoUrl: state.logoUrl,
                businessName: state.businessName,
                primaryColor: state.primaryColor,
                primaryForeground: state.primaryForeground,
                accentColor: state.accentColor,
                updatedAt: state.updatedAt,
            }),
        }
    )
);
