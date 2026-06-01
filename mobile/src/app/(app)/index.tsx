import {
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, PROJECT_PALETTE } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";

/**
 * M2 Home (era M1 Showcase) — verifica design system + auth context.
 * Renderiza el showcase Edition 04 (drop-line, palette, hanging numbers,
 * hero numeral) + user logueado + botón sign out.
 *
 * Este screen se reemplaza en M4 con el Dashboard real consumiendo la API.
 */
export default function Index() {
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
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow */}
        <Text className="font-mono text-[12px] uppercase tracking-[1.7px] text-ink-faint">
          / m2 · auth ok
        </Text>

        {/* Drop-line title con nombre del user */}
        <View className="mt-4">
          <Text
            className="text-ink"
            style={{
              fontFamily: "Satoshi",
              fontSize: 56,
              lineHeight: 56 * 0.95,
              letterSpacing: -2.2,
              fontWeight: "700",
            }}
          >
            Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""},
          </Text>
          <Text
            className="text-ink-soft"
            style={{
              fontFamily: "Satoshi-Italic",
              fontSize: 56,
              lineHeight: 56 * 0.95,
              letterSpacing: -2.2,
              fontWeight: "400",
              paddingLeft: 28,
              marginTop: -4,
            }}
          >
            estás dentro.
          </Text>
        </View>

        {/* Description body */}
        <Text
          className="mt-5 text-ink-soft"
          style={{ fontFamily: "Satoshi", fontSize: 16, lineHeight: 24 }}
        >
          M2 auth listo. Logueado como{" "}
          <Text style={{ fontWeight: "700", color: palette.ink }}>
            {user?.email}
          </Text>{" "}
          ({user?.role}). El token JWT vive en SecureStore y se envía como
          Bearer a la API. M3-M8 vienen con tabs + dashboard real + tasks.
        </Text>

        {/* HairlineRule simulation — Palette */}
        <View className="mt-10 flex-row items-center gap-3">
          <Text className="font-mono text-[12px] uppercase tracking-[1.7px] text-ink-soft">
            Palette canónica
          </Text>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: palette.ruleStrong }}
          />
          <Text className="font-mono text-[12px] tracking-[0.6px] text-ink-faint">
            8 colores
          </Text>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {PROJECT_PALETTE.map((color) => (
            <View
              key={color}
              style={{
                width: 64,
                height: 64,
                borderRadius: 6,
                backgroundColor: color,
              }}
            />
          ))}
        </View>

        {/* HairlineRule — hanging list */}
        <View className="mt-10 flex-row items-center gap-3">
          <Text className="font-mono text-[12px] uppercase tracking-[1.7px] text-ink-soft">
            Hanging numbers
          </Text>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: palette.ruleStrong }}
          />
          <Text className="font-mono text-[12px] tracking-[0.6px] text-ink-faint">
            3 items
          </Text>
        </View>

        <View className="mt-4" style={{ paddingLeft: 36 }}>
          {SHOWCASE_TASKS.map((task, i) => (
            <View
              key={task.id}
              className="flex-row items-baseline justify-between gap-3"
              style={{
                paddingVertical: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: palette.rule,
                position: "relative",
              }}
            >
              <Text
                className="font-mono text-ink-faint"
                style={{
                  position: "absolute",
                  left: -36,
                  top: 14,
                  width: 28,
                  textAlign: "right",
                  fontSize: 13,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text
                className="flex-1 text-ink"
                style={{
                  fontFamily: "Satoshi",
                  fontSize: 16,
                  fontWeight: task.urgent ? "700" : "500",
                }}
              >
                {task.title}
              </Text>
              {task.urgent ? (
                <View
                  style={{
                    backgroundColor: palette.urgent,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 2,
                  }}
                >
                  <Text
                    className="font-mono uppercase"
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 1.5,
                    }}
                  >
                    hoy
                  </Text>
                </View>
              ) : (
                <Text className="font-mono text-ink-faint uppercase" style={{ fontSize: 12, letterSpacing: 0.7 }}>
                  {task.due}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Hero numeral */}
        <View className="mt-10 flex-row items-center gap-3">
          <Text className="font-mono text-[12px] uppercase tracking-[1.7px] text-ink-soft">
            Ventas (30d)
          </Text>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: palette.ruleStrong }}
          />
        </View>
        <Text
          className="mt-4 text-ink"
          style={{
            fontFamily: "Satoshi",
            fontSize: 88,
            lineHeight: 88 * 0.9,
            letterSpacing: -4,
            fontWeight: "500",
            fontVariant: ["tabular-nums"],
          }}
        >
          $4.2
          <Text style={{ fontSize: 44, color: palette.inkSoft }}>M</Text>
        </Text>
        <Text className="mt-2 italic text-ink-soft" style={{ fontFamily: "Satoshi-Italic", fontSize: 13 }}>
          +18% vs abril — mejor mes del trimestre.
        </Text>

        {/* M2 status footer + sign-out */}
        <View
          className="mt-12 border-t pt-6"
          style={{ borderColor: palette.rule }}
        >
          <Text className="font-mono text-[11px] uppercase tracking-[1.7px] text-ink-faint">
            ✓ M1 Foundation · ✓ M2 Auth · JWT Bearer · SecureStore
          </Text>
          <Text className="mt-2 font-mono text-[11px] tracking-[0.5px] text-ink-faint">
            Próximo: M3 · TabBar + primitives + dashboard real.
          </Text>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => ({
              marginTop: 24,
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: palette.ruleStrong,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 6,
              alignSelf: "flex-start",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: "Satoshi",
                fontSize: 14,
                fontWeight: "600",
                color: palette.ink,
              }}
            >
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SHOWCASE_TASKS = [
  {
    id: "1",
    title: "Aprobar guión final spot TV",
    urgent: true,
    due: "hoy",
  },
  {
    id: "2",
    title: "Reservar locación exterior",
    urgent: false,
    due: "vie 6 jun",
  },
  {
    id: "3",
    title: "Reunión Ronda — review semanal",
    urgent: false,
    due: "mar 2 jun",
  },
];
