module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Jest cannot load the ESM builds that are picked by default.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  // Libraries that ship untranspiled TypeScript/ESM must be transformed too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|zustand|react-native-mmkv|react-native-nitro-modules|react-native-keychain)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/.bundle-check/'],
};
