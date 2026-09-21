import { apiFetch } from "../api/client";
import type { Role } from "../auth/permissions";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string;
  schoolName: string;
  schoolAddress?: string;
  schoolCity?: string;
  schoolState?: string;
  schoolCountry?: string;
  schoolPincode?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolWebsite?: string;
  avatar?: string;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    role: string;
    tenantId?: string;
    tenant?: {
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      pincode?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    };
    avatar?: string;
  };
  accessToken: string;
  refreshToken?: string;
}

function mapUser(u: LoginResponse["user"]): User {
  const roleMap: Record<string, Role> = {
    SUPER_ADMIN: "super_admin",
    PRINCIPAL: "principal",
    VICE_PRINCIPAL: "vice_principal",
    ADMIN: "school_admin",
    TEACHER: "teacher",
    ACCOUNTANT: "accountant",
    LIBRARIAN: "librarian",
    STUDENT: "student",
    PARENT: "parent",
  };

  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" "),
    email: u.email,
    role: roleMap[u.role] || "student",
    schoolId: u.tenantId ?? "",
    schoolName: u.tenant?.name ?? "Sunrise Public School",
    schoolAddress: u.tenant?.address ?? undefined,
    schoolCity: u.tenant?.city ?? undefined,
    schoolState: u.tenant?.state ?? undefined,
    schoolCountry: u.tenant?.country ?? undefined,
    schoolPincode: u.tenant?.pincode ?? undefined,
    schoolPhone: u.tenant?.phone ?? undefined,
    schoolEmail: u.tenant?.email ?? undefined,
    schoolWebsite: u.tenant?.website ?? undefined,
    avatar: u.avatar,
  };
}

export const authService = {
  async login(
    email: string,
    password: string,
    role: Role
  ): Promise<Session> {
    console.log("Sending login:", {
      email,
      password,
      role,
    });

    const data = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({
        email,
        password,
        role,
      }),
    });

    const user = mapUser(data.user);

    localStorage.setItem("access_token", data.accessToken);

    if (data.refreshToken) {
      localStorage.setItem("refresh_token", data.refreshToken);
    }

    localStorage.setItem("user", JSON.stringify(user));

    return {
      user,
      token: data.accessToken,
      expiresAt: new Date(
        Date.now() + 1000 * 60 * 60 * 8
      ).toISOString(),
    };
  },

  async logout(): Promise<void> {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },

  current(): Session | null {
    const token = localStorage.getItem("access_token");
    const userJson = localStorage.getItem("user");

    if (!token || !userJson) {
      return null;
    }

    try {
      const user = JSON.parse(userJson);

      return {
        user,
        token,
        expiresAt: new Date(
          Date.now() + 1000 * 60 * 60 * 8
        ).toISOString(),
      };
    } catch {
      return null;
    }
  },

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/auth/refresh-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

      if (!response.ok) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        return null;
      }

      const data = await response.json();

      localStorage.setItem(
        "access_token",
        data.accessToken
      );

      return data.accessToken;
    } catch {
      return null;
    }
  },
};