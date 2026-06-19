import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { emitWithAck } from '../socket.js';
import { useQueueState } from '../useQueueState.js';

function deriveStatus(state, token) {
  const num = Number(token);
  if (!Number.isFinite(num) || num < 1) return null;

  if (state.nowServing?.number === num) {
    return { yourToken: num, tokensAhead: 0, estimatedWaitMin: 0, status: 'your turn' };
  }

  const entry = state.waiting.find((w) => w.number === num);
  if (entry) {
    return {
      yourToken: num,
      tokensAhead: entry.position - 1,
      estimatedWaitMin: entry.estimatedWaitMin,
      status: 'waiting',
    };
  }
  return null;
}

export default function Patient() {
  const { state, connected } = useQueueState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tokenInput, setTokenInput] = useState('');
  const [checkedToken, setCheckedToken] = useState('');
  const [yourStatus, setYourStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevServingRef = useRef(null);
  const checkedRef = useRef('');
  const initRef = useRef(false);

  useEffect(() => {
    checkedRef.current = checkedToken;
  }, [checkedToken]);

  const lookup = useCallback(async (token, currentState = state) => {
    const trimmed = token.trim();
    if (!trimmed) return;

    const derived = deriveStatus(currentState, trimmed);
    if (derived) {
      setYourStatus({ ...currentState, ...derived });
      setMessage('');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await emitWithAck('get_patient_status', { tokenNumber: Number(trimmed) });
      setYourStatus(res.status);
      setMessage('');
    } catch (err) {
      setYourStatus(null);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [state]);

  const check = useCallback((token, currentState = state) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setTokenInput(trimmed);
    setCheckedToken(trimmed);
    checkedRef.current = trimmed;
    setSearchParams({ token: trimmed }, { replace: true });
    lookup(trimmed, currentState);
  }, [lookup, setSearchParams, state]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const url = searchParams.get('token')?.trim();
    if (url) {
      setTokenInput(url);
      setCheckedToken(url);
      checkedRef.current = url;
    }
  }, [searchParams]);

  useEffect(() => {
    const token = checkedRef.current;
    if (token && state.updatedAt && connected) lookup(token, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.updatedAt, connected]);

  useEffect(() => {
    const num = state.nowServing?.number ?? null;
    if (prevServingRef.current !== null && prevServingRef.current !== num) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 600);
    }
    prevServingRef.current = num;

    const active = checkedRef.current;
    if (active) {
      const derived = deriveStatus(state, active);
      if (derived) setYourStatus({ ...state, ...derived });
    }
  }, [state]);

  const badgeClass = yourStatus?.status === 'your turn' ? 'badge turn' : 'badge';

  return (
    <div className="page">
      <div className="page-title">
        <h2>Waiting Room</h2>
        <span className={`live-dot ${connected ? 'on' : ''}`}>{connected ? 'Live' : 'Offline'}</span>
      </div>

      {!connected && (
        <div className="alert warn">
          Backend offline — run <code>cd backend && npm run dev</code> in a terminal, then refresh.
        </div>
      )}

      <div className={`block serving-box ${pulse ? 'pulse' : ''}`}>
        <span className="label">Now Serving</span>
        {state.nowServing ? (
          <>
            <div className="serving-number">#{state.nowServing.number}</div>
            <p className="serving-name">{state.nowServing.name}</p>
          </>
        ) : (
          <p className="serving-empty">Waiting for next patient</p>
        )}
      </div>

      <form
        className="block"
        onSubmit={(e) => {
          e.preventDefault();
          check(tokenInput, state);
        }}
      >
        <label className="block-label" htmlFor="token">Check token</label>
        <div className="field-row">
          <input
            id="token"
            type="text"
            inputMode="numeric"
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value);
              setMessage('');
            }}
            placeholder="Enter number"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!tokenInput.trim() || !connected || loading}>
            {loading ? '…' : 'Check'}
          </button>
        </div>
        {message && <p className="error">{message}</p>}
      </form>

      {yourStatus && (
        <div className="status-row">
          <div className="status-card">
            <span className="big">#{yourStatus.yourToken}</span>
            <span className={`${badgeClass}`}>{yourStatus.status}</span>
          </div>
          <div className="status-card">
            <span className="big">{yourStatus.tokensAhead}</span>
            <span className="small">Tokens Ahead</span>
          </div>
          <div className="status-card">
            <span className="big">~{yourStatus.estimatedWaitMin}m</span>
            <span className="small">Estimated Wait</span>
          </div>
        </div>
      )}

      {yourStatus && (
        <p className="hint">
          {yourStatus.isDataDriven
            ? `Wait based on ${yourStatus.sampleCount} recent consultations (avg ${yourStatus.avgUsedMinutes} min)`
            : `Wait based on receptionist avg (${yourStatus.settingsAvg ?? state.settingsAvg} min) until enough consult data is collected`}
        </p>
      )}

      {!yourStatus && !message && !tokenInput && (
        <p className="hint">Enter your token or tap a name below</p>
      )}

      <div className="block queue-block">
        <p className="queue-title">Queue</p>
        {state.waiting.length === 0 && !state.nowServing ? (
          <p className="empty">Queue is empty</p>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Patient Name</th>
                  <th>Est. Wait</th>
                </tr>
              </thead>
              <tbody>
                {state.nowServing && (
                  <tr className="row-serving">
                    <td><span className="token-num live">#{state.nowServing.number}</span></td>
                    <td className="queue-name">{state.nowServing.name}</td>
                    <td className="queue-meta">Now</td>
                  </tr>
                )}
                {state.waiting.map((t) => (
                  <tr
                    key={t.number}
                    className={`row-clickable ${checkedToken === String(t.number) ? 'active' : ''}`}
                    onClick={() => check(String(t.number), state)}
                  >
                    <td><span className="token-num">#{t.number}</span></td>
                    <td className="queue-name">{t.name}</td>
                    <td className="queue-meta">~{t.estimatedWaitMin} min</td>
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
