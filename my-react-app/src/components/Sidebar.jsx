import { NavLink, useLocation } from 'react-router-dom';
import { IconClock, IconCross, IconGrid, IconUser, IconUsers } from './Icons.jsx';

const navItems = [
  { to: '/receptionist', label: 'Dashboard', icon: IconGrid },
  { to: '/queue', label: 'Queue', icon: IconUsers },
  { to: '/patient', label: 'Patient View', icon: IconUser },
  { to: '/history', label: 'History', icon: IconClock },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">
          <IconCross />
        </div>
        <span>Clinic Queue</span>
      </div>
      <nav className="nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
