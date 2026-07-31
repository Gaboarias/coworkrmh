import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
    };
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    /** Epoch ms del último refresh del rol contra la DB (ver ROLE_TTL_MS). */
    roleCheckedAt?: number;
    /** true si el usuario ya no existe en la DB → la sesión no vale. */
    invalid?: boolean;
  }
}
