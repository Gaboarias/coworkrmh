import { Text, View, useColorScheme } from "react-native";
import { COLORS } from "@/lib/theme";

interface EmptyStateProps {
  /** Título centrado en Satoshi medium. */
  title: string;
  /** Descripción opcional debajo del título, ink-soft. */
  description?: string;
  /** Icon opcional sobre el título (RN node, ej. lucide-react-native icon). */
  icon?: React.ReactNode;
  /** Acción opcional (botón). */
  action?: React.ReactNode;
}

/**
 * EmptyState (Edition 04 mobile).
 *
 * Estado vacío para listas/pantallas sin data. Vertical centrado, padding
 * generoso. Espejo del web src/components/shared/EmptyState.tsx.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 48,
        gap: 12,
      }}
    >
      {icon && <View style={{ marginBottom: 4 }}>{icon}</View>}
      <Text
        style={{
          fontFamily: "Satoshi",
          fontSize: 18,
          fontWeight: "700",
          color: palette.ink,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontFamily: "Satoshi",
            fontSize: 14,
            color: palette.inkSoft,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      )}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}
