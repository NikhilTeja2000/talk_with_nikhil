import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
  accessToken: string | null;
  refreshToken: string | null;
  userEmail: string | null;
  userId: string | null;
  isAuthenticated: boolean;

  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    email: string;
    userId: string;
  }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userEmail: null,
      userId: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, email, userId }) =>
        set({
          accessToken,
          refreshToken,
          userEmail: email,
          userId,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userEmail: null,
          userId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "twn-admin-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userEmail: state.userEmail,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
