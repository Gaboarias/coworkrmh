import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useFetch } from "@/lib/useFetch";
import {
  Button,
  HairlineRule,
  HangingList,
  HangingListItem,
  PageHeader,
  Pill,
} from "@/components/primitives";

interface DashboardData {
  urgentTasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    priority: string;
    projectName: string;
    projectColor: string | null;
    isOverdue: boolean;
  }>;
  pendingCount: number;
  projectsCount: number;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useFetch<DashboardData>("/mobile/dashboard");

  const firstName = user?.name?.split(" ")[0] ?? "vos";

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
          issueLines={[
            `${data?.pendingCount ?? "—"} PENDIENTES`,
            `${data?.projectsCount ?? "—"} PROYECTOS`,
          ]}
        />

        <View style={{ marginTop: 8 }}>
          <HairlineRule
            label="Urgente esta semana"
            count={`${data?.urgentTasks.length ?? ""}`}
          />

          {loading && (
            <ActivityIndicator
              color={palette.inkFaint}
              style={{ marginTop: 24 }}
            />
          )}

          {error && (
            <Text
              style={{
                fontFamily: "Satoshi",
                fontSize: 14,
                color: palette.inkFaint,
                marginTop: 16,
              }}
            >
              {error}
            </Text>
          )}

          {!loading && !error && data?.urgentTasks.length === 0 && (
            <Text
              style={{
                fontFamily: "Satoshi-Italic",
                fontSize: 14,
                color: palette.inkFaint,
                marginTop: 16,
              }}
            >
              Sin tareas urgentes esta semana.
            </Text>
          )}

          {!loading && data && data.urgentTasks.length > 0 && (
            <HangingList>
              {data.urgentTasks.map((task, i) => (
                <HangingListItem key={task.id} index={i + 1}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Satoshi",
                          fontSize: 15,
                          fontWeight: task.isOverdue ? "700" : "500",
                          color: task.isOverdue ? palette.urgent : palette.ink,
                          lineHeight: 20,
                        }}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>
                      <View
                        style={{
                          marginTop: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {task.projectColor && (
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: task.projectColor,
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
                          {task.projectName}
                        </Text>
                      </View>
                    </View>
                    {task.dueDate && (
                      <Pill
                        label={task.isOverdue ? "vencida" : task.dueDate}
                        variant={task.isOverdue ? "urgent" : "neutral"}
                      />
                    )}
                  </View>
                </HangingListItem>
              ))}
            </HangingList>
          )}
        </View>

        <View
          style={{ marginTop: 40, flexDirection: "row", gap: 10, flexWrap: "wrap" }}
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
