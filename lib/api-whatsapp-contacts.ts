import { api } from "@/lib/api";

/**
 * WhatsApp destinations the business manages from the back office.
 *
 * A destination is a number plus the message that is prefilled when a shopper taps through.
 * Several may exist so general enquiries and product enquiries can reach different numbers —
 * the storefront asks for a purpose, never for a number.
 */
export type WhatsAppPurpose = 0 | 1 | 2;

export const WHATSAPP_PURPOSES: { value: WhatsAppPurpose; en: string; ar: string }[] = [
    { value: 0, en: "General enquiries", ar: "استفسارات عامة" },
    { value: 1, en: "Product enquiries", ar: "استفسارات عن المنتجات" },
    { value: 2, en: "Customer service", ar: "خدمة العملاء" },
];

export interface WhatsAppContact {
    id: string;
    label: string;
    labelAr?: string;
    phoneNumber: string;
    purpose: WhatsAppPurpose;
    messageTemplate?: string;
    messageTemplateAr?: string;
    isActive: boolean;
    /** Wins among several active destinations that share a purpose. */
    isDefault: boolean;
    sortOrder: number;
}

export interface WhatsAppContactInput {
    label: string;
    labelAr?: string;
    phoneNumber: string;
    purpose: WhatsAppPurpose;
    messageTemplate?: string;
    messageTemplateAr?: string;
    isActive: boolean;
    isDefault: boolean;
    sortOrder: number;
}

const BASE = "/whatsapp-contacts";

export const whatsAppContactApi = {
    list: async (): Promise<WhatsAppContact[]> =>
        (await api.get<WhatsAppContact[]>(BASE)).data ?? [],

    create: async (input: WhatsAppContactInput): Promise<WhatsAppContact> =>
        (await api.post<WhatsAppContact>(BASE, input)).data,

    update: async (id: string, input: WhatsAppContactInput): Promise<WhatsAppContact> =>
        (await api.put<WhatsAppContact>(`${BASE}/${id}`, input)).data,

    remove: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/${id}`);
    },
};
