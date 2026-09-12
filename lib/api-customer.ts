import { api } from "./api";

export interface CustomerInsightsDto {
    customerId: string;
    name: string;
    nameAr?: string;
    displayName?: string;
    phoneNumber?: string;
    tier: string;
    points: number;
    lastVisit: string;
    lastOrders: OrderSummaryDto[];
    favoriteProducts: FavoriteProductDto[];
}

export interface OrderSummaryDto {
    id: string;
    date: string;
    total: number;
}

export interface FavoriteProductDto {
    productName: string;
    count: number;
}

interface CustomerSearchDto {
    id?: string;
    phoneNumber?: string;
}

const customerSearchCache = new Map<string, CustomerInsightsDto>();
const inFlightCustomerSearches = new Map<string, Promise<CustomerInsightsDto | null>>();

export const CustomerApi = {
    search: async (phone: string) => {
        const normalizedPhone = phone.trim();
        if (!normalizedPhone) return null;

        const cached = customerSearchCache.get(normalizedPhone);
        if (cached) return cached;

        const inFlight = inFlightCustomerSearches.get(normalizedPhone);
        if (inFlight) return inFlight;

        const request = (async () => {
            try {
                const res = await api.get<CustomerSearchDto>(
                    `/customers/search?phone=${encodeURIComponent(normalizedPhone)}`
                );

                if (res.data?.id) {
                    const insights = await CustomerApi.getInsights(res.data.id);
                    const customer = {
                        ...insights,
                        phoneNumber: insights.phoneNumber || res.data.phoneNumber || normalizedPhone,
                    };
                    customerSearchCache.set(normalizedPhone, customer);
                    return customer;
                }
                return null;
            } catch {
                return null;
            } finally {
                inFlightCustomerSearches.delete(normalizedPhone);
            }
        })();

        inFlightCustomerSearches.set(normalizedPhone, request);
        return request;
    },
    getInsights: async (id: string) => {
        try {
            const res = await api.get<CustomerInsightsDto>(`/customers/${id}/insights`);
            return res.data;
        } catch {
            throw new Error("Failed to load customer insights");
        }
    },
};
