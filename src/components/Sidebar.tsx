import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { User } from '../types/api.js';
import { NAV_ITEMS } from '../constants.js';
import { canViewPortfolio, isAdmin } from '../auth/permissions.js';
import { useTheme } from '../theme/useTheme.js';
import ConfirmDialog from './ConfirmDialog.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
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
  const intl = useIntl();
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
      {isOpen && <button className="sidebar-backdrop" type="button" aria-label={intl.formatMessage({ id: 'common.closeNavigation' })} onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="workspace-switcher">
          <div className="workspace-mark">AT</div>
          <div>
            <strong>Atlas</strong>
            <span>{isAdmin(user) ? intl.formatMessage({ id: 'sidebar.adminWorkspace' }) : intl.formatMessage({ id: 'sidebar.projectWorkspace' })}</span>
          </div>
        </div>

        <nav aria-label={intl.formatMessage({ id: 'sidebar.atlasWorkspace' })} className="sidebar-nav">
          <span className="nav-section-label">{intl.formatMessage({ id: 'nav.workspace' })}</span>
          {visibleItems.map((item) => (
            <button
              className={`nav-item ${activePage === item.id ? 'is-active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
            >
              <item.icon size={16} />
              <span>{intl.formatMessage({ id: item.label })}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="avatar avatar-accent">{user.name?.slice(0, 2).toUpperCase() || '—'}</span>
            <div className="profile-identity">
              <strong>{user.name}</strong>
              <span>{isAdmin(user) ? intl.formatMessage({ id: 'sidebar.adminRole' }) : intl.formatMessage({ id: 'sidebar.memberRole' })}</span>
            </div>
          </div>

          <div className="profile-controls">
            <LanguageSwitcher />
            <label className="sr-only" htmlFor="theme-preference">{intl.formatMessage({ id: 'sidebar.themePreference' })}</label>
            <div className="theme-select-wrapper">
              <Monitor size={14} />
              <select id="theme-preference" value={preference} onChange={(event) => setPreference(event.target.value)}>
                <option value="system">{intl.formatMessage({ id: 'sidebar.themeSystem' })}</option>
                <option value="dark">{intl.formatMessage({ id: 'sidebar.themeDark' })}</option>
                <option value="light">{intl.formatMessage({ id: 'sidebar.themeLight' })}</option>
              </select>
            </div>
            <div className="profile-action-row">
              <button className="text-button" type="button" onClick={() => handleNavigate('account')}>
                <UserIcon size={13} />
                <span>{intl.formatMessage({ id: 'nav.account' })}</span>
              </button>
              <button className="text-button text-button-danger" type="button" onClick={() => setShowSignOutConfirm(true)}>
                <LogOut size={13} />
                <span>{intl.formatMessage({ id: 'nav.signOut' })}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      {showSignOutConfirm && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'nav.signOut' })}
          description={intl.formatMessage({ id: 'sidebar.signOutConfirm' })}
          confirmLabel={intl.formatMessage({ id: 'nav.signOut' })}
          cancelLabel={intl.formatMessage({ id: 'common.cancel' })}
          variant="danger"
          isPending={false}
          onConfirm={onLogout}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      )}
    </>
  );
}