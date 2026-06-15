import { Text, View, useColorScheme } from "react-native";
import { COLORS } from "@/lib/theme";
import { IssueNumber } from "./IssueNumber";

interface PageHeaderProps {
  /**
   * Título principal — display 44px en Satoshi Bold (mobile-tuned, web era 60-84px).
   * Si pasás `subtitle`, se renderiza como drop-line (segunda línea italic indentada).
   */
  title: string;
  /** Segunda línea italic, indentada — drop-line pattern. */
  subtitle?: string;
  /** Eyebrow corto arriba del título, mono small-caps. Ej: "/ dashboard". */
  eyebrow?: string;
  /** Issue numeration en esquina top-right (opcional). */
  issueLines?: string[];
  /** Acciones (botones, etc) debajo del título. */
  actions?: React.ReactNode;
  /** Descripción opcional debajo del título. */
  description?: string;
  /** Padding bottom default 24, custom para tight layouts. */
  paddingBottom?: number;
}

/**
 * PageHeader (Edition 04 mobile).
 *
 * Gestos signature equivalentes al web:
 * - Eyebrow mono small-caps arriba
 * - Drop-line title: línea 1 bold + línea 2 italic indentada
 * - IssueNumber en top-right (opcional)
 *
 * Tamaños mobile-tuned:
 * - Title: 44px (web era 60-84px responsive — mobile no necesita ese escalon)
 * - Subtitle: mismo size, italic, ink-soft, indent 1.2em
 *
 * Equivalente al web src/components/shared/PageHeader.tsx.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  issueLines,
  actions,
  description,
  paddingBottom = 24,
}: PageHeaderProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <View style={{ position: "relative", paddingBottom }}>
      {issueLines && issueLines.length > 0 && (
        <IssueNumber lines={issueLines} absolute />
      )}

      {eyebrow && (
        <Text
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 12,
            letterSpacing: 1.9,
            textTransform: "uppercase",
            color: palette.inkFaint,
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </Text>
      )}

      {/* Drop-line title */}
      <View>
        <Text
          style={{
            fontFamily: "Satoshi",
            fontSize: 44,
            lineHeight: 44 * 0.95,
            letterSpacing: -1.7,
            fontWeight: "700",
            color: palette.ink,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: "Satoshi-Italic",
              fontSize: 44,
              lineHeight: 44 * 0.95,
              letterSpacing: -1.7,
              fontWeight: "400",
              fontStyle: "italic",
              color: palette.inkSoft,
              paddingLeft: 24,
              marginTop: -2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {description && (
        <Text
          style={{
            fontFamily: "Satoshi",
            fontSize: 15,
            lineHeight: 22,
            color: palette.inkSoft,
            marginTop: 20,
            maxWidth: "95%",
          }}
        >
          {description}
        </Text>
      )}

      {actions && (
        <View
          style={{
            marginTop: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {actions}
        </View>
      )}
    </View>
  );
}
