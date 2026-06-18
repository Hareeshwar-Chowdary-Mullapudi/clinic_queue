import * as queueService from './queueService.js';

export function registerSocketHandlers(io) {
  io.on('connection', async (socket) => {
    try {
      const state = await queueService.buildState();
      socket.emit('state_update', state);
    } catch (err) {
      socket.emit('error_message', { message: 'Failed to load queue state' });
    }

    socket.on('add_patient', async ({ name }, ack) => {
      try {
        const token = await queueService.addPatient(name);
        const state = await queueService.buildState();
        io.emit('state_update', state);
        ack?.({ ok: true, state, token: { number: token.number, name: token.name } });
      } catch (err) {
        const message = err.message || 'Failed to add patient';
        socket.emit('error_message', { message });
        ack?.({ ok: false, message });
      }
    });

    socket.on('call_next', async (_, ack) => {
      try {
        await queueService.callNext();
        const state = await queueService.buildState();
        io.emit('state_update', state);
        ack?.({ ok: true, state });
      } catch (err) {
        const message = err.message || 'Failed to call next';
        socket.emit('error_message', { message });
        ack?.({ ok: false, message });
      }
    });

    socket.on('complete_current', async (_, ack) => {
      try {
        await queueService.completeCurrent();
        const state = await queueService.buildState();
        io.emit('state_update', state);
        ack?.({ ok: true, state });
      } catch (err) {
        const message = err.message || 'Failed to complete current patient';
        socket.emit('error_message', { message });
        ack?.({ ok: false, message });
      }
    });

    socket.on('set_avg_time', async ({ minutes }, ack) => {
      try {
        await queueService.setAvgTime(minutes);
        const state = await queueService.buildState();
        io.emit('state_update', state);
        ack?.({ ok: true, state });
      } catch (err) {
        const message = err.message || 'Failed to update average time';
        socket.emit('error_message', { message });
        ack?.({ ok: false, message });
      }
    });

    socket.on('remove_token', async ({ number }, ack) => {
      try {
        await queueService.removeToken(number);
        const state = await queueService.buildState();
        io.emit('state_update', state);
        ack?.({ ok: true, state });
      } catch (err) {
        const message = err.message || 'Failed to remove token';
        socket.emit('error_message', { message });
        ack?.({ ok: false, message });
      }
    });

    socket.on('get_patient_status', async ({ tokenNumber }, ack) => {
      try {
        const status = await queueService.getPatientStatus(tokenNumber);
        if (typeof ack === 'function') {
          ack({ ok: true, status });
        }
      } catch (err) {
        const message = err.message || 'Failed to get patient status';
        if (typeof ack === 'function') {
          ack({ ok: false, message });
        }
      }
    });

    socket.on('request_state', async (ack) => {
      try {
        const state = await queueService.buildState();
        socket.emit('state_update', state);
        if (typeof ack === 'function') {
          ack({ ok: true, state });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: 'Failed to load queue state' });
        }
      }
    });
  });
}
