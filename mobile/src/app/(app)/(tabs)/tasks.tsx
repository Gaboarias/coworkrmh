import { ScrollView, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckSquare } from "lucide-react-native";

import { COLORS } from "@/lib/theme";
import {
  EmptyState,
  HairlineRule,
  HangingList,
  HangingListItem,
  PageHeader,
  Pill,
} from "@/components/primitives";

/**
 * My Tasks (M3 placeholder — M4 trae /api/my-tasks).
 *
 * Placeholders separadas en Pendientes / Completadas con HangingList +
 * Pill urgent/done.
 */
export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;

  // Placeholder. M4: reemplazar con fetch real.
  const pending: Array<{
    id: string;
    title: string;
    project: string;
    projectColor: string;
    pill?: string;
    date?: string;
    urgent?: boolean;
  }> = [
    {
      id: "1",
      title: "Aprobar guión final spot TV",
      project: "Aliaga",
      projectColor: "#d63a1f",
      pill: "hoy",
      urgent: true,
    },
    {
      id: "2",
      title: "Reservar locación exterior",
      project: "Aliaga",
      projectColor: "#d63a1f",
      date: "vie 6 jun",
    },
    {
      id: "3",
      title: "Revisar branding deck Pampita",
      project: "Pampita",
      projectColor: "#e89a0d",
      date: "lun 9 jun",
    },
  ];

  const done: Array<{ id: string; title: string; date: string }> = [
    { id: "4", title: "Reunión Ronda — kick-off", date: "28 may" },
    { id: "5", title: "Brief inicial recibido", date: "25 may" },
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
          eyebrow="/ mis tareas"
          title="Mis tareas,"
          subtitle={`${pending.length} pendiente${pending.length !== 1 ? "s" : ""}.`}
          issueLines={[`${pending.length + done.length} TOTAL`, `${done.length} COMPLETADAS`]}
        />

        {pending.length === 0 && done.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={48} color={palette.inkFaint} strokeWidth={1.5} />}
            title="Sin tareas asignadas"
            description="Las tareas que te asignen aparecerán aquí."
          />
        ) : (
          <>
            {pending.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <HairlineRule label="Pendientes" count={`${pending.length}`} />
                <HangingList>
                  {pending.map((t, i) => (
                    <HangingListItem key={t.id} index={i + 1}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: "Satoshi",
                              fontSize: 15,
                              fontWeight: t.urgent ? "700" : "500",
                              color: palette.ink,
                              lineHeight: 20,
                            }}
                            numberOfLines={2}
                          >
                            {t.title}
                          </Text>
                          <View
                            style={{
                              marginTop: 4,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: t.projectColor,
                              }}
                            />
                            <Text
                              style={{
                                fontFamily: "JetBrainsMono_500Medium",
                                fontSize: 10,
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                                color: palette.inkFaint,
                              }}
                            >
                              {t.project}
                            </Text>
                          </View>
                        </View>
                        {t.pill ? (
                          <Pill label={t.pill} variant={t.urgent ? "urgent" : "neutral"} />
                        ) : t.date ? (
                          <Text
                            style={{
                              fontFamily: "JetBrainsMono_500Medium",
                              fontSize: 11,
                              color: palette.inkFaint,
                              letterSpacing: 0.5,
                            }}
                          >
                            {t.date}
                          </Text>
                        ) : null}
                      </View>
                    </HangingListItem>
                  ))}
                </HangingList>
              </View>
            )}

            {done.length > 0 && (
              <View style={{ marginTop: 40, opacity: 0.6 }}>
                <HairlineRule label="Completadas" count={`${done.length}`} />
                <HangingList>
                  {done.map((t, i) => (
                    <HangingListItem key={t.id} index={i + 1}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: "Satoshi",
                            fontSize: 14,
                            color: palette.inkSoft,
                            textDecorationLine: "line-through",
                          }}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "JetBrainsMono_500Medium",
                            fontSize: 11,
                            color: palette.inkFaint,
                            letterSpacing: 0.5,
                          }}
                        >
                          {t.date}
                        </Text>
                      </View>
                    </HangingListItem>
                  ))}
                </HangingList>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
