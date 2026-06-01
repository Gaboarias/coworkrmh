import { Text, View, useColorScheme } from "react-native";
import { COLORS } from "@/lib/theme";

interface IssueNumberProps {
  /** 1-3 strings, una por línea. Ej:
   *  ["Ed. 04 · MAY 30", "22 / 187 ACTIVAS"]
   *  Cada string se muestra en su propia línea, mono small-caps right-aligned.
   */
  lines: string[];
  /** Si true, position absolute top-right del padre (default). Si false,
   *  fluye normal en el layout. */
  absolute?: boolean;
}

/**
 * Issue numeration — gesto signature de Edition 04.
 *
 * Renderiza en la esquina top-right del PageHeader un bloque mono
 * small-caps con líneas tipo identificador editorial.
 * Da identidad de "número de revista".
 *
 * Equivalente al web src/components/shared/IssueNumber.tsx.
 */
export function IssueNumber({ lines, absolute = true }: IssueNumberProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  const content = lines.map((line, i) => (
    <Text
      key={i}
      style={{
        fontFamily: "JetBrainsMono_500Medium",
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: palette.inkFaint,
        textAlign: "right",
        lineHeight: 16,
      }}
    >
      {line}
    </Text>
  ));

  if (absolute) {
    return (
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          alignItems: "flex-end",
        }}
      >
        {content}
      </View>
    );
  }

  return <View style={{ alignItems: "flex-end" }}>{content}</View>;
}
