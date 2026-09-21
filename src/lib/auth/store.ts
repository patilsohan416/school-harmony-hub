import { create } from "zustand";
import { authService, BASE_URL, type Session, type User } from "../services/auth.service";
import type { Role } from "./permissions";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    try {
      const session = authService.current();

      if (!session) {
        set({ user: null, session: null, loading: false });
        return;
      }

      // ✅ Verify token is still valid by calling /me
      try {
        const response = await fetch("http://localhost:5001/api/auth/me", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        if (response.ok) {
          set({
            user: session.user,
            session: session,
            loading: false,
          });
          return;
        } else if (response.status === 401) {
          // Token expired - try to refresh
          const newToken = await authService.refreshToken();
          if (newToken) {
            const refreshedSession = authService.current();
            if (refreshedSession) {
              set({
                user: refreshedSession.user,
                session: refreshedSession,
                loading: false,
              });
              return;
            }
          }
        }
      } catch {
        // Network error - assume token is invalid
      }

      // If we get here, session is invalid
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      set({ user: null, session: null, loading: false });
    } catch (error) {
      console.error("Auth init error:", error);
      set({ user: null, session: null, loading: false });
    }
  },

  login: async (email: string, password: string, role: Role) => {
    const session = await authService.login(email, password, role);
    set({ user: session.user, session });
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, session: null });
  },

  refresh: async () => {
    const token = await authService.refreshToken();
    if (token) {
      const session = authService.current();
      if (session) {
        set({ user: session.user, session });
      }
    }
  },
}));
