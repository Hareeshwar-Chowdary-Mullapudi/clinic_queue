import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Receptionist from './pages/Receptionist.jsx';
import Patient from './pages/Patient.jsx';
import { useQueueState } from './useQueueState.js';
import './App.css';

export default function App() {
  useQueueState();

  return (
    <div className="app">
      <header className="header">
        <h1>Clinic Queue</h1>
        <nav className="tabs">
          <NavLink to="/receptionist" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            Receptionist
          </NavLink>
          <NavLink to="/patient" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            Patient
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/receptionist" replace />} />
          <Route path="/receptionist" element={<Receptionist />} />
          <Route path="/patient" element={<Patient />} />
        </Routes>
      </main>
    </div>
  );
}
