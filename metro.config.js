const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Expo apps disable Metro's inlineRequires by default, which breaks
// react-native-worklets' native initialization pipeline (crashes with a JSI
// "isObject()" assertion in WorkletsModule::startCpp on Android, or
// "TypeError: right operand of 'in' is not an object" elsewhere) — worklets
// is a transitive dependency here (via expo-router -> @expo/ui ->
// react-native-reanimated), not something this app uses directly, but it
// still initializes eagerly on every app start. This is the documented
// workaround: https://github.com/software-mansion/react-native-reanimated/issues/9445
config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = withNativeWind(config, { input: "./global.css" });
