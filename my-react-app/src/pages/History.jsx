import PatientAvatar from '../components/PatientAvatar.jsx';
import { formatTime } from '../utils/formatTime.js';
import { getSocketTarget } from '../socket.js';
import { useQueueState } from '../useQueueState.js';

export default function History() {
  const { state, connected } = useQueueState();
  const history = state.history ?? [];

  return (
    <div className="page">
      {!connected && (
        <div className="alert warn">
          Backend offline — run <code>cd backend && npm run dev</code>, then restart frontend.
          <> Target: <code>{getSocketTarget()}</code>.</>
        </div>
      )}

      <div className="table-card">
        <p className="section-title">Visited today ({history.length})</p>
        {history.length === 0 ? (
          <p className="empty">No completed visits yet</p>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Token ID</th>
                  <th>Patient Name</th>
                  <th>Seen At</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((visit) => (
                  <tr key={`${visit.number}-${visit.completedAt}`}>
                    <td className="queue-meta">{visit.visitOrder}</td>
                    <td><span className="token-num">#{visit.number}</span></td>
                    <td>
                      <div className="patient-cell">
                        <PatientAvatar />
                        <span className="patient-name">{visit.name}</span>
                      </div>
                    </td>
                    <td><span className="queue-meta">{formatTime(visit.completedAt)}</span></td>
                    <td>
                      <span className="queue-meta">
                        {visit.durationMin != null ? `${visit.durationMin} min` : '—'}
                      </span>
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
