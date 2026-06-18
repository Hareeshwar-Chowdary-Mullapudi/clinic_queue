# Socket Event Diagram

## Overview

All clients connect to the same Socket.IO server. The server is the single source of truth; every mutation updates MongoDB and broadcasts fresh state to all connected screens.

```mermaid
sequenceDiagram
  participant Rec as ReceptionistClient
  participant Pat as PatientClient
  participant Srv as SocketIOServer
  participant DB as MongoDB

  Rec->>Srv: connect
  Pat->>Srv: connect
  Srv->>DB: load queue state
  Srv-->>Rec: state_update
  Srv-->>Pat: state_update

  Rec->>Srv: add_patient { name }
  Srv->>DB: create Token (waiting)
  Srv-->>Rec: state_update (broadcast)
  Srv-->>Pat: state_update (broadcast)

  Rec->>Srv: call_next
  Srv->>DB: mark next waiting as serving
  Srv-->>Rec: state_update (broadcast)
  Srv-->>Pat: state_update (broadcast)

  Rec->>Srv: complete_current
  Srv->>DB: mark serving as done + timestamps
  Srv-->>Rec: state_update (broadcast)
  Srv-->>Pat: state_update (broadcast)

  Pat->>Srv: get_patient_status { tokenNumber }
  Srv->>DB: read token + compute wait
  Srv-->>Pat: ack { status }

  Note over Rec,Pat: On reconnect or route change
  Pat->>Srv: request_state
  Srv->>DB: load queue state
  Srv-->>Pat: state_update
```

## Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add_patient` | `{ name: string }` | Add patient to queue with next token number |
| `call_next` | `{}` | Call the next waiting token to consultation |
| `complete_current` | `{}` | Mark current serving patient as done |
| `set_avg_time` | `{ minutes: number }` | Set default average consultation minutes |
| `remove_token` | `{ number: number }` | Remove a waiting token (no-show) |
| `get_patient_status` | `{ tokenNumber: number }` | Get personalized wait info for a token |
| `request_state` | `{}` | Request latest queue snapshot (used on reconnect / tab switch) |

Mutation events and `request_state` support an optional acknowledgment callback: `ack({ ok, state?, message? })`.

## Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `state_update` | Queue state object | Full queue snapshot after any change or on connect |
| `error_message` | `{ message: string }` | Action failed for the requesting client |

## `state_update` Payload Shape

```json
{
  "nowServing": {
    "number": 4,
    "name": "Ravi",
    "calledAt": "2026-06-18T12:00:00.000Z",
    "remainingMin": 6.5
  },
  "waiting": [
    {
      "number": 5,
      "name": "Priya",
      "position": 1,
      "estimatedWaitMin": 6.5
    }
  ],
  "avgUsedMinutes": 10,
  "isDataDriven": true,
  "sampleCount": 8,
  "settingsAvg": 10,
  "totalDone": 12,
  "updatedAt": "2026-06-18T12:05:00.000Z"
}
```

## Reconnection Behavior

On `connect`, the server immediately emits `state_update` with the latest MongoDB state. Clients re-render from this snapshot — no manual refresh required.
