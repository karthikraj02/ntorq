/* eslint-env jest */

// Native modules that have no JavaScript implementation under Jest.

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// MMKV loads a Nitro native module when imported, so use a tiny in-memory stand-in.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const data = new Map();
    return {
      getString: key => data.get(key),
      set: (key, value) => {
        data.set(key, value);
      },
      remove: key => data.delete(key),
      clearAll: () => data.clear(),
    };
  },
}));

jest.mock('react-native-keychain', () => {
  let stored = null;
  return {
    setGenericPassword: jest.fn(async (username, password) => {
      stored = { username, password, service: 'test', storage: 'test' };
      return stored;
    }),
    getGenericPassword: jest.fn(async () => stored ?? false),
    resetGenericPassword: jest.fn(async () => {
      stored = null;
      return true;
    }),
  };
});

require('./src/utils/logger').setLogEcho(false);
