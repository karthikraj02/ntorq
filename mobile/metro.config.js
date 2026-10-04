const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * `../shared` holds the TypeScript types and constants shared with the API.
 * It sits outside this project, so Metro has to be told to watch it.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../shared')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
