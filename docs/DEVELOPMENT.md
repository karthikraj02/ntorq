# Development guide

## Daily workflow

```powershell
npm run server:dev:memory     # API on :5000 with a throw-away database   (or server:dev with a real MongoDB)
npm run mobile:start          # Metro on :8081
npm run mobile:android        # build + install the debug app
npm run adb:reverse           # let the phone reach :5000 and :8081 over USB
```

Edit code in `mobile/src` and the app reloads (Fast Refresh). Server code reloads automatically
(`tsx watch`). Changing anything in `shared/` is picked up by both.

## Before you commit

```powershell
npm run typecheck
npm run lint
npm test
```

Formatting: Prettier. The mobile app uses its template config (Prettier 2.8); the server uses Prettier 3 -
run `npm --prefix mobile run format` / `npm --prefix server run format`.

## Conventions

- **TypeScript strict** everywhere, plus `noUncheckedIndexedAccess`.
- **Logic in plain functions**, UI in components. If it has an `if` that matters (status, trip maths,
  validation, formatting) it lives in `utils/` or `services/` and has a unit test.
- **No inline styles.** Use `Row`/`Stack`, `StyleSheet.create`, or `useThemedStyles`. ESLint enforces it.
- **No fabricated values.** Missing data is `null`/absent and rendered `N/A` (`NOT_AVAILABLE` from
  `utils/format`). Simulated data is tagged `source: 'mock'`.
- **Imports:** `@/…` is `mobile/src`, `@shared/…` is `/shared`.
- **Icons:** add new ones to `components/ui/icons.ts` (per-icon imports keep the bundle small).
- **New synced resource?** Add the DTO in `shared/types`, a Mongoose model, Zod schemas in
  `server/src/validators/resources.ts`, one `createSyncResourceController` call in `routes/index.ts`, a
  store with `enqueueSync(...)` calls, and an adapter in `services/sync/adapters.ts`. The shared sync
  tests in `server/test/sync.test.ts` cover the contract if you add the resource to their list.
- **Never log** passwords, tokens or e-mail addresses (both loggers scrub them; don't rely on that alone).

## Adding a vehicle source (Phase 2)

Implement `VehicleSource` (`services/vehicle/VehicleSource.ts`), register it in
`services/vehicle/index.ts`, and add its id to `VehicleSourceId`. Declare only the capabilities you have
*verified*; everything else stays `'unavailable'` and the UI adapts. No screen needs to change.

## Testing notes

- **Server** (`server/test`): Vitest + `mongodb-memory-server`. Every file gets its own database. The
  first run downloads a MongoDB binary. Use Node 22 LTS on Windows if you see the intermittent worker
  crash described in [TROUBLESHOOTING](TROUBLESHOOTING.md#server-tests-crash-on-node-24-windows).
- **Mobile** (`mobile/__tests__`): Jest. `jest.setup.js` replaces native modules (keychain, MMKV, NetInfo,
  safe-area). Screen tests render real screens through `test-utils/render.tsx` and drive them by
  accessibility label.
- Tests never assume an Ntorq packet format.

## What has and has not been verified

Everything below was run on a Windows 11 machine **without** the Android SDK, a JDK or a device:

| Verified | How |
| --- | --- |
| Server compiles, lints, builds (`tsup`), 0 `npm audit` findings in production dependencies | tsc / eslint / build / audit |
| API behaviour | Automated tests against a real MongoDB; also run as a live server and exercised with `curl` |
| App logic and screens | Automated tests; screens rendered in-process with `react-test-renderer` |
| App compiles to a production Android JS bundle | `npm --prefix mobile run bundle:check` (Metro; ~1.6 MB) |
| App-generated data is accepted by the real API | Payloads produced by the app's own stores were replayed against the live API |

| **Not** verified here | What to do |
| --- | --- |
| Gradle / native Android build, APK installation, on-device rendering and performance | Build it (README) and look at it; report anything off |
| Native modules at runtime (MMKV, Keychain, NetInfo, SVG) on a real device | Sign in, force-close, reopen: you should still be signed in; data should persist |
| The manifest permission removals (see README) | Same check as above |
| Layout on your screen sizes / light theme | Look through every screen in both themes |
| `npm audit` for the mobile dev tooling: `braces` (via the React Native CLI's file-globbing) is reported as high severity | Build-time tooling only, not part of the app; wait for the React Native CLI to update |

## Releasing a new APK

1. Bump `versionCode` and `versionName` in `mobile/android/app/build.gradle`.
2. `npm run mobile:apk` (signed with your release key if configured, otherwise the debug key).
3. Keep the keystore backed up; never commit it.
