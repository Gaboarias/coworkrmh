import { ScrollView, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import {
  Button,
  HairlineRule,
  HangingList,
  HangingListItem,
  PageHeader,
  Pill,
} from "@/components/primitives";

/**
 * Home / Dashboard (M3 placeholder — real data en M4).
 *
 * Showcase de primitives Edition 04 en uso: PageHeader drop-line title,
 * HairlineRule sections, HangingList con números colgando, Pill urgent/done.
 * En M4 reemplazamos los placeholders con datos reales desde /api/dashboard.
 */
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const { user } = useAuth();
  const router = useRouter();

  const firstName = user?.name?.split(" ")[0] ?? "vos";

  // Placeholder data — M4 reemplaza con /api/dashboard.
  const urgentTasks: Array<{
    id: string;
    title: string;
    pill?: string;
    date?: string;
    urgent?: boolean;
  }> = [
    { id: "1", title: "Aprobar guión final spot TV", pill: "hoy", urgent: true },
    { id: "2", title: "Confirmar pago Cliente Aliaga", pill: "lun", urgent: true },
    { id: "3", title: "Reunión Ronda — review semanal", date: "mar 2 jun" },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow="/ inicio"
          title={`Hola, ${firstName},`}
          subtitle="buen día."
          issueLines={["Ed. 04 · MOBILE", "M3 · navigation"]}
        />

        <View style={{ marginTop: 8 }}>
          <HairlineRule
            label="Urgente esta semana"
            count={`${urgentTasks.length}`}
          />
          <HangingList>
            {urgentTasks.map((task, i) => (
              <HangingListItem key={task.id} index={i + 1}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: "Satoshi",
                      fontSize: 15,
                      fontWeight: task.urgent ? "700" : "500",
                      color: palette.ink,
                      lineHeight: 20,
                    }}
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>
                  {task.pill ? (
                    <Pill
                      label={task.pill}
                      variant={task.urgent ? "urgent" : "neutral"}
                    />
                  ) : task.date ? (
                    <Text
                      style={{
                        fontFamily: "JetBrainsMono_500Medium",
                        fontSize: 11,
                        color: palette.inkFaint,
                        letterSpacing: 0.5,
                      }}
                    >
                      {task.date}
                    </Text>
                  ) : null}
                </View>
              </HangingListItem>
            ))}
          </HangingList>
        </View>

        {/* Hero numeral placeholder (M4: ventas del mes desde reports) */}
        <View style={{ marginTop: 40 }}>
          <HairlineRule label="Ventas (mes)" />
          <Text
            style={{
              fontFamily: "Satoshi",
              fontSize: 64,
              lineHeight: 64 * 0.9,
              letterSpacing: -2.8,
              fontWeight: "500",
              color: palette.ink,
              marginTop: 16,
            }}
          >
            $4.2
            <Text style={{ fontSize: 32, color: palette.inkSoft }}>M</Text>
          </Text>
          <Text
            style={{
              fontFamily: "Satoshi-Italic",
              fontSize: 13,
              color: palette.inkSoft,
              marginTop: 6,
            }}
          >
            +18% vs mes anterior — placeholder, M4 trae el real.
          </Text>
        </View>

        {/* Action row */}
        <View
          style={{
            marginTop: 40,
            flexDirection: "row",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Button
            label="Ver tareas"
            variant="primary"
            onPress={() => router.push("/tasks")}
          />
          <Button
            label="Proyectos"
            variant="secondary"
            onPress={() => router.push("/projects")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
