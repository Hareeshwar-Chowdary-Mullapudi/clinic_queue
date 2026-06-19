import { useState } from 'react';
import PatientAvatar from '../components/PatientAvatar.jsx';
import { IconTrash } from '../components/Icons.jsx';
import { emitWithAck, getSocketTarget } from '../socket.js';
import { useQueueState } from '../useQueueState.js';

export default function Queue() {
  const { state, connected } = useQueueState();
  const [busy, setBusy] = useState(false);

  const handleRemove = async (num) => {
    if (busy || !window.confirm(`Remove #${num} from queue?`)) return;
    setBusy(true);
    try {
      await emitWithAck('remove_token', { number: num });
    } catch (err) {
      window.alert(err.message);
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

      {state.nowServing && (
        <div className="block serving-banner">
          <span className="block-label">Currently with doctor</span>
          <div className="patient-cell">
            <PatientAvatar />
            <span className="token-num live">#{state.nowServing.number}</span>
            <span className="patient-name">{state.nowServing.name}</span>
            <span className="badge-now">In consultation</span>
          </div>
        </div>
      )}

      <div className="table-card">
        <p className="section-title">Waiting for doctor ({state.waiting.length})</p>
        {state.waiting.length === 0 ? (
          <p className="empty">No patients waiting</p>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token ID</th>
                  <th>Patient Name</th>
                  <th>Est. Wait</th>
                  <th className="col-action" />
                </tr>
              </thead>
              <tbody>
                {state.waiting.map((t) => (
                  <tr key={t.number}>
                    <td className="queue-meta">{t.position}</td>
                    <td><span className="token-num">#{t.number}</span></td>
                    <td>
                      <div className="patient-cell">
                        <PatientAvatar />
                        <span className="patient-name">{t.name}</span>
                      </div>
                    </td>
                    <td><span className="queue-meta">~{t.estimatedWaitMin} min</span></td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="btn btn-delete"
                        onClick={() => handleRemove(t.number)}
                        disabled={busy || !connected}
                        aria-label={`Remove token ${t.number}`}
                        title="Remove"
                      >
                        <IconTrash />
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
