import { useFonts } from "expo-font";
import {
  useFonts as useGoogleFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

/**
 * Carga todas las fuentes Edition 04 — Satoshi (Fontshare TTF local) +
 * JetBrains Mono (Google Fonts via npm).
 *
 * Satoshi se carga vía expo-font con el archivo .ttf en /assets/fonts/.
 * El family name "Satoshi" matchea el nombre interno del TTF, así puede
 * referenciarse como `fontFamily: "Satoshi"` en estilos.
 *
 * Devuelve true cuando todas están listas — usar en _layout.tsx con
 * SplashScreen para no mostrar UI con fonts default mientras carga.
 */
export function useAppFonts(): boolean {
  // Satoshi (Fontshare) — un único variable font cubre 300-900 + italic
  const [satoshiLoaded] = useFonts({
    Satoshi: require("../../assets/fonts/Satoshi-Variable.ttf"),
    "Satoshi-Italic": require("../../assets/fonts/Satoshi-VariableItalic.ttf"),
  });

  // JetBrains Mono (Google) — 3 pesos: regular para body mono, medium
  // para labels small-caps (default Edition 04), bold para énfasis.
  const [jbMonoLoaded] = useGoogleFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  return satoshiLoaded && jbMonoLoaded;
}
