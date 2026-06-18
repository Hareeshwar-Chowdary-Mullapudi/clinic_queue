# Thought Process Sheet

## Problem

Neighborhood clinics rely on paper tokens and verbal announcements. Patients wait hours with no visibility; receptionists track the queue from memory.

## Solution

A single shared queue on the server, with two real-time views:

1. **Receptionist** — fast token assignment and queue control
2. **Patient** — live "now serving" and personalized wait estimate

## Architecture Decisions

### Server as source of truth

All queue mutations happen on the server and persist to MongoDB. Clients never mutate local queue state — they only render the latest `state_update` broadcast. This keeps multiple receptionist tabs and many patient phones in sync.

### Socket.IO over polling

WebSockets give instant updates when "Call Next" is clicked — the core evaluation criterion (40% weight). Polling would add delay and unnecessary load.

### MongoDB for persistence

Queue state survives server restarts. A clinic can stop and restart the app without losing today's tokens.

## Wait Time Logic (Not Hardcoded)

```
effectiveAvg = average(completedAt - calledAt) for last 10 done tokens
             OR settings.avgConsultMinutes if fewer than 3 completed samples

remainingCurrent = max(0, effectiveAvg - elapsed since calledAt)

estimatedWait(position i) = remainingCurrent + (i * effectiveAvg)
```

This means wait estimates improve as real consultations complete — addressing the 25% evaluation criterion.

## Receptionist UX (Speed + Mistake-Proof)

- Single name field; **Enter** submits and clears for the next patient (under 10 seconds)
- Token numbers assigned server-side (no duplicate tokens from two receptionists)
- Large **Call Next** button; separate **Complete** to avoid accidental skips
- **Remove** for no-shows without affecting serving token
- Inline validation errors via toast messages

## Concurrency & Edge Cases

| Scenario | Handling |
|----------|----------|
| Two receptionists add patients at once | Atomic `Counter` model assigns unique token numbers via `$inc` |
| Two receptionists click "Call Next" | Serving check + atomic `findOneAndUpdate`; second action gets error |
| Call Next with empty queue | Server returns error; UI shows message |
| Call Next while someone is serving | Blocked until **Complete Current** |
| Patient disconnects / reconnects | Server sends full `state_update` on connect; client can also emit `request_state` |
| Switching between `/receptionist` and `/patient` | Shared `useQueueState` hook caches socket state at App level so queue data is not lost on navigation |
| No-show in waiting list | `remove_token` marks token as `removed` |
| Server restart | MongoDB restores queue; clients reconnect and sync |
| Not enough consult data yet | Falls back to receptionist-set default avg time |
| Invalid patient token lookup | `get_patient_status` returns clear error |

## Trade-offs

- **In-memory would be simpler** but loses state on restart — MongoDB chosen per requirements
- **No auth** — acceptable for a clinic LAN / demo prototype; production would add staff login
- **Single doctor queue** — one serving slot; multi-doctor would need room/doctor IDs on tokens

## Demo "Aha" Moment

> Receptionist clicks **Call Next** on their screen — every patient phone in the waiting room updates **Now Serving #4** instantly, with their personal wait time ticking down. No paper, no shouting names.
