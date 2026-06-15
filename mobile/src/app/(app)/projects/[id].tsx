import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckSquare } from "lucide-react-native";

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

interface ProjectTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  isOverdue: boolean;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string;
}

interface ProjectDetailResponse {
  project: ProjectDetail;
  tasks: ProjectTask[];
}

const STATUS_ORDER = ["todo", "in_progress", "review", "done"];
const STATUS_LABEL: Record<string, string> = {
  todo: "Por hacer",
  in_progress: "En progreso",
  review: "En revisión",
  done: "Completadas",
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const router = useRouter();
  const { data, loading, error } = useFetch<ProjectDetailResponse>(
    `/mobile/projects/${id}`
  );

  const tasks = data?.tasks ?? [];
  const pending = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<string, ProjectTask[]>
  );

  const projectName = data?.project.name ?? "Proyecto";
  const parts = projectName.split(/\s+[—-]\s+/);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
          })}
        >
          <ArrowLeft size={16} color={palette.inkFaint} strokeWidth={1.75} />
          <Text
            style={{
              fontFamily: "JetBrainsMono_500Medium",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: palette.inkFaint,
            }}
          >
            proyectos
          </Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={palette.inkFaint} style={{ marginTop: 24 }} />
        ) : error ? (
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
        ) : (
          <>
            {/* Header with project color dot */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: data?.project.color ?? "#6B5FE4",
                  marginTop: 8,
                }}
              />
              <PageHeader
                eyebrow={`/ proyectos / ${parts[0]?.toLowerCase()}`}
                title={`${parts[0]},`}
                subtitle={
                  parts.length > 1
                    ? parts.slice(1).join(" — ")
                    : data?.project.description ?? "detalle."
                }
                issueLines={[
                  `${tasks.length} TAREAS`,
                  `${done.length} COMPLETADAS`,
                ]}
              />
            </View>

            {tasks.length === 0 && (
              <EmptyState
                icon={
                  <CheckSquare
                    size={48}
                    color={palette.inkFaint}
                    strokeWidth={1.5}
                  />
                }
                title="Sin tareas"
                description="Este proyecto no tiene tareas todavía."
              />
            )}

            {/* Pending tasks: todo + in_progress + review */}
            {pending.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {["todo", "in_progress", "review"].map((status) => {
                  const group = grouped[status];
                  if (!group?.length) return null;
                  return (
                    <View key={status} style={{ marginTop: status === "todo" ? 0 : 32 }}>
                      <HairlineRule
                        label={STATUS_LABEL[status]}
                        count={`${group.length}`}
                      />
                      <HangingList>
                        {group.map((t, i) => (
                          <TaskItem
                            key={t.id}
                            task={t}
                            index={i + 1}
                            palette={palette}
                          />
                        ))}
                      </HangingList>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Done tasks */}
            {done.length > 0 && (
              <View style={{ marginTop: 40, opacity: 0.5 }}>
                <HairlineRule
                  label={STATUS_LABEL.done}
                  count={`${done.length}`}
                />
                <HangingList>
                  {done.map((t, i) => (
                    <HangingListItem key={t.id} index={i + 1}>
                      <Text
                        style={{
                          fontFamily: "Satoshi",
                          fontSize: 14,
                          color: palette.inkSoft,
                          textDecorationLine: "line-through",
                        }}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
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

function TaskItem({
  task,
  index,
  palette,
}: {
  task: ProjectTask;
  index: number;
  palette: (typeof COLORS)["dark"];
}) {
  return (
    <HangingListItem index={index}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: "Satoshi",
            fontSize: 15,
            fontWeight: task.isOverdue || task.priority === "urgent" ? "700" : "500",
            color: task.isOverdue ? palette.urgent : palette.ink,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.dueDate && (
          <Pill
            label={task.isOverdue ? "vencida" : task.dueDate}
            variant={task.isOverdue ? "urgent" : "neutral"}
          />
        )}
        {!task.dueDate && task.priority === "urgent" && (
          <Pill label="urgente" variant="urgent" />
        )}
      </View>
    </HangingListItem>
  );
}
