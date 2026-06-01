import { forwardRef } from "react";
import {
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from "react-native";
import { COLORS } from "@/lib/theme";

interface InputProps extends Omit<TextInputProps, "style"> {
  /** Label arriba del input. */
  label?: string;
  /** Error message debajo del input — si presente, border-color = urgent. */
  error?: string;
  /** Helper text debajo del input (sólo si no hay error). */
  helper?: string;
}

/**
 * Input (Edition 04 mobile).
 *
 * Border hairline (rule-strong), placeholder ink-faint, focus border-ink.
 * aria-invalid (via prop error) cambia border a urgent.
 *
 * Espejo del web src/components/ui/Input.tsx.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helper, ...inputProps },
  ref
) {
  const colorScheme = useColorScheme();
  const palette = colorScheme === "dark" ? COLORS.dark : COLORS.light;
  const hasError = !!error;

  return (
    <View style={{ gap: 8 }}>
      {label && (
        <Text
          style={{
            fontFamily: "JetBrainsMono_500Medium",
            fontSize: 11,
            letterSpacing: 1.7,
            textTransform: "uppercase",
            fontWeight: "600",
            color: palette.inkSoft,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        {...inputProps}
        placeholderTextColor={palette.inkFaint}
        style={{
          fontFamily: "Satoshi",
          fontSize: 16,
          color: palette.ink,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: hasError ? palette.urgent : palette.ruleStrong,
          borderRadius: 6,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />
      {(error || helper) && (
        <Text
          style={{
            fontFamily: "Satoshi",
            fontSize: 12,
            color: hasError ? palette.urgent : palette.inkFaint,
          }}
        >
          {error ?? helper}
        </Text>
      )}
    </View>
  );
});
