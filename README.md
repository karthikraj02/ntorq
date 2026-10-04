# Ntorq Companion

**Smart Dashboard for Ntorq 125 Race XP** - *Your scooter. Your data.*

A personal companion app for a TVS Ntorq 125 Race XP BS6, built as an alternative to TVS Connect.
It is a React Native (Android) app with an offline-first design, plus an optional Node.js/Express/MongoDB
backend for backup and sync.

> **Project status: Phase 1 of 6 is complete.** The app is fully usable with a built-in **mock vehicle**
> (simulated data). **Nothing talks to the real scooter yet.** Bluetooth discovery is Phase 2.
> See [What works today](#what-works-today) and [What is not implemented yet](#what-is-not-implemented-yet).

## Ground rules

- **No guessed protocol.** The scooter's Bluetooth protocol is not publicly documented. The app never
  claims a UUID, packet, command or fault code that has not been verified on your own scooter.
  Anything unknown is shown as `N/A` / `UNKNOWN`, never as a made-up value.
- **Read-only first.** No write or command capability exists. Oil-reminder reset on the instrument
  cluster is `NOT_SUPPORTED` and says so.
- **Your data stays on your phone first.** The app works without internet and without an account.
- **Mock data is always labelled** `MOCK VEHICLE` and is never mixed into your real history or synced.
- No immobiliser, anti-theft, ECU-security or safety-system features, now or later.

## What works today

| Area | Status |
| --- | --- |
| Dark dashboard (speed gauge, RPM, fuel, battery, odometer, trip, service, diagnostics status) | Working with the mock vehicle |
| Mock vehicle (simulated speed / RPM / fuel / battery) | Working, clearly labelled |
| Ride recording (start / pause / end, distance, average, max, history) | Working (from mock telemetry) |
| Service reminders (11 item types, OK / DUE SOON / DUE / OVERDUE, your own intervals) | Working |
| Oil-change reminder: **APP reminder** vs **VEHICLE CLUSTER reminder** | Working; cluster reset reports `NOT_SUPPORTED` |
| Maintenance history (parts, oil, cost, workshop, notes) and "mark completed" | Working |
| Vehicle profile (name, year, registration, VIN, engine no., odometer) | Working |
| Local storage (MMKV) and offline use | Working |
| Account (register / sign in), secure token storage, token refresh | Working |
| Offline sync queue + last-write-wins sync with the server | Working |
| Data export (JSON / CSV / TXT) via the Android share sheet | Working |
| Light / dark / system theme, service thresholds, backend address | Working |
| REST API, JWT auth, MongoDB models | Working (covered by automated tests) |

## What is not implemented yet

| Phase | Planned |
| --- | --- |
| **2** | Bluetooth scanner, connection, service/characteristic discovery, Developer tools, Android Bluetooth permissions |
| **3** | Packet logger, protocol capture, raw packet viewer, protocol database (`protocols/ntorq-race-xp.json`) |
| **4** | Verified telemetry parsing (speed, RPM, fuel, battery, trip), charts, GPS routes |
| **5** | Diagnostics and error codes, receipt images, local notifications |
| **6** | Vehicle commands - only after the exact protocol has been verified on your scooter |

Also deferred: iOS (not a goal), Socket.IO live telemetry (Phase 4, when there is live data to stream),
imperial units, a native date picker (dates are typed as `YYYY-MM-DD` with a "Today" button).

## Repository layout

```
ntorq-companion/
├── mobile/            React Native app (TypeScript, Android)
│   ├── android/       Native Android project
│   ├── src/           App source (see docs/ARCHITECTURE.md)
│   ├── __tests__/     Jest tests
│   └── test-utils/    Test helpers
├── server/            Express + TypeScript + MongoDB API
│   ├── src/           controllers, routes, models, middleware, services, validators, config, utils
│   ├── test/          Vitest + in-memory MongoDB tests
│   └── scripts/       dev-memory.ts (run the API with a throw-away database)
├── shared/            Types and constants used by both (consumed as TypeScript source)
├── docs/              ARCHITECTURE, DEVELOPMENT, BLE_PROTOCOL, TROUBLESHOOTING
├── docker-compose.yml Optional local MongoDB
├── .env.example       Root settings (docker-compose only)
└── package.json       Convenience scripts that call into mobile/ and server/
```

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | **22 LTS** recommended (22.11 or newer required) | Node 24 works for the app and API; see the note in [Troubleshooting](docs/TROUBLESHOOTING.md#server-tests-crash-on-node-24-windows) |
| npm | 10+ | Comes with Node |
| JDK | 17 or newer | Android Studio's bundled JDK is fine |
| Android Studio | current stable | Provides the SDK, platform tools and emulator |
| Android SDK | Platform **37**, Build-Tools **37.0.0**, NDK **27.1.12297006** | Gradle uses these exact versions; Android Studio's SDK Manager or Gradle will install them |
| Android device | Android 7.0+ (API 24+) | `minSdk 24`, `targetSdk 36`. React Native 0.87 with the New Architecture |
| MongoDB | 6+ | **Optional for trying things out** (see below) |

Windows environment variables (set once, then restart your terminal):

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
# add to PATH:  %ANDROID_HOME%\platform-tools
```

## Installation

```powershell
cd ntorq-companion
npm run install:all          # installs server/ and mobile/ dependencies
```

(or run `npm install` inside `server/` and inside `mobile/`).

## Backend

### Environment variables

`server/.env.example` lists every variable. Copy it and fill it in - **never commit `.env`**.

| Variable | Required | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signs access tokens (32+ characters) |
| `JWT_REFRESH_SECRET` | yes | Signs refresh tokens (32+ characters, different from the above) |
| `PORT` | no (5000) | HTTP port |
| `CORS_ORIGIN` | no | Comma-separated browser origins allowed to call the API. Empty = none (the mobile app does not need CORS) |
| `ACCESS_TOKEN_TTL_SECONDS` | no (900) | Access-token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | no (30) | Refresh-token lifetime |
| `TRUST_PROXY` | no (0) | Set `1` behind one reverse proxy so rate limiting sees real client IPs |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | no | Request throttling (general / sign-in) |
| `LOG_LEVEL` | no (info) | `debug`, `info`, `warn`, `error`, `silent` |

Generate strong secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Option A - try it right now, no database install

```powershell
npm run server:dev:memory
```

Starts the API on <http://localhost:5000> with a throw-away in-memory MongoDB and random secrets.
**Data is lost when you stop it.** The first run downloads a MongoDB binary (one-time download, cached afterwards).

### Option B - local MongoDB with Docker

```powershell
npm run mongo:up
copy server\.env.example server\.env       # then fill in the secrets; set
                                           # MONGODB_URI=mongodb://127.0.0.1:27017/ntorq-companion
npm run server:dev
```

### Option C - MongoDB Atlas (free tier)

1. Create a free cluster at <https://www.mongodb.com/atlas>, a database user, and allow your IP.
2. Copy the `mongodb+srv://...` connection string into `MONGODB_URI` in `server/.env`
   (add the database name, e.g. `/ntorq-companion`).
3. `npm run server:dev`

### Option D - MongoDB installed on Windows

Install MongoDB Community Server (it runs as a service) and use
`MONGODB_URI=mongodb://127.0.0.1:27017/ntorq-companion`.

### Check it is running

```powershell
curl http://localhost:5000/api/health
# {"status":"ok","time":"...","database":"up"}
```

### Production build

```powershell
npm run server:build
npm run server:start         # node dist/index.js  (reads server/.env)
```

Put it behind HTTPS (a reverse proxy such as Caddy or nginx, or a platform that terminates TLS) and set
`TRUST_PROXY=1`. Release builds of the Android app refuse plain `http://` addresses.

## Mobile app

### Run on an emulator or a USB-connected phone

1. Start an emulator in Android Studio (Device Manager), **or** enable *Developer options* and *USB
   debugging* on your phone and plug it in. Check with `adb devices`.
2. Start Metro and build/install the app:

   ```powershell
   npm run mobile:start             # terminal 1 - Metro bundler (port 8081)
   npm run mobile:android           # terminal 2 - builds and installs the debug app
   ```

3. Let the app reach the API running on your PC (only needed if you use the backend):

   ```powershell
   npm run adb:reverse              # forwards ports 5000 (API) and 8081 (Metro) over USB
   ```

   The app's default backend address, `http://localhost:5000`, then works on both the emulator and a
   USB-connected phone. For a phone on Wi-Fi without USB, type your PC's address (for example
   `http://192.168.1.20:5000`) in **Settings > Backend**, and allow port 5000 through Windows Firewall.

The first Gradle build downloads a lot and takes several minutes.

### Expected result

1. A splash screen (**Ntorq Companion** - *Your scooter. Your data.*) for about 1.5 seconds.
2. The **Home** dashboard, with a purple **MOCK VEHICLE** banner, `DISCONNECTED`, and `N/A` in every
   telemetry tile - no invented numbers.
3. Tap **Start mock vehicle**: the state becomes `CONNECTED`, the speed gauge, RPM, fuel and battery
   move, all labelled `MOCK`.
4. **Vehicle tab:** enter your odometer. **Service tab > Oil change > Edit schedule:** enter your own
   interval and last oil change. The Home card then reads, for example, **Due in 800 km**.

### Android permissions

Phase 1 declares only:

| Permission | Why |
| --- | --- |
| `INTERNET` | Talk to your own backend (sync). The app works offline without it |
| `ACCESS_NETWORK_STATE` | Know when the network returns so a sync can start |

Two libraries declare extra permissions that this app does not need (`USE_BIOMETRIC` / `USE_FINGERPRINT`
from the secure-storage library, `ACCESS_WIFI_STATE` from the connectivity library). They are removed in
`mobile/android/app/src/main/AndroidManifest.xml`; both libraries check for these permissions before using
them. **Please confirm on your phone** that signing in, closing the app and reopening it keeps you signed in.

No Bluetooth, location or notification permission is requested yet - Phase 2 adds
`BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` (Android 12+) with an explanation of why, and Phase 4 adds
location only if you enable GPS routes.

### Build an APK

```powershell
npm run mobile:apk
# -> mobile\android\app\build\outputs\apk\release\app-release.apk
```

Install it with `adb install -r mobile\android\app\build\outputs\apk\release\app-release.apk` or copy
the file to your phone.

By default the release APK is signed with the **debug key** - fine for your own phone, not for
publishing. To sign with your own key:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore ntorq-release.keystore -alias ntorq -keyalg RSA -keysize 2048 -validity 10000
```

Then add these lines to `%USERPROFILE%\.gradle\gradle.properties` (not to the repository):

```
NTORQ_RELEASE_STORE_FILE=C:/path/to/ntorq-release.keystore
NTORQ_RELEASE_STORE_PASSWORD=...
NTORQ_RELEASE_KEY_ALIAS=ntorq
NTORQ_RELEASE_KEY_PASSWORD=...
```

Back up that keystore: you cannot update an installed app with a different key.

> **Backend from a standalone APK:** release builds block plain `http://`. To sync from a release APK,
> point it at an `https://` address (a deployed server, or a tunnel such as Cloudflare Tunnel / Tailscale).
> Without a backend the app works fully offline.

## Using mock mode

Mock mode is the default and needs no scooter. It lets you build and test everything:

- **Home > Start mock vehicle** produces simulated speed (idle, accelerate, cruise, brake), RPM, fuel
  burn and battery voltage. It deliberately provides **no odometer and no engine temperature**, so you
  can see how `N/A` behaves, and it **never changes your real odometer**.
- **Ride tab > Start ride** records the simulated ride. Mock rides carry a `MOCK` badge, are never
  uploaded, and can be removed with **Clear mock rides**.

## Connecting to the Ntorq, protocol discovery, packet logging

Not implemented yet (Phases 2-3). The plan, and the rules that keep it honest, are in
[docs/BLE_PROTOCOL.md](docs/BLE_PROTOCOL.md). When Phase 2 lands you will scan for the scooter,
connect, and browse its services and characteristics; Phase 3 adds raw packet capture and export so the
protocol can be worked out from real traffic.

## Tests and quality checks

```powershell
npm test                 # server (Vitest) + mobile (Jest)
npm run typecheck        # TypeScript strict mode, both packages
npm run lint             # ESLint, both packages
```

- **Server:** authentication and token rotation, input validation, every synced resource
  (last-write-wins, soft delete, ownership isolation), protocol captures, models, security headers,
  CORS, rate limiting.
- **Mobile:** service-status calculation, trip calculation, mock vehicle, vehicle service,
  validation, export formats, stores, sync engine, API client, and screen-level smoke tests.
- The server tests start an in-memory MongoDB (downloaded on first run).
- Tests deliberately make **no assumptions about Ntorq packet formats**.

## Security notes and limitations

- Passwords are hashed with **argon2id**. Access tokens last 15 minutes; refresh tokens rotate on every
  use, and a replayed token revokes the whole session.
- Tokens are stored in the **Android Keystore-backed keychain**, never in plain storage.
- The API uses Helmet, a CORS allow-list (empty by default), request validation (Zod), and rate limiting
  (stricter on sign-in). Logs never contain passwords, tokens or email addresses.
- Android backup of app data is disabled. Plain `http://` is blocked in release builds.
- The local database (MMKV) is **not encrypted** on the phone; it relies on Android's app sandbox and
  device lock. Don't store anything there you wouldn't keep in any other app's private storage.
- Signing in is optional. Deleting an account from the server is not implemented yet.
- The app reads nothing from, and sends nothing to, the scooter. It cannot affect the vehicle.

## More documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - how the pieces fit together
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - day-to-day development, conventions, verification status
- [docs/BLE_PROTOCOL.md](docs/BLE_PROTOCOL.md) - protocol research rules and workflow
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - common problems and fixes
