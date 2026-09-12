import { api } from "./api";

export interface StaffStatusDto {
    userId: string;
    staffId: string;
    fullName: string;
    fullNameAr?: string | null;
    isClockedIn: boolean;
    clockInTime?: string;
}

export const StaffApi = {
    identify: async (pin: string) => {
        try {
            const res = await api.post<StaffStatusDto>("/staffaccess/identify", { pin });
            return res.data;
        } catch (e) {
            return null;
        }
    },
    clockAction: async (userId: string, action: "IN" | "OUT") => {
        const res = await api.post("/staffaccess/clock-action", { userId, action });
        return res.data;
    }
};
