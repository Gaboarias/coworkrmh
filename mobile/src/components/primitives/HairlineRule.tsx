import { Text, View, useColorScheme } from "react-native";
import { COLORS } from "@/lib/theme";

interface HairlineRuleProps {
  label?: string;
  /** Conteo a la derecha de la regla (ej. "3 / 24"). */
  count?: string | number;
  /** Color override del label (default = ink-soft). Para enfatizar con
   *  project-color en pantallas de proyecto, pasar el hex. */
  labelColor?: string;
  /** Margen top extra. Default 0. */
  marginTop?: number;
}

/**
 * Hairline rule con label inline — gesto signature de Edition 04.
 *
 * Renderiza:  [LABEL] ──────────────────────── [COUNT]
 *
 * El label se separa de la regla con un gap, NO sobre la línea.
 * Mono small-caps tracking 0.14em, lectura como typesetter signature.
 *
 * Equivalente al web src/components/shared/HairlineRule.tsx pero en RN.
 */
export function HairlineRule({
  label,
  count,
  labelColor,
  marginTop = 0,
}: HairlineRuleProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop,
      }}
    >
      {label && (
        <Text
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 12,
            letterSpacing: 1.7,
            textTransform: "uppercase",
            color: labelColor ?? palette.inkSoft,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: palette.ruleStrong,
        }}
      />
      {count !== undefined && (
        <Text
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 12,
            letterSpacing: 0.7,
            color: palette.inkFaint,
          }}
        >
          {count}
        </Text>
      )}
    </View>
  );
}
