import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Receptionist from './pages/Receptionist.jsx';
import Patient from './pages/Patient.jsx';
import Queue from './pages/Queue.jsx';
import History from './pages/History.jsx';
import PageHeader from './components/PageHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useQueueState } from './useQueueState.js';
import './App.css';

const PAGE_TITLES = {
  '/receptionist': 'Dashboard',
  '/queue': 'Queue',
  '/history': 'History',
  '/patient': 'Patient View',
};

export default function App() {
  const { connected } = useQueueState();
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Receptionist';

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <PageHeader title={title} connected={connected} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/receptionist" replace />} />
            <Route path="/receptionist" element={<Receptionist />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/history" element={<History />} />
            <Route path="/patient" element={<Patient />} />
          </Routes>
        </div>
        <footer className="app-footer">
          React &nbsp;•&nbsp; Node.js &nbsp;•&nbsp; MongoDB &nbsp;•&nbsp; <span>Socket.IO</span>
        </footer>
      </div>
    </div>
  );
}
