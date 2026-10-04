# Architecture

## Big picture

```
                    ┌────────────────────────────── Phone (works fully offline) ──────────────────────────────┐
                    │                                                                                         │
                    │   Screens / components  (React Native, themed, no business logic)                       │
                    │            │                                   │                                        │
                    │            ▼                                   ▼                                        │
                    │      VehicleService  ◄── VehicleSource      Zustand stores ◄──► MMKV (on-device)        │
                    │   (only door to vehicle     mock today;      scooter · reminders · maintenance ·        │
                    │    data; Phase 2: BLE)      BLE in Phase 2   rides · settings · auth · sync queue       │
                    │            │                                   │                                        │
                    │            ▼                                   ▼                                        │
                    │    RideRecorder / TripAccumulator        SyncService  ──►  axios client                 │
                    │                                                              (token refresh)            │
                    └──────────────────────────────────────────────────────────────┼──────────────────────────┘
                                                                                   │  HTTPS, JWT
                                                                       ┌───────────▼───────────┐
                                                                       │  Express API (Node)   │
                                                                       │  Zod · Helmet · rate  │
                                                                       │  limits · argon2      │
                                                                       └───────────┬───────────┘
                                                                                   │ Mongoose
                                                                              MongoDB
```

The rule that shapes everything: **the UI never talks to Bluetooth.** Screens read state from stores;
the vehicle layer writes to the stores. That is why a mock vehicle can stand in for the scooter today and a
Bluetooth source can replace it in Phase 2 without touching a single screen.

## Mobile app (`mobile/src`)

| Folder | Responsibility |
| --- | --- |
| `screens/` | One component per screen. They compose components and call services/stores. |
| `components/ui/` | Design-system pieces: `AppText`, `Card`, `Button`, `Pill`, `Row`/`Stack`, `TextField`, `SelectField`, `DateField`, `Banner`, `EmptyState`, settings rows, … |
| `components/dashboard/`, `service/`, `settings/`, `charts/` | Feature components (speed gauge, metric tiles, service cards, …). |
| `navigation/` | Root stack (splash, settings, edit screens) and five bottom tabs (Home, Ride, Service, Diagnostics, Vehicle). Settings (gear icon) and Developer tools (Settings > Developer mode) are screens on the root stack. |
| `store/` | Zustand stores. Persisted ones use MMKV; `vehicleStore` and `tripStore` are in-memory on purpose. |
| `services/vehicle/` | `VehicleService` + `VehicleSource` interface + `MockVehicleSource`. |
| `services/telemetry/` | `TripAccumulator` (distance/time/speed maths), `RideRecorder` (start/pause/end), readings helper. |
| `services/maintenance/` | `serviceCalculations` (status logic), `maintenanceActions` (record a service). |
| `services/api/` | axios client with single-flight token refresh, keychain token storage, error classification. |
| `services/sync/` | Offline sync engine and per-collection adapters. |
| `services/export/` | JSON/CSV/TXT exporters. |
| `theme/` | Colour palettes (dark/light), spacing, typography, `useThemedStyles`. |
| `hooks/`, `utils/`, `types/`, `constants/` | Small shared pieces. Pure functions live in `utils/` and are unit-tested. |

`protocol/` (discovery, parsers, commands, definitions) and `services/bluetooth/`, `services/diagnostics/`
are intentionally not created yet. They arrive with the phases that need them, so nothing in the tree is a
placeholder pretending to be an implementation.

### Telemetry honesty

Every reading is a `TelemetryReading`:

```ts
{ value: 67, unit: 'km/h', timestamp: 1759500000000, source: 'mock', verified: false }
```

A parameter the vehicle doesn't provide is simply **absent** from the snapshot and the UI renders `N/A`.
The mock source tags everything `source: 'mock', verified: false` and omits odometer and engine
temperature. Disconnecting clears the snapshot so a stale number never looks current.

### Vehicle commands

`VehicleService.resetOilReminder()` is the slot where a verified command will go. Today it checks the
vehicle's capability flags and returns `NOT_SUPPORTED` with the message *"Vehicle-level reset
unavailable…"*; it sends nothing. The UI keeps two clearly separate things:

- **APP REMINDER** - stored in this app, editable, driven by *your* intervals.
- **VEHICLE CLUSTER REMINDER** - what the scooter's own display shows. Not readable, not resettable.

### Service status

`evaluateReminder()` is a pure function. For each reminder it computes the next-due point from
*last service + your interval* (or your manual override), compares it with the odometer (distance) and
today's date (time), and takes the more urgent of the two:

| Remaining | Status |
| --- | --- |
| more than "due soon" away | `OK` |
| within "due soon" (default 200 km / 14 days) | `DUE_SOON` |
| 0 or past due, within the overdue margin (default 100 km / 7 days) | `DUE` |
| further past due | `OVERDUE` |
| no interval, or no odometer for a distance-only schedule | `NOT_SET` |

The thresholds are app defaults the rider can change in Settings. **They are not manufacturer
intervals**, and no interval is pre-filled.

### Ride recording

`TripAccumulator` integrates speed with the trapezoid rule. It never adds distance across a gap longer
than 5 s, treats an unavailable speed as a break (not zero), excludes paused time, and counts "riding
time" only while moving. Average speed = distance ÷ riding time. Losing the connection pauses the ride.

## Offline-first data and sync

All data is written to the phone first. Every synced record has a **client-generated UUID**, `createdAt`,
`updatedAt` and `deletedAt`.

```
rider edits something
   └─► store updates (instantly, persisted in MMKV)
        └─► syncStore.queue gets ONE entry per record: { entity, id, upsert | delete }

later (online + signed in, on reconnect / app foreground / a few seconds after an edit / "Sync now"):
   PUSH  for each queued entry:  PUT /api/<entity>/<id>  (record read from the store at that moment)
                                 DELETE /api/<entity>/<id>
         network or 5xx  → stop, keep the queue, retry later
         4xx rejection   → drop that entry, log it, continue
   PULL  for each collection:    GET /api/<entity>?updatedSince=<cursor>&includeDeleted=true
         apply a server record only if it is newer than the local copy (and has no unsent local edit)
```

Design decisions worth knowing:

- **Idempotent PUT** keyed by the client id, so a retried request after a dropped connection is safe.
- **Last-write-wins** on the client's `updatedAt`. The server stores a stored copy only if it is not newer
  than what it already has, and answers `applied: false` + its copy otherwise; the phone then adopts it.
  Future-dated clocks are clamped to now + 5 minutes so a wrong phone clock cannot win forever.
- **Soft deletes** (`deletedAt`) so a deletion made on one device reaches the others.
- **Pull cursor** is the server's own change marker, not a client clock, and is inclusive; records are
  de-duplicated by id.
- A record edited *while* a sync is running stays queued (`dequeueIfUnchanged`).
- **Mock rides are never queued.** Simulated data cannot reach the server.
- **Fresh install / new phone:** if this phone has never been edited and the account has a scooter, the
  first sync adopts the account's scooter and reminders. If the phone already has its own data, it is
  kept and the account's other scooter is ignored.
- Defaults created on first launch (the scooter and 10 reminders) are not queued until the rider edits
  them, so an untouched install never uploads boilerplate.

Known limits: one scooter per phone; no field-level merge (whole-record last-write-wins); sync is
foreground-only (there is no background service yet).

## Backend (`server/src`)

| Folder | Contents |
| --- | --- |
| `config/` | `env.ts` (validated env, no secret values in errors), `db.ts` |
| `models/` | `User`, `RefreshToken`, `Scooter`, `ServiceReminder`, `Maintenance`, `Ride`, `DiagnosticRecord`, `Telemetry`, `BluetoothDevice`, `ProtocolCapture`, `ApplicationSetting` |
| `validators/` | Zod schemas (one place for every rule) |
| `controllers/` | `syncResource.controller` (one generic implementation used by 5 resources), `auth`, `users`, `protocol`, `settings` |
| `routes/` | Wiring only |
| `middleware/` | auth, error handler, rate limits, request logger (no query strings, no bodies) |
| `services/` | `token.service` (JWT + refresh rotation), `password.service` (argon2id) |
| `utils/` | `AppError`, `logger` (redacts secrets), validation + Mongo helpers |

### API

| Method & path | Notes |
| --- | --- |
| `GET /api/health` | Public. `{status, time, database}` |
| `POST /api/auth/register` · `login` · `refresh` · `logout` | Public, strict rate limit |
| `GET /api/users/me` | |
| `GET POST /api/scooters` · `GET PUT DELETE /api/scooters/:id` | Same shape for `service-reminders`, `maintenance`, `rides`, `diagnostics` |
| `POST /api/protocol/capture` · `GET /api/protocol/captures` · `GET /api/protocol/captures/:id` | Raw packet captures, stored verbatim (5 MB body limit on this route only) |
| `GET /api/settings` · `PUT /api/settings/:key` | |

List endpoints accept `updatedSince`, `includeDeleted`, `scooterId`, `limit` and return
`{ items, cursor }`. Upserts return `{ item, applied }`. Errors are always
`{ error: { code, message, details? } }`.

Unknown routes answer `401` without a token (callers can't probe which routes exist) and `404` with one.

### Authentication

- Access token: JWT (HS256), 15 min. Refresh token: JWT with a stored id, 30 days, **rotated on every use**.
- Presenting an already-used refresh token is treated as theft: all of that user's refresh tokens are
  revoked. (Trade-off: if a refresh response is lost mid-flight, the next refresh forces a fresh sign-in.)
- Login returns the same error for a wrong password and an unknown email, and burns equal hashing time.
- The client refreshes once per burst of expired requests (single-flight) and only signs the rider out
  when the server explicitly rejects the refresh token - being offline never signs you out.

## Shared code (`shared/`)

TypeScript types (DTOs) and constants used by both packages, consumed **as source** through the `@shared`
alias (Babel + Metro on mobile, `paths` + esbuild/tsx on the server). It contains no dependencies. Its
`package.json` (`"type": "module"`) is required so Node's ESM loader treats it correctly under `tsx`.

## Why these libraries

| Choice | Reason |
| --- | --- |
| React Native 0.87, TypeScript strict | Requested stack |
| Zustand + MMKV | Tiny, synchronous, easy to test; the UI never waits on storage |
| react-native-keychain | Tokens in the Android Keystore |
| react-native-svg + lucide icons (per-icon imports) | Gauge/charts without native font assets; keeps ~1,600 unused icons out of the bundle |
| Express 5 + Mongoose 9 + Zod 4 | Requested stack; Express 5 forwards async errors automatically |
| argon2 | Stronger than bcrypt for new code |
| Vitest + mongodb-memory-server | Server tests against a real (in-memory) MongoDB, not mocks |
| Jest + react-test-renderer | Standard for React Native; screens are smoke-tested in-process |
