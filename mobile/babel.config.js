/**
 * Babel config — Edition 04 mobile.
 *
 * - babel-preset-expo con jsxImportSource nativewind para que NativeWind
 *   intercepte className en components nativos.
 * - nativewind/babel transforma las clases tailwind en estilos RN.
 * - react-native-worklets/plugin requerido para Reanimated en SDK 56.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-worklets/plugin"],
  };
};
