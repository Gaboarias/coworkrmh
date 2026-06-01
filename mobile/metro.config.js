/**
 * Metro config — Edition 04 mobile.
 *
 * withNativeWind aplica el preset al bundler así las clases tailwind
 * en className funcionan en components RN.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
