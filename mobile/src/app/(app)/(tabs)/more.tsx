import { ScrollView, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import {
  Button,
  HairlineRule,
  PageHeader,
  Pill,
} from "@/components/primitives";

/**
 * Más tab (M3 placeholder — M4+ trae settings reales, notifications, etc).
 *
 * Por ahora muestra: info del user logueado, role, opciones (futuro:
 * theme toggle, notificaciones config, sign out).
 */
export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader eyebrow="/ más" title="Cuenta," subtitle="y opciones." />

        {/* User info */}
        <View style={{ marginTop: 8 }}>
          <HairlineRule label="Sesión" />
          <View style={{ marginTop: 16, gap: 8 }}>
            <Text
              style={{
                fontFamily: "Satoshi",
                fontSize: 18,
                fontWeight: "700",
                color: palette.ink,
              }}
            >
              {user?.name ?? "Sin nombre"}
            </Text>
            <Text
              style={{
                fontFamily: "Satoshi",
                fontSize: 14,
                color: palette.inkSoft,
              }}
            >
              {user?.email}
            </Text>
            <View style={{ marginTop: 6 }}>
              <Pill label={user?.role ?? "member"} variant="neutral" />
            </View>
          </View>
        </View>

        {/* Theme — placeholder M3+ implementar real */}
        <View style={{ marginTop: 40 }}>
          <HairlineRule label="Apariencia" />
          <View style={{ marginTop: 16, gap: 12 }}>
            <Text
              style={{
                fontFamily: "Satoshi",
                fontSize: 14,
                color: palette.inkSoft,
              }}
            >
              Theme actual:{" "}
              <Text style={{ fontWeight: "700", color: palette.ink }}>
                {isDark ? "Oscuro" : "Claro"}
              </Text>{" "}
              (automático según OS)
            </Text>
            <Text
              style={{
                fontFamily: "Satoshi-Italic",
                fontSize: 12,
                color: palette.inkFaint,
              }}
            >
              Toggle manual viene en M4.
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={{ marginTop: 40 }}>
          <HairlineRule label="Sobre" />
          <View style={{ marginTop: 16, gap: 6 }}>
            <Text
              style={{
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 11,
                letterSpacing: 1.7,
                textTransform: "uppercase",
                color: palette.inkFaint,
              }}
            >
              Pistachio · Edition 04 · M3
            </Text>
            <Text
              style={{
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 11,
                color: palette.inkFaint,
                letterSpacing: 0.5,
              }}
            >
              cowork-rmh.vercel.app
            </Text>
            <Text
              style={{
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 11,
                color: palette.inkFaint,
                letterSpacing: 0.5,
              }}
            >
              Rewind Media House — 2026
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <View style={{ marginTop: 48 }}>
          <Button
            label="Cerrar sesión"
            variant="secondary"
            size="md"
            onPress={signOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
