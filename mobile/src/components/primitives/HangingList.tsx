import { Text, View, useColorScheme } from "react-native";
import { COLORS } from "@/lib/theme";

interface HangingListItemProps {
  /** Número de orden (1, 2, 3...). Se renderiza como "01", "02" en JBMono. */
  index: number;
  /** Children = el contenido principal del item. Puede ser Pressable, Link, etc. */
  children: React.ReactNode;
  /** Color del número (default ink-faint). Para enfatizar con accent en
   *  pantallas de proyecto, pasar hex específico. */
  numberColor?: string;
}

/**
 * Hanging list — patrón signature de Edition 04 mobile.
 *
 * Renderiza un item de lista con un número colgando en el margen izquierdo
 * (mono small-caps small), línea hairline arriba (excepto el primer item),
 * padding vertical generoso para respiración.
 *
 * Container: usar `HangingList` wrapper que aplica paddingLeft 36 (para
 * que los números queden visibles a left:-36 absolute).
 *
 * Equivalente a las clases .h-list / .h-list-item del web globals.css.
 */
export function HangingListItem({
  index,
  children,
  numberColor,
}: HangingListItemProps) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <View
      style={{
        position: "relative",
        paddingVertical: 14,
        borderTopWidth: index === 1 ? 0 : 1,
        borderColor: palette.rule,
      }}
    >
      <Text
        style={{
          position: "absolute",
          left: -36,
          top: 16,
          width: 28,
          textAlign: "right",
          fontFamily: "JetBrainsMono_500Medium",
          fontSize: 13,
          letterSpacing: 0.5,
          color: numberColor ?? palette.inkFaint,
        }}
      >
        {String(index).padStart(2, "0")}
      </Text>
      {children}
    </View>
  );
}

interface HangingListProps {
  children: React.ReactNode;
  marginTop?: number;
}

/**
 * Wrapper de hanging list — aplica paddingLeft 36 para dejar espacio a los
 * números absolute-positioned. Usar como contenedor de HangingListItem.
 */
export function HangingList({ children, marginTop = 12 }: HangingListProps) {
  return (
    <View style={{ paddingLeft: 36, marginTop }}>{children}</View>
  );
}
