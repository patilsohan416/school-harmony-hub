// src/lib/api/client.ts

import { authService } from "../services/auth.service";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Uploaded files (e.g. student photos) are served from the backend root,
// not under /api — e.g. /uploads/students/xyz.jpg.
export const FILE_BASE_URL = BASE_URL.replace(/\/api\/?$/, "");

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

async function doFetch(
  path: string,
  token: string | null,
  rest: RequestInit,
  headers?: HeadersInit,
) {
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
  _retried = false,
): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const token = auth ? localStorage.getItem("access_token") : null;

  const res = await doFetch(path, token, rest, headers);

  // Refresh token once if unauthorized
  if (res.status === 401 && auth && !_retried) {
    try {
      const newToken = await authService.refreshToken();

      if (newToken) {
        return apiFetch<T>(path, options, true);
      }
    } catch (e) {
      console.error("Refresh failed", e);
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    window.location.href = "/login";
    throw new Error("Session expired");
  }

  let data: any = {};

  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    console.error("API ERROR");
    console.error("URL:", `${BASE_URL}${path}`);
    console.error("Status:", res.status);
    console.error("Response:", data);

    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}
