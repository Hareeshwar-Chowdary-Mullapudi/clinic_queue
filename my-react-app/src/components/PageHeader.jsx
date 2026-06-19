import { NavLink, useLocation } from 'react-router-dom';
import { IconUser, IconUsers } from './Icons.jsx';

export default function PageHeader({ title, connected }) {
  const { pathname } = useLocation();
  const isStaffRoute = !pathname.startsWith('/patient');

  return (
    <>
      <div className="page-header">
        <h1>Clinic Queue</h1>
        <div className="role-toggle">
          <NavLink to="/receptionist" className={isStaffRoute ? 'active' : ''}>
            <IconUser />
            Receptionist
          </NavLink>
          <NavLink to="/patient" className={pathname.startsWith('/patient') ? 'active' : ''}>
            <IconUsers />
            Patient
          </NavLink>
        </div>
      </div>
      <div className="subheader">
        <h2>{title}</h2>
        <span className={`live ${connected ? 'on' : 'off'}`}>{connected ? 'Live' : 'Offline'}</span>
      </div>
    </>
  );
}
