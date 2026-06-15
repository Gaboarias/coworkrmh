import { Text, View, useColorScheme } from "react-native";
import { COLORS } from "@/lib/theme";

type Variant =
  | "urgent"  // bg-urgent, text white
  | "done"    // bg-done, text white
  | "info"    // bg-info, text white
  | "warn"    // bg-warn, text ink (yellow needs dark text)
  | "neutral" // bg-accent-soft, text ink-soft
  | "outline"; // border + ink-soft

interface PillProps {
  label: string;
  variant?: Variant;
  /** Custom override color (project color, etc). Si pasás esto, ignora variant. */
  customBg?: string;
  /** Tamaño: sm (default) o xs (más chico). */
  size?: "sm" | "xs";
}

/**
 * Pill — small caps mono badge. Equivalente a las clases `.pill-*` del web
 * en src/app/globals.css + el componente Badge.tsx.
 *
 * Visual: mono small-caps tracking 0.14em, padding 4x8, radius 2. Diseñado
 * para status, urgency, due dates, counts.
 */
export function Pill({
  label,
  variant = "neutral",
  customBg,
  size = "sm",
}: PillProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  const fs = size === "xs" ? 10 : 11;
  const py = size === "xs" ? 2 : 4;
  const px = size === "xs" ? 6 : 8;

  const { bg, color, borderWidth, borderColor } = customBg
    ? { bg: customBg, color: "#ffffff", borderWidth: 0, borderColor: "transparent" }
    : resolveVariant(variant, palette);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        paddingVertical: py,
        paddingHorizontal: px,
        borderRadius: 2,
        borderWidth,
        borderColor,
      }}
    >
      <Text
        style={{
          fontFamily: "JetBrainsMono_500Medium",
          fontSize: fs,
          letterSpacing: fs * 0.14,
          textTransform: "uppercase",
          fontWeight: "600",
          color,
          lineHeight: fs * 1.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function resolveVariant(
  variant: Variant,
  palette: typeof COLORS.light | typeof COLORS.dark
) {
  switch (variant) {
    case "urgent":
      return {
        bg: palette.urgent,
        color: "#ffffff",
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "done":
      return {
        bg: palette.done,
        color: "#ffffff",
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "info":
      return {
        bg: palette.info,
        color: "#ffffff",
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "warn":
      return {
        bg: palette.warn,
        color: palette.ink,
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "neutral":
      return {
        bg: palette.accentSoft,
        color: palette.inkSoft,
        borderWidth: 0,
        borderColor: "transparent",
      };
    case "outline":
      return {
        bg: "transparent",
        color: palette.inkSoft,
        borderWidth: 1,
        borderColor: palette.ruleStrong,
      };
  }
}
