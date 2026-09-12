
import { create } from 'zustand';
import { SiteSettings, defaultSettings } from '@/types/qrmenu';

interface MenuState {
    settings: SiteSettings;
    setSettings: (settings: SiteSettings) => void;
    updateSetting: (key: string, value: any) => void;
}

export const useMenuStore = create<MenuState>((set) => {
    // Try to load initial settings from localStorage (client-side only)
    let initialSettings = defaultSettings;

    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('qr_menu_settings');
        if (saved) {
            try {
                initialSettings = { ...defaultSettings, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Failed to parse settings from storage", e);
            }
        }
    }

    return {
        settings: initialSettings,
        setSettings: (settings) => set({ settings }),
        updateSetting: (key, value) =>
            set((state) => ({
                settings: { ...state.settings, [key]: value }
            })),
    };
});

// Hook wrapper for easier import/usage similar to old project
export const useMenu = () => {
    const store = useMenuStore();
    return {
        settings: store.settings,
        setSettings: store.setSettings,
        updateSetting: store.updateSetting
    };
};
