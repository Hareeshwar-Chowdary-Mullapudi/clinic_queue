import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconCheckSimple, IconClock, IconMegaphone, IconUsers } from '../components/Icons.jsx';
import { emitWithAck, getSocketTarget, socket } from '../socket.js';
import { useQueueState } from '../useQueueState.js';

export default function Receptionist() {
  const { state, connected } = useQueueState();
  const [name, setName] = useState('');
  const [avgTime, setAvgTime] = useState(10);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setAvgTime(state.settingsAvg);
  }, [state.settingsAvg]);

  const toast = (text, type) => {
    if (type === 'ok') {
      setSuccess(text);
      setMessage('');
      window.setTimeout(() => setSuccess(''), 3000);
    } else {
      setMessage(text);
      setSuccess('');
      window.setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    const onError = ({ message: errMsg }) => toast(errMsg, 'err');
    socket.on('error_message', onError);
    inputRef.current?.focus();
    return () => socket.off('error_message', onError);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await emitWithAck('add_patient', { name: trimmed });
      setName('');
      toast(`Token #${res.token.number} → ${res.token.name}`, 'ok');
      inputRef.current?.focus();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleCallNext = async () => {
    if (busy || !state.waiting.length || state.nowServing) return;
    setBusy(true);
    try {
      await emitWithAck('call_next', {});
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (busy || !state.nowServing) return;
    setBusy(true);
    try {
      await emitWithAck('complete_current', {});
      toast(`Token #${state.nowServing.number} done`, 'ok');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAvg = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await emitWithAck('set_avg_time', { minutes: Number(avgTime) });
      toast('Avg time saved', 'ok');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      {!connected && (
        <div className="alert warn">
          Backend offline — run <code>cd backend && npm run dev</code>, then restart frontend.
          <> Target: <code>{getSocketTarget()}</code>.</>
        </div>
      )}
      {message && <div className="alert info">{message}</div>}
      {success && <div className="alert ok">{success}</div>}

      <form className="block" onSubmit={handleAdd}>
        <label className="block-label" htmlFor="name">Add patient</label>
        <div className="field-row">
          <input
            id="name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Patient name"
            disabled={busy || !connected}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !connected || !name.trim()}>
            Add
          </button>
        </div>
      </form>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-icon teal">
            <IconUsers />
          </div>
          <div className="stat-info">
            <div className="label">Serving</div>
            <div className="value teal">{state.nowServing ? `#${state.nowServing.number}` : '—'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <IconClock />
          </div>
          <div className="stat-info">
            <div className="label">Waiting</div>
            <div className="value orange">{state.waiting.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <IconCheck />
          </div>
          <div className="stat-info">
            <div className="label">Done</div>
            <div className="value green">{state.totalDone}</div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-call"
          onClick={handleCallNext}
          disabled={busy || !connected || !state.waiting.length || state.nowServing}
        >
          <IconMegaphone />
          Call Next
        </button>
        <button
          type="button"
          className="btn btn-complete"
          onClick={handleComplete}
          disabled={busy || !connected || !state.nowServing}
        >
          <IconCheckSimple />
          Complete
        </button>
      </div>

      <form className="block settings-row" onSubmit={handleSaveAvg}>
        <span>Avg consult</span>
        <input
          type="number"
          min="1"
          max="120"
          value={avgTime}
          onChange={(e) => setAvgTime(e.target.value)}
          disabled={busy || !connected}
        />
        <span>min</span>
        <button type="submit" className="btn btn-secondary" disabled={busy || !connected}>Save</button>
      </form>
    </div>
  );
}
