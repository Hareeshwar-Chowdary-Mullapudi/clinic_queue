import { useEffect, useRef, useState } from 'react';
import { emitWithAck, socket } from '../socket.js';
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

  const handleRemove = async (num) => {
    if (busy || !window.confirm(`Remove #${num}?`)) return;
    setBusy(true);
    try {
      await emitWithAck('remove_token', { number: num });
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-title">
        <h2>Receptionist</h2>
        <span className={`live-dot ${connected ? 'on' : ''}`}>{connected ? 'Live' : 'Offline'}</span>
      </div>

      {!connected && (
        <div className="alert warn">
          Backend offline — run <code>cd backend && npm run dev</code> in a terminal, then refresh.
          {import.meta.env.VITE_SOCKET_URL && (
            <> Connecting to <code>{import.meta.env.VITE_SOCKET_URL}</code>.</>
          )}
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

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-blue"
          onClick={handleCallNext}
          disabled={busy || !connected || !state.waiting.length || state.nowServing}
        >
          Call Next
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleComplete}
          disabled={busy || !connected || !state.nowServing}
        >
          Complete
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <span className="num">{state.nowServing ? `#${state.nowServing.number}` : '—'}</span>
          <span className="txt">Serving</span>
        </div>
        <div className="stat-box">
          <span className="num">{state.waiting.length}</span>
          <span className="txt">Waiting</span>
        </div>
        <div className="stat-box">
          <span className="num">{state.totalDone}</span>
          <span className="txt">Done</span>
        </div>
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

      <div className="block queue-block">
        <p className="queue-title">Queue</p>
        {state.waiting.length === 0 && !state.nowServing ? (
          <p className="empty">No patients yet</p>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Patient Name</th>
                  <th>Est. Wait</th>
                  <th className="col-action" />
                </tr>
              </thead>
              <tbody>
                {state.nowServing && (
                  <tr className="row-serving">
                    <td><span className="token-num live">#{state.nowServing.number}</span></td>
                    <td className="queue-name">{state.nowServing.name}</td>
                    <td className="queue-meta">Now</td>
                    <td />
                  </tr>
                )}
                {state.waiting.map((t) => (
                  <tr key={t.number}>
                    <td><span className="token-num">#{t.number}</span></td>
                    <td className="queue-name">{t.name}</td>
                    <td className="queue-meta">~{t.estimatedWaitMin} min</td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="btn btn-delete"
                        onClick={() => handleRemove(t.number)}
                        disabled={busy}
                        aria-label={`Delete token ${t.number}`}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
