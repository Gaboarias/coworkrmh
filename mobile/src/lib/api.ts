/**
 * API client mobile — wrapper de fetch que:
 * 1. Pone base URL desde EXPO_PUBLIC_API_URL (o default prod).
 * 2. Lee token de SecureStore + add Authorization: Bearer <token>.
 * 3. Parsea JSON automáticamente, devuelve typed response.
 * 4. Maneja 401: clear token + emite evento global "auth-expired"
 *    para que AuthContext re-renderee en login screen.
 *
 * Uso:
 *   import { api } from "@/lib/api";
 *   const tasks = await api.get<Task[]>("/notifications");
 *   await api.post("/notifications/abc-123/read");
 */

import * as SecureStore from "expo-secure-store";

const DEFAULT_BASE_URL = "https://cowork-rmh.vercel.app/api";
const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? DEFAULT_BASE_URL;

export const TOKEN_KEY = "pistachio_auth_token";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Event bus simple para que AuthContext escuche eventos de 401.
type AuthExpiredListener = () => void;
const listeners = new Set<AuthExpiredListener>();
export function onAuthExpired(listener: AuthExpiredListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emitAuthExpired() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore listener errors */
    }
  });
}

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → token inválido o expirado. Clear + emit.
  if (res.status === 401) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    emitAuthExpired();
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

export const api = {
  baseUrl: BASE_URL,
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),

  // Helpers de SecureStore para token management.
  async setToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clearToken() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
  async getToken() {
    return getToken();
  },
};

export { ApiError };
