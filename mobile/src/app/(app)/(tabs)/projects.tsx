import { ScrollView, Text, View, Pressable, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, PROJECT_PALETTE } from "@/lib/theme";
import {
  HairlineRule,
  HangingList,
  HangingListItem,
  PageHeader,
} from "@/components/primitives";

/**
 * Projects list (M3 placeholder — M4 trae /api/projects).
 *
 * Cada proyecto con su color dot (project.color), title bold, status sutil.
 * En M4: tap → push a /(app)/projects/[id] (detail con tabs Tareas/Docs/etc).
 */
export default function ProjectsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;

  // Placeholder — M4: fetch real desde /api/projects.
  const projects: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    status: string;
  }> = [
    {
      id: "1",
      name: "Aliaga",
      description: "Spot TV — campaña Q2",
      color: PROJECT_PALETTE[0],
      status: "activo",
    },
    {
      id: "2",
      name: "Ronda",
      description: "Rebranding 2026",
      color: PROJECT_PALETTE[1],
      status: "activo",
    },
    {
      id: "3",
      name: "Pampita",
      description: "Documental largo",
      color: PROJECT_PALETTE[2],
      status: "en revisión",
    },
    {
      id: "4",
      name: "Spring",
      description: "Sitio web nuevo",
      color: PROJECT_PALETTE[3],
      status: "activo",
    },
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
          eyebrow="/ proyectos"
          title="Proyectos,"
          subtitle="del estudio."
          issueLines={[`${projects.length} ACTIVOS`]}
        />

        <View style={{ marginTop: 8 }}>
          <HairlineRule label="Activos" count={`${projects.length}`} />
          <HangingList>
            {projects.map((p, i) => (
              <HangingListItem key={p.id} index={i + 1}>
                <Pressable
                  // onPress: M4 → router.push(`/projects/${p.id}`)
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: p.color,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Satoshi",
                          fontSize: 16,
                          fontWeight: "700",
                          color: palette.ink,
                          letterSpacing: -0.2,
                        }}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Satoshi",
                          fontSize: 13,
                          color: palette.inkSoft,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {p.description}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: "JetBrainsMono_500Medium",
                        fontSize: 10,
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                        color: palette.inkFaint,
                      }}
                    >
                      {p.status}
                    </Text>
                  </View>
                </Pressable>
              </HangingListItem>
            ))}
          </HangingList>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
