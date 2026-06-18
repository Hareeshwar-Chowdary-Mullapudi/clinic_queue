# Live Clinic Queue System

Replace paper token slips with a real-time digital waiting room. Receptionists control the queue from one screen; patients see live updates on their phones without refreshing.

## Features

- **Receptionist view** (`/receptionist`): add patients, call next token, complete consultations, set average consult time, remove no-shows
- **Patient view** (`/patient`): see now serving, enter token for personalized wait estimate, live queue updates
- **Real-time sync** via Socket.IO — both screens update instantly on every action
- **Data-driven wait times** — estimated wait uses actual consultation durations once enough data exists
- **MongoDB persistence** — queue survives server restarts

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO, Mongoose
- **Frontend:** React, Vite, React Router
- **Database:** MongoDB

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

## Setup

1. **Clone and install dependencies**

```bash
npm run install:all
```

Or install each part separately:

```bash
cd ./backend && npm install
cd ./my-react-app && npm install
```

2. **Configure backend**

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if needed:

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/clinic-queue
CLIENT_ORIGIN=http://localhost:5173
```

3. **Start MongoDB** (if running locally)

4. **Run backend** (terminal 1)

```bash
npm run dev:backend
```

5. **Run frontend** (terminal 2)

```bash
npm run dev:frontend
```

6. **Open the app**

- Receptionist: http://localhost:5173/receptionist
- Patient waiting room: http://localhost:5173/patient
- Patient with token in URL: http://localhost:5173/patient?token=5

## How This Maps to Review Criteria

| Criteria | Weight | How it's met |
|----------|--------|--------------|
| Live queue updates across both screens | 40% | Socket.IO `state_update` broadcast on every action; patient screen updates instantly without refresh |
| Wait time from real data | 25% | `queueService` computes avg from `completedAt - calledAt` of recent consultations |
| Receptionist screen fast & mistake-proof | 20% | Enter-to-add, token confirmation, disabled buttons, confirm-before-remove |
| Concurrency & edge cases | 15% | Atomic token counter, atomic `findOneAndUpdate` on call-next, documented in THOUGHT_PROCESS.md |

## Wooble Submission Checklist

Upload these four items to your Wooble portfolio:

1. **Working prototype** — deploy and share a live URL, **or** record a short demo video showing both screens updating live
2. **GitHub repo with README** — this repository + root `README.md`
3. **Socket event diagram** — [SOCKET_EVENTS.md](./SOCKET_EVENTS.md)
4. **Thought process sheet** — [THOUGHT_PROCESS.md](./THOUGHT_PROCESS.md)

## Demo Flow (The "Aha" Moment)

1. Open receptionist and patient views side by side
2. Add a patient on receptionist — token appears instantly on patient screen
3. Click **Call Next** — "Now Serving" updates on both screens without refresh
4. Patient enters their token number — sees tokens ahead and estimated wait based on real consult data

## Project Structure

```
backend/
  server.js          # Express + Socket.IO entry
  socket.js          # Socket event handlers
  queueService.js    # Queue logic + wait-time computation
  models/Token.js
  models/Settings.js
my-react-app/
  src/pages/Receptionist.jsx
  src/pages/Patient.jsx
  src/socket.js
```

## Socket Events

See [SOCKET_EVENTS.md](./SOCKET_EVENTS.md) for the full event diagram.

## Thought Process

See [THOUGHT_PROCESS.md](./THOUGHT_PROCESS.md) for concurrency, edge cases, and design decisions.

## API Health Check

```
GET http://localhost:3001/health
```
