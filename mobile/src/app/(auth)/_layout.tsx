import { Stack } from "expo-router";

/**
 * Layout del grupo (auth) — login + reset password (futuro).
 * Sin header, animación fade entre pantallas.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}
