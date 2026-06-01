import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

/**
 * Layout del grupo (app) — todas las pantallas autenticadas.
 *
 * Guard: si no hay user (después de hydration), redirect a (auth)/login.
 * Si está cargando, deja que el root layout muestre splash.
 *
 * En M3 acá entra el TabBar bottom navigation. Por ahora un Stack simple.
 */
export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // splash gestionado por root
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
