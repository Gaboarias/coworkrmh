import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckSquare } from "lucide-react-native";

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

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  isOverdue: boolean;
}

interface TasksResponse {
  tasks: Task[];
}

const PRIORITY_PILL: Record<string, "urgent" | "warn" | "neutral"> = {
  urgent: "urgent",
  high: "warn",
  medium: "neutral",
  low: "neutral",
};

export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const { data, loading, error } = useFetch<TasksResponse>("/mobile/tasks");

  const tasks = data?.tasks ?? [];
  const urgent = tasks.filter((t) => t.priority === "urgent" || t.isOverdue);
  const normal = tasks.filter((t) => t.priority !== "urgent" && !t.isOverdue);

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
          subtitle={
            loading
              ? "cargando…"
              : `${tasks.length} pendiente${tasks.length !== 1 ? "s" : ""}.`
          }
          issueLines={[
            `${tasks.length} TOTAL`,
            urgent.length > 0 ? `${urgent.length} URGENTES` : "AL DÍA",
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

        {!loading && !error && tasks.length === 0 && (
          <EmptyState
            icon={
              <CheckSquare
                size={48}
                color={palette.inkFaint}
                strokeWidth={1.5}
              />
            }
            title="Sin tareas asignadas"
            description="Las tareas que te asignen aparecerán aquí."
          />
        )}

        {!loading && urgent.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <HairlineRule label="Urgentes" count={`${urgent.length}`} />
            <TaskList tasks={urgent} palette={palette} />
          </View>
        )}

        {!loading && normal.length > 0 && (
          <View style={{ marginTop: urgent.length > 0 ? 40 : 8 }}>
            <HairlineRule label="Pendientes" count={`${normal.length}`} />
            <TaskList tasks={normal} palette={palette} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskList({
  tasks,
  palette,
}: {
  tasks: Task[];
  palette: (typeof COLORS)["dark"];
}) {
  return (
    <HangingList>
      {tasks.map((t, i) => (
        <HangingListItem key={t.id} index={i + 1}>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Satoshi",
                  fontSize: 15,
                  fontWeight:
                    t.priority === "urgent" || t.isOverdue ? "700" : "500",
                  color: t.isOverdue ? palette.urgent : palette.ink,
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
                {t.projectColor && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: t.projectColor,
                    }}
                  />
                )}
                <Text
                  style={{
                    fontFamily: "JetBrainsMono_500Medium",
                    fontSize: 10,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: palette.inkFaint,
                  }}
                >
                  {t.projectName}
                </Text>
              </View>
            </View>
            {t.dueDate && (
              <Pill
                label={t.isOverdue ? "vencida" : t.dueDate}
                variant={
                  t.isOverdue
                    ? "urgent"
                    : PRIORITY_PILL[t.priority] ?? "neutral"
                }
              />
            )}
            {!t.dueDate && t.priority === "urgent" && (
              <Pill label="urgente" variant="urgent" />
            )}
          </View>
        </HangingListItem>
      ))}
    </HangingList>
  );
}
