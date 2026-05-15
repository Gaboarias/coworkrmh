"use client";

import { useSession } from "next-auth/react";

export function useUser() {
  const { data: session, status } = useSession();
  return {
    profile: session?.user ?? null,
    loading: status === "loading",
  };
}
