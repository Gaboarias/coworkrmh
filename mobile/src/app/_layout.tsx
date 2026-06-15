import "../../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, View } from "react-native";

import { useAppFonts } from "@/lib/useAppFonts";
import { AuthProvider } from "@/lib/auth-context";
import { COLORS } from "@/lib/theme";

// Mantener el splash screen hasta que las fonts estén cargadas — evita
// el flash de fuente default antes de Satoshi.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
});

/**
 * Root layout (Edition 04 mobile · M2).
 *
 * - useAppFonts carga Satoshi + JetBrains Mono.
 * - AuthProvider envuelve toda la app — los grupos (app) y (auth)
 *   consumen `useAuth()` para guard/redirect logic.
 * - Splash visible hasta que fonts ready.
 * - Stack root sin headers; cada grupo define sus propios screenOptions.
 */
export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore */
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg,
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg,
          },
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        <Stack.Screen name="(app)" options={{ animation: "fade" }} />
      </Stack>
    </AuthProvider>
  );
}
