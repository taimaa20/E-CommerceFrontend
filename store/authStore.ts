import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserDto, UserRole } from '@/types/auth';

interface AuthState {
    user: UserDto | null;
    isAuthenticated: boolean;
    login: (user: UserDto) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            login: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
        }
    )
);
