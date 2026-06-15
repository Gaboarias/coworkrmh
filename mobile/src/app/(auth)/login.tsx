import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth-context";
import { COLORS } from "@/lib/theme";
import { ApiError } from "@/lib/api";

/**
 * Login screen — Edition 04 styled.
 *
 * Drop-line title: "Pistachio," / "iniciar sesión."
 * Inputs email + password con Edition 04 primitives portados a RN.
 * Submit → POST /api/auth/mobile-token → guarda token → redirect a (app).
 *
 * Mejoras futuras: forgot-password link, biometric unlock con SecureStore
 * stored credentials, "remember email" checkbox.
 */
export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? COLORS.dark : COLORS.light;
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.bg }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 48,
            paddingBottom: 32,
            justifyContent: "space-between",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            {/* Eyebrow */}
            <Text
              className="font-mono text-ink-faint"
              style={{
                fontSize: 12,
                letterSpacing: 1.7,
                textTransform: "uppercase",
              }}
            >
              / pistachio · m2 auth
            </Text>

            {/* Drop-line title */}
            <View style={{ marginTop: 16 }}>
              <Text
                className="text-ink"
                style={{
                  fontFamily: "Satoshi",
                  fontSize: 52,
                  lineHeight: 52 * 0.95,
                  letterSpacing: -2,
                  fontWeight: "700",
                }}
              >
                Pistachio,
              </Text>
              <Text
                className="text-ink-soft"
                style={{
                  fontFamily: "Satoshi-Italic",
                  fontSize: 52,
                  lineHeight: 52 * 0.95,
                  letterSpacing: -2,
                  fontWeight: "400",
                  paddingLeft: 28,
                  marginTop: -4,
                }}
              >
                iniciar sesión.
              </Text>
            </View>

            <Text
              className="text-ink-soft"
              style={{
                fontFamily: "Satoshi",
                fontSize: 15,
                lineHeight: 22,
                marginTop: 24,
              }}
            >
              Entrá con tu cuenta de Rewind Media House. Mismas credenciales
              que el web.
            </Text>

            {/* Form */}
            <View style={{ marginTop: 36, gap: 16 }}>
              <FormField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="vos@rewindmedia.house"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                palette={palette}
              />
              <FormField
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                palette={palette}
              />

              {error && (
                <View
                  style={{
                    backgroundColor: palette.urgent,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontFamily: "Satoshi",
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Submit button */}
          <View style={{ marginTop: 48 }}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                backgroundColor: canSubmit
                  ? pressed
                    ? palette.inkSoft
                    : palette.ink
                  : palette.ruleStrong,
                paddingVertical: 16,
                borderRadius: 6,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                opacity: canSubmit ? 1 : 0.6,
              })}
            >
              {loading && (
                <ActivityIndicator color={palette.bg} size="small" />
              )}
              <Text
                style={{
                  color: palette.bg,
                  fontFamily: "Satoshi",
                  fontSize: 16,
                  fontWeight: "700",
                  letterSpacing: -0.2,
                }}
              >
                {loading ? "Entrando…" : "Entrar"}
              </Text>
            </Pressable>

            <Text
              className="text-ink-faint"
              style={{
                fontFamily: "Satoshi",
                fontSize: 12,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              cowork-rmh.vercel.app
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FormFieldProps
  extends Omit<React.ComponentProps<typeof TextInput>, "style"> {
  label: string;
  palette: typeof COLORS.light | typeof COLORS.dark;
}

function FormField({ label, palette, ...inputProps }: FormFieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        className="font-mono text-ink-soft"
        style={{
          fontSize: 11,
          letterSpacing: 1.7,
          textTransform: "uppercase",
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={palette.inkFaint}
        style={{
          fontFamily: "Satoshi",
          fontSize: 16,
          color: palette.ink,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.ruleStrong,
          borderRadius: 6,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />
    </View>
  );
}
