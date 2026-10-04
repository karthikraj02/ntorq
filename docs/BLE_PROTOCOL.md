# Ntorq Bluetooth protocol - research rules and workflow

## Current status: **UNKNOWN**

Nothing is known or assumed about how the TVS Ntorq 125 Race XP (SmartXonnect) communicates. This
document therefore contains **no UUIDs, no packet layouts, no commands and no fault codes**, and the
app must not either. They will be added here only after they have been observed and verified on the
rider's own scooter.

It is also **not assumed that the scooter uses BLE.** It may use Bluetooth Classic (or both). The first
discovery step is to find out which.

## Rules

1. **Never write** "TVS uses UUID X", "the oil-reset command is 0xXX", or "send this packet to reset
   the reminder" unless it was observed *and* confirmed on your scooter.
2. Every protocol definition carries three fields: `verified` (true/false), `source` (how it was learned)
   and `notes`.
3. A field is marked `verified: true` only after a parser built from captured data reproduces known
   real-world values (for example, a speed shown on the cluster).
4. **Read-only first.** No write capability exists until a specific command has been verified.
5. The app must never claim a command works unless it has been verified, and the UI keeps
   *NOT_SUPPORTED* / *N/A* until then.
6. Out of scope, always: immobiliser, anti-theft, ECU security bypass, engine-start, throttle/braking
   control, or any safety-system manipulation. This project is for observing and understanding your own
   vehicle's data.

## Workflow (and which phase builds each step)

| # | Step | Phase |
| --- | --- | --- |
| 1 | Scan for the scooter (BLE and Classic) | 2 |
| 2 | Connect | 2 |
| 3 | Discover services | 2 |
| 4 | Discover characteristics and their properties (read / write / write-without-response / notify / indicate) | 2 |
| 5 | Subscribe to notifications where supported | 2-3 |
| 6 | Capture incoming packets | 3 |
| 7 | Display packets in hexadecimal (and ASCII where meaningful) | 3 |
| 8 | Save captures (JSON / CSV / TXT export; optional upload to the server) | 3 |
| 9 | Compare captures (idle, revving, different speeds, lights on/off, ...) | 3 (manual) |
| 10 | Write parser definitions only once a pattern is identified | 4 |
| 11 | Test each parser against saved captures | 4 |
| 12 | Mark fields `verified` only after that testing | 4 |

Anything that *writes* to the scooter is Phase 6, and only for commands proven in steps 1-12.

## What the server already stores for this work

`POST /api/protocol/capture` stores a capture verbatim - each packet has timestamp, direction
(`RX`/`TX`), service UUID, characteristic UUID, hex, base64, length and RSSI - and
`GET /api/protocol/captures` lists them. Packets are never interpreted server-side. The `BluetoothDevice`
model is ready to hold discovered services/characteristics. The mobile screens that produce this data
arrive in Phases 2-3.

## Planned definition format (`protocols/ntorq-race-xp.json`, Phase 3)

Starts as:

```json
{
  "vehicle": "TVS Ntorq 125 Race XP",
  "protocolStatus": "UNKNOWN",
  "services": [],
  "characteristics": [],
  "commands": []
}
```

and every entry added later has the shape:

```json
{
  "id": "…",
  "description": "…",
  "verified": false,
  "source": "how this was learned, e.g. 'capture 2026-11-02 idle, compared with cluster'",
  "notes": "…"
}
```

## Tips for capturing useful data (when the tools exist)

- Record short, labelled captures: *ignition on, engine off*; *idle*; *steady revs*; *indicators on*;
  *one known speed on a stand*. One change per capture makes differences easy to see.
- Note what the cluster shows at the time (speed, fuel bars, trip) - those are your ground truth.
- Keep captures private: they may contain identifiers of your scooter and phone.
- Do not replay or send captured packets back to the scooter "to see what happens". Sending arbitrary
  data to a vehicle device can have unintended consequences.

## Android permissions for Phase 2 (planned)

| Permission | Why |
| --- | --- |
| `BLUETOOTH_SCAN` (Android 12+) | Find nearby devices (declared with `neverForLocation` if scan results are not used to derive location) |
| `BLUETOOTH_CONNECT` (Android 12+) | Connect to the scooter |
| `ACCESS_FINE_LOCATION` (Android 11 and below only) | Required by those versions for BLE scanning |
| `BLUETOOTH_ADVERTISE` | **Not requested** - the phone never advertises |
| `POST_NOTIFICATIONS` (Android 13+) | Only when local reminders (Phase 5) are enabled |
