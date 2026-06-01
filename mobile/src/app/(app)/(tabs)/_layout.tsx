import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import {
  Home as HomeIcon,
  ListChecks,
  FolderKanban,
  EllipsisVertical,
} from "lucide-react-native";

import { COLORS } from "@/lib/theme";

/**
 * Tab bar bottom navigation (Edition 04 mobile · M3).
 *
 * 4 tabs principales:
 * - index (Inicio) — Dashboard
 * - tasks (Tareas) — My tasks
 * - projects (Proyectos) — Project list
 * - more (Más) — Settings + sign out + theme + notifications
 *
 * Visual: border-top hairline rule, bg-bg (mismo que main screen, sólo se
 * distingue por la línea), icons + labels chicos mono small-caps.
 * Active state: text-ink, inactive text-ink-faint.
 *
 * Otras pantallas (proyecto detail, settings de proyecto, etc) se pushean
 * desde el (app) Stack — viven encima de los tabs.
 */
export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.bg,
          borderTopColor: palette.rule,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.inkFaint,
        tabBarLabelStyle: {
          fontFamily: "JetBrainsMono_500Medium",
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <HomeIcon size={20} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tareas",
          tabBarIcon: ({ color }) => (
            <ListChecks size={20} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Proyectos",
          tabBarIcon: ({ color }) => (
            <FolderKanban size={20} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: ({ color }) => (
            <EllipsisVertical size={20} color={color} strokeWidth={1.75} />
          ),
        }}
      />
    </Tabs>
  );
}
