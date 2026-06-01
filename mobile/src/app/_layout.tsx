import "../../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, View } from "react-native";

import { useAppFonts } from "@/lib/useAppFonts";
import { COLORS } from "@/lib/theme";

// Mantener el splash screen hasta que las fonts estén cargadas — evita
// el flash de fuente default antes de Satoshi.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
});

/**
 * Root layout (Edition 04 mobile · M1).
 *
 * - Carga Satoshi + JetBrains Mono via useAppFonts.
 * - Mantiene splash hasta que fonts listas.
 * - Stack navigation simple (sin tabs todavía — eso entra en M3).
 * - Color scheme automático (light/dark según OS).
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
        style={{ flex: 1, backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}
      />
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg,
          },
        }}
      />
    </>
  );
}
