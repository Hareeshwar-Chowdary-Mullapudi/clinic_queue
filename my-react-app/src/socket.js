import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export function emitWithAck(event, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('Not connected to server. Is the backend running?'));
      return;
    }

    const timer = window.setTimeout(() => {
      reject(new Error('Request timed out. Check backend connection.'));
    }, timeoutMs);

    socket.emit(event, payload, (response) => {
      window.clearTimeout(timer);
      if (response?.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'Request failed'));
      }
    });
  });
}
