import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  Pressable,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FolderKanban } from "lucide-react-native";

import { COLORS } from "@/lib/theme";
import { useFetch } from "@/lib/useFetch";
import {
  EmptyState,
  HairlineRule,
  HangingList,
  HangingListItem,
  PageHeader,
  Pill,
} from "@/components/primitives";

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string;
  taskTotal: number;
  taskDone: number;
}

interface ProjectsResponse {
  projects: Project[];
}

const STATUS_LABEL: Record<string, string> = {
  active: "activo",
  paused: "pausado",
  in_review: "revisión",
  stopped: "detenido",
  completed: "completo",
};

export default function ProjectsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const router = useRouter();
  const { data, loading, error } = useFetch<ProjectsResponse>("/mobile/projects");

  const projects = data?.projects ?? [];
  const active = projects.filter((p) => p.status === "active");
  const other = projects.filter((p) => p.status !== "active");

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
          issueLines={[
            `${projects.length} TOTAL`,
            `${active.length} ACTIVOS`,
          ]}
        />

        {loading && (
          <ActivityIndicator
            color={palette.inkFaint}
            style={{ marginTop: 40 }}
          />
        )}

        {error && (
          <Text
            style={{
              fontFamily: "Satoshi",
              fontSize: 14,
              color: palette.inkFaint,
              marginTop: 24,
            }}
          >
            {error}
          </Text>
        )}

        {!loading && !error && projects.length === 0 && (
          <EmptyState
            icon={
              <FolderKanban
                size={48}
                color={palette.inkFaint}
                strokeWidth={1.5}
              />
            }
            title="Sin proyectos"
            description="Los proyectos de tu entorno aparecerán aquí."
          />
        )}

        {!loading && active.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <HairlineRule label="Activos" count={`${active.length}`} />
            <ProjectList
              projects={active}
              palette={palette}
              onPress={(id) => router.push(`/projects/${id}`)}
            />
          </View>
        )}

        {!loading && other.length > 0 && (
          <View style={{ marginTop: 40, opacity: 0.65 }}>
            <HairlineRule label="Otros" count={`${other.length}`} />
            <ProjectList
              projects={other}
              palette={palette}
              onPress={(id) => router.push(`/projects/${id}`)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectList({
  projects,
  palette,
  onPress,
}: {
  projects: Project[];
  palette: (typeof COLORS)["dark"];
  onPress: (id: string) => void;
}) {
  return (
    <HangingList>
      {projects.map((p, i) => {
        const pct =
          p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : null;
        return (
          <HangingListItem key={p.id} index={i + 1}>
            <Pressable
              onPress={() => onPress(p.id)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
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
                    backgroundColor: p.color ?? "#6B5FE4",
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
                  {p.description && (
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
                  )}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text
                    style={{
                      fontFamily: "JetBrainsMono_500Medium",
                      fontSize: 10,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      color: palette.inkFaint,
                    }}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Text>
                  {pct !== null && (
                    <Pill label={`${pct}%`} variant="neutral" />
                  )}
                </View>
              </View>
            </Pressable>
          </HangingListItem>
        );
      })}
    </HangingList>
  );
}
