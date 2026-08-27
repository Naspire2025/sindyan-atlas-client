import { NAV_ITEMS } from '../constants.js';
import { canViewPortfolio, isAdmin } from '../auth/permissions.js';
import { useTheme } from '../theme/useTheme.js';
import Icon from './Icon.jsx';

export default function Sidebar({ activePage, isOpen, onClose, onLogout, onNavigate, user }) {
  const { preference, setPreference } = useTheme();
  const handleNavigate = (page) => {
    onNavigate(page);
    onClose();
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin(user)) return false;
    if (item.id === 'overview' && !canViewPortfolio(user)) return false;
    return true;
  });

  return (
    <>
      {isOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="workspace-switcher">
          <div className="workspace-mark">AT</div>
          <div>
            <strong>Atlas</strong>
            <span>{isAdmin(user) ? 'Administrator workspace' : 'Project workspace'}</span>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="sidebar-nav">
          <span className="nav-section-label">Workspace</span>
          {visibleItems.map((item) => (
            <button
              className={`nav-item ${activePage === item.id ? 'is-active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-note">
            <Icon name="shield" size={16} />
            <div>
              <strong>Secure session</strong>
              <span>Access is limited by your role</span>
            </div>
          </div>

          <div className="profile-card">
            <span className="avatar avatar-accent">{user.name?.slice(0, 2).toUpperCase() || '—'}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{isAdmin(user) ? 'Organization admin' : 'Team member'}</span>
            </div>
            <div className="profile-actions">
              <label className="sr-only" htmlFor="theme-preference">Theme preference</label><select id="theme-preference" value={preference} onChange={(event) => setPreference(event.target.value)}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select>
              <button className="text-button" type="button" onClick={() => handleNavigate('account')}>Account</button>
              <button className="text-button" type="button" onClick={onLogout}>Sign out</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
