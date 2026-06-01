import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  useColorScheme,
} from "react-native";
import { COLORS } from "@/lib/theme";

type Variant =
  | "primary"   // bg ink, text bg
  | "secondary" // outline ink
  | "ghost"     // transparent, hover bg-accent-soft
  | "danger"    // bg urgent
  | "done";     // bg done

type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  /** Texto del botón. Si pasás `children`, se usa eso (para íconos custom). */
  label?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Icono opcional ANTES del label (componente RN node). */
  iconLeft?: React.ReactNode;
  /** Si true, ocupa todo el ancho del padre. */
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const sizeMap: Record<Size, { height: number; px: number; fs: number }> = {
  sm: { height: 32, px: 12, fs: 13 },
  md: { height: 40, px: 16, fs: 14 },
  lg: { height: 48, px: 20, fs: 16 },
};

/**
 * Button (Edition 04 mobile).
 *
 * Variants espejos del web src/components/ui/Button.tsx — primary es ink
 * solid (no gradient), secondary outline ink, etc.
 *
 * Loading: muestra ActivityIndicator a la izquierda + label dimmed.
 * Disabled: opacity 0.5 + sin onPress.
 */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading,
  iconLeft,
  fullWidth,
  disabled,
  children,
  ...pressableProps
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;
  const isDisabled = disabled || loading;

  const sz = sizeMap[size];

  // Resolver colores por variant.
  const styles = resolveStyles(variant, palette);

  return (
    <Pressable
      {...pressableProps}
      disabled={isDisabled}
      style={({ pressed }) => ({
        height: sz.height,
        paddingHorizontal: sz.px,
        borderRadius: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: pressed && !isDisabled ? styles.bgPressed : styles.bg,
        borderWidth: styles.borderWidth,
        borderColor: styles.borderColor,
        opacity: isDisabled ? 0.5 : 1,
        alignSelf: fullWidth ? "stretch" : "flex-start",
      })}
    >
      {loading && (
        <ActivityIndicator color={styles.text} size="small" />
      )}
      {!loading && iconLeft && <View>{iconLeft}</View>}
      {children ? (
        children
      ) : label ? (
        <Text
          style={{
            fontFamily: "Satoshi",
            fontSize: sz.fs,
            fontWeight: "700",
            letterSpacing: -0.1,
            color: styles.text,
          }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function resolveStyles(
  variant: Variant,
  palette: typeof COLORS.light | typeof COLORS.dark
) {
  switch (variant) {
    case "primary":
      return {
        bg: palette.ink,
        bgPressed: palette.inkSoft,
        text: palette.bg,
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "secondary":
      return {
        bg: "transparent",
        bgPressed: palette.accentSoft,
        text: palette.ink,
        borderWidth: 1,
        borderColor: palette.ruleStrong,
      };
    case "ghost":
      return {
        bg: "transparent",
        bgPressed: palette.accentSoft,
        text: palette.inkSoft,
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "danger":
      return {
        bg: palette.urgent,
        bgPressed: palette.urgent,
        text: "#ffffff",
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "done":
      return {
        bg: palette.done,
        bgPressed: palette.done,
        text: "#ffffff",
        borderWidth: 0,
        borderColor: "transparent",
      };
  }
}
