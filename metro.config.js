const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Firebase JS SDK: necessário para resolver os módulos .cjs no React Native
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
