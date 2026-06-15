import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

/**
 * Layout del grupo (app) — Stack root para pantallas autenticadas.
 *
 * Guard: si no hay user (después de hydration), redirect a (auth)/login.
 *
 * Estructura:
 * - (tabs)/ → bottom tab bar (Inicio, Tareas, Proyectos, Más)
 * - projects/[id] → detail screen pushed sobre tabs (M4)
 * - notifications → modal/sheet (M3+)
 *
 * El Stack root permite pushear modals/details sobre los tabs.
 */
export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* Future: <Stack.Screen name="projects/[id]" options={{ presentation: 'modal' }} /> */}
    </Stack>
  );
}
