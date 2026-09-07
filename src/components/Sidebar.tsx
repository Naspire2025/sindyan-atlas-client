import { useState } from 'react';
import type { User } from '../types/api.js';
import { NAV_ITEMS } from '../constants.js';
import { canViewPortfolio, isAdmin } from '../auth/permissions.js';
import { useTheme } from '../theme/useTheme.js';
import ConfirmDialog from './ConfirmDialog.js';
import { LogOut, Monitor, User as UserIcon } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (page: string, filter?: string) => void;
  user: User;
}

export default function Sidebar({ activePage, isOpen, onClose, onLogout, onNavigate, user }: SidebarProps) {
  const { preference, setPreference } = useTheme();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const handleNavigate = (page: string) => {
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
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="avatar avatar-accent">{user.name?.slice(0, 2).toUpperCase() || '—'}</span>
            <div className="profile-identity">
              <strong>{user.name}</strong>
              <span>{isAdmin(user) ? 'Organization admin' : 'Team member'}</span>
            </div>
          </div>

          <div className="profile-controls">
            <label className="sr-only" htmlFor="theme-preference">Theme preference</label>
            <div className="theme-select-wrapper">
              <Monitor size={14} />
              <select id="theme-preference" value={preference} onChange={(event) => setPreference(event.target.value)}>
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div className="profile-action-row">
              <button className="text-button" type="button" onClick={() => handleNavigate('account')}>
                <UserIcon size={13} />
                Account
              </button>
              <button className="text-button text-button-danger" type="button" onClick={() => setShowSignOutConfirm(true)}>
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
      {showSignOutConfirm && (
        <ConfirmDialog
          title="Sign out"
          description="Are you sure you want to sign out? Any unsaved changes will be lost."
          confirmLabel="Sign out"
          cancelLabel="Cancel"
          variant="danger"
          isPending={false}
          onConfirm={onLogout}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      )}
    </>
  );
}
