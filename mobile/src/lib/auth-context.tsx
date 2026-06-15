/**
 * AuthContext — sesión mobile state global.
 *
 * Responsabilidades:
 * - Cargar token de SecureStore on mount (rehidratación).
 * - Decodificar el JWT payload local (sin llamar al backend) para
 *   obtener user info sin round-trip.
 * - Exponer signIn / signOut / refresh.
 * - Escuchar onAuthExpired del API client → clear state + redirect login.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, onAuthExpired } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface MobileTokenResponse {
  token: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
    image: string | null;
  };
}

interface DecodedJwt {
  sub: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  role?: string;
  exp?: number;
}

/**
 * Decodifica el payload de un JWT (base64url, sin verificar firma).
 * Local — sólo para extraer claims, no para autorizar. Backend valida
 * la firma en cada call. Si el JWT está expirado o malformado, retorna null.
 */
function decodeJwtPayload(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadB64.padEnd(
      payloadB64.length + ((4 - (payloadB64.length % 4)) % 4),
      "="
    );
    // RN tiene atob global (vía polyfill o nativo en SDK 56+).
    const json = atob(padded);
    const payload = JSON.parse(json) as DecodedJwt;
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null; // expirado
    }
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydration: leer token de SecureStore on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await api.getToken();
      if (cancelled) return;
      if (t) {
        const decoded = decodeJwtPayload(t);
        if (decoded) {
          setToken(t);
          setUser({
            id: decoded.sub,
            email: decoded.email ?? "",
            name: decoded.name ?? null,
            role: decoded.role ?? "member",
            image: decoded.image ?? null,
          });
        } else {
          // Token expirado o roto — limpiar.
          await api.clearToken();
        }
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Escuchar 401 events del API client (token rechazado por el backend).
  useEffect(() => {
    const off = onAuthExpired(() => {
      setUser(null);
      setToken(null);
    });
    return () => {
      off();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<MobileTokenResponse>("/auth/mobile-token", {
      email,
      password,
    });
    await api.setToken(res.token);
    setToken(res.token);
    setUser({
      id: res.user.id,
      email: res.user.email ?? "",
      name: res.user.name,
      role: res.user.role,
      image: res.user.image,
    });
  }, []);

  const signOut = useCallback(async () => {
    await api.clearToken();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
