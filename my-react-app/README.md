# Clinic Queue Frontend

React + Vite frontend for the live clinic queue system.

## Routes

- `/receptionist` — receptionist desk (add patients, call next, complete)
- `/patient` — patient waiting room (live now serving + token lookup)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Runs at http://localhost:5173

Requires the backend at http://localhost:3001 (see root `README.md`).
