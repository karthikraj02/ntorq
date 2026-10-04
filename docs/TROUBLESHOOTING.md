# Troubleshooting

## Setup and build

**`SDK location not found`** - Gradle can't find the Android SDK. Set `ANDROID_HOME`
(`%LOCALAPPDATA%\Android\Sdk`), or create `mobile/android/local.properties` containing
`sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk`. Restart the terminal after `setx`.

**Gradle complains about the Java version** - use JDK 17 or newer. In PowerShell:
`$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`. Check with `java -version`.

**`Failed to install the following Android SDK packages` / licence errors** - open Android Studio >
SDK Manager and install *Android SDK Platform 37*, *Build-Tools 37.0.0* and *NDK 27.1.12297006*, then
accept licences: `sdkmanager --licenses`.

**The first build takes very long / seems stuck** - the first Gradle run downloads Gradle itself and many
dependencies, then compiles the React Native native code. Several minutes (sometimes 10+) is normal.
Later builds are much faster.

**`adb` is not recognised** - add `%ANDROID_HOME%\platform-tools` to `PATH`.

**`adb devices` shows `unauthorized`** - unlock the phone and accept the "Allow USB debugging" prompt;
if it never appears, toggle USB debugging off and on.

**Port 8081 already in use** - another Metro is running. Close it, or `npm --prefix mobile start -- --port 8082`
(and `adb reverse tcp:8082 tcp:8082`).

**Red screen "Unable to load script"** - the phone can't reach Metro. Run `npm run adb:reverse`, make
sure `npm run mobile:start` is running, then shake the device > Reload.

**Very long paths / `ENAMETOOLONG` on Windows** - move the project to a short path such as `C:\dev\ntorq`
and enable long paths (`git config --system core.longpaths true`, and Windows' "Enable Win32 long paths").

**The release APK crashes on launch but the debug app works** - run
`npm --prefix mobile run bundle:check` first (it proves the JavaScript bundle builds), then
`adb logcat *:E` while launching to see the native error.

## The app cannot reach the backend

Check, in this order:

1. Is the API up? On the PC: `curl http://localhost:5000/api/health` should say `"database":"up"`.
2. **USB or emulator:** run `npm run adb:reverse`, then use `http://localhost:5000` in *Settings > Backend*.
3. **Phone on Wi-Fi:** use the PC's LAN address (`ipconfig`), e.g. `http://192.168.1.20:5000`, and allow
   inbound TCP 5000 in Windows Defender Firewall. Phone and PC must be on the same network.
4. **Release APK:** plain `http://` is blocked by design. Use an `https://` address (deploy the API behind
   TLS, or use a tunnel). The debug build allows plain HTTP.
5. *Settings > Backend > Save and test connection* shows the exact result.

The app keeps working offline either way; changes wait in the sync queue (*Account > Sync*, or the
Developer screen).

## Backend

**`Invalid server configuration`** - a required variable in `server/.env` is missing or too short. The
message names the variable, never its value. Copy `server/.env.example`; secrets need 32+ characters and
must differ from each other.

**`Could not connect to MongoDB`** - wrong `MONGODB_URI`, MongoDB not running, or (Atlas) your IP isn't
allowed. Docker: `npm run mongo:up`. Quick check without any database: `npm run server:dev:memory`.

**Atlas: `bad auth` / `ENOTFOUND`** - password special characters must be URL-encoded in the connection
string; make sure it is the `mongodb+srv://` string for *your* cluster.

**429 Too Many Requests** - the rate limiter. The auth endpoints (sign in, register, refresh) are limited to
20 requests per 15 minutes per address by default (`AUTH_RATE_LIMIT_MAX`). Wait, or raise it for development.

**Rate limiting groups everyone together behind a proxy** - set `TRUST_PROXY=1` when exactly one reverse
proxy sits in front of the API.

**`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` in the logs** - the same cause: a proxy is adding
`X-Forwarded-For` but `TRUST_PROXY` is not set.

**Every request returns 401 `TOKEN_EXPIRED`, or tokens stop working after a restart** - the JWT secrets in
`server/.env` changed. (`dev:memory` generates new random secrets each start, so it signs everyone out.)

**Dates are off by a few minutes between phone and server** - harmless; the server clamps client
timestamps that are more than 5 minutes in the future.

## Sync

**"N changes waiting to upload" never goes down** - open *Account*: if it says the session expired, sign
in again. Otherwise tap *Sync now* and read the message. Offline/server errors keep everything queued.

**"…change(s) were rejected by the server and skipped"** - the server refused one record's data (a value
out of range). Edit the record again to re-submit it; the Developer screen's log lists which one.

**I signed in on a new phone and my data isn't there** - tap *Sync now*. If the new phone already has its
own data it keeps it (nothing is merged across different scooters). To pull the account's scooter onto a
phone that already has data: *Settings > Clear local data*, sign in again, and it syncs automatically.

## Tests

### Server tests crash on Node 24 (Windows)

Symptom: `Worker exited unexpectedly with exit code 3221226505` in roughly one run in four, always from the
Vitest worker process. It also reproduces outside Vitest with plain Node 24.15 (repeated MongoDB
connect/disconnect cycles), while Node 22 LTS ran 20 of 20 clean. The API itself ran 8 × 800 requests on
Node 24 without trouble.

Fix: run the server tests under Node 22 LTS (`nvm use 22`, or <https://nodejs.org>). Re-running usually
passes if you can't switch. Nothing in the project's own code is involved.

### First server test run is slow

`mongodb-memory-server` downloads a MongoDB binary once and caches it.

### Mobile: `Failed to get NitroModules`

A test imported `react-native-mmkv` without the Jest mock. `jest.setup.js` provides it; make sure your
test is under `mobile/__tests__` and run Jest from `mobile/`.

## Starting over

- **Reset the app's data:** Settings > Clear local data (keeps theme and backend address), or Android
  Settings > Apps > Ntorq Companion > Storage > Clear storage (everything).
- **Reset Metro's cache:** `npm --prefix mobile start -- --reset-cache`
- **Clean native build:** `cd mobile\android; .\gradlew clean`
