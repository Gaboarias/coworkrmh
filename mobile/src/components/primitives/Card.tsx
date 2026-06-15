import { View, Text, useColorScheme, type ViewProps } from "react-native";
import { COLORS } from "@/lib/theme";

interface CardProps extends ViewProps {
  /** Si true, agrega borde hairline (default true). */
  bordered?: boolean;
  /** Padding interno default 20. */
  padding?: number;
}

/**
 * Card (Edition 04 mobile).
 *
 * Surface sólida con border hairline, sin shadows, sin blur, radius md.
 * Espejo del web src/components/ui/Card.tsx.
 *
 * Usar para contenedores semánticos (no decorativos). Mobile: cards son
 * raras; preferir h-list / hairline rule cuando posible.
 */
export function Card({
  bordered = true,
  padding = 20,
  style,
  children,
  ...rest
}: CardProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: 8,
          padding,
          borderWidth: bordered ? 1 : 0,
          borderColor: palette.rule,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
}

export function CardTitle({ children }: CardTitleProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;
  return (
    <Text
      style={{
        fontFamily: "Satoshi",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: -0.3,
        color: palette.ink,
      }}
    >
      {children}
    </Text>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

export function CardDescription({ children }: CardDescriptionProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;
  return (
    <Text
      style={{
        fontFamily: "Satoshi",
        fontSize: 14,
        color: palette.inkSoft,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}
