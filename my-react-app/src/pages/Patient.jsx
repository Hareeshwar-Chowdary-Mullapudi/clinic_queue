import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PatientAvatar from '../components/PatientAvatar.jsx';
import { IconClock, IconUser, IconUsers } from '../components/Icons.jsx';
import { emitWithAck, getSocketTarget } from '../socket.js';
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
      {!connected && (
        <div className="alert warn">
          Backend offline — run <code>cd backend && npm run dev</code>, then restart frontend.
          <> Target: <code>{getSocketTarget()}</code>.</>
        </div>
      )}

      <div className={`serving-box ${pulse ? 'pulse' : ''}`}>
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
        <label className="block-label" htmlFor="token">Check your token</label>
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
            placeholder="Enter token number"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!tokenInput.trim() || !connected || loading}>
            {loading ? '…' : 'Check'}
          </button>
        </div>
        {message && <p className="error">{message}</p>}
      </form>

      {yourStatus && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">
              <IconUser />
            </div>
            <div className="stat-info">
              <div className="label">Your Token</div>
              <div className="value blue">#{yourStatus.yourToken}</div>
              <span className={badgeClass}>{yourStatus.status}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <IconUsers />
            </div>
            <div className="stat-info">
              <div className="label">Tokens Ahead</div>
              <div className="value orange">{yourStatus.tokensAhead}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teal">
              <IconClock />
            </div>
            <div className="stat-info">
              <div className="label">Estimated Wait</div>
              <div className="value teal">~{yourStatus.estimatedWaitMin}m</div>
            </div>
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
        <p className="hint">Enter your token or tap a name in the queue below</p>
      )}

      <div className="table-card">
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
                    <td>
                      <div className="patient-cell">
                        <PatientAvatar />
                        <span className="patient-name">{state.nowServing.name}</span>
                        <span className="badge-now">Now</span>
                      </div>
                    </td>
                    <td><span className="queue-meta now">Now</span></td>
                  </tr>
                )}
                {state.waiting.map((t) => (
                  <tr
                    key={t.number}
                    className={`row-clickable ${checkedToken === String(t.number) ? 'active' : ''}`}
                    onClick={() => check(String(t.number), state)}
                  >
                    <td><span className="token-num">#{t.number}</span></td>
                    <td>
                      <div className="patient-cell">
                        <PatientAvatar />
                        <span className="patient-name">{t.name}</span>
                      </div>
                    </td>
                    <td><span className="queue-meta">~{t.estimatedWaitMin} min</span></td>
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
