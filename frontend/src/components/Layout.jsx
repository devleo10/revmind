import { NavLink, Outlet, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout() {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className={`app-shell${isLanding ? ' app-shell--landing' : ''}`}>
      <div className="app-bg" aria-hidden="true" />
      <div className="app-bg-overlay" aria-hidden="true" />

      <header className="app-header">
        <NavLink to="/" className="app-header__brand" end>
          <span className="app-header__logo">RevMind</span>
        </NavLink>

        <nav className="app-nav" aria-label="Main">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
            }
          >
            Chat
          </NavLink>
        </nav>
      </header>

      <main className={`app-main${isLanding ? ' app-main--landing' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
