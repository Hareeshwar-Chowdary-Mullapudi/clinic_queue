import { useEffect, useState } from 'react';
import { emitWithAck, socket } from './socket.js';

export const emptyQueueState = {
  nowServing: null,
  waiting: [],
  avgUsedMinutes: 10,
  settingsAvg: 10,
  isDataDriven: false,
  sampleCount: 0,
  totalDone: 0,
  updatedAt: null,
};

let cachedState = null;
const stateListeners = new Set();
const connectionListeners = new Set();
let socketReady = false;

function notifyState(state) {
  cachedState = state;
  stateListeners.forEach((listener) => listener(state));
}

function notifyConnection(connected) {
  connectionListeners.forEach((listener) => listener(connected));
}

function initQueueSocket() {
  if (socketReady) return;
  socketReady = true;

  socket.on('state_update', (state) => {
    notifyState(state);
  });

  socket.on('connect', () => {
    notifyConnection(true);
    emitWithAck('request_state', {}).catch(() => {});
  });

  socket.on('disconnect', () => {
    notifyConnection(false);
  });

  if (socket.connected) {
    emitWithAck('request_state', {}).catch(() => {});
  }
}

export function getCachedQueueState() {
  return cachedState;
}

export function useQueueState() {
  const [state, setState] = useState(() => cachedState || emptyQueueState);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    initQueueSocket();

    if (cachedState) {
      setState(cachedState);
    }

    const onState = (nextState) => setState(nextState);
    const onConnection = (isConnected) => setConnected(isConnected);

    stateListeners.add(onState);
    connectionListeners.add(onConnection);

    return () => {
      stateListeners.delete(onState);
      connectionListeners.delete(onConnection);
    };
  }, []);

  return { state, connected };
}
