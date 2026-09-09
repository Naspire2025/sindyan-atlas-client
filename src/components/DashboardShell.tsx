import { type ReactNode } from "react";
import { useIntl } from 'react-intl';
import type { User } from "../types/api.js";
import Sidebar from "./Sidebar.js";

interface DashboardShellProps {
  activePage: string;
  children: ReactNode;
  error?: string;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  onLogout: () => void;
  onNavigate: (page: string, filter?: string) => void;
  onRetry: () => void;
  user: User;
}

export default function DashboardShell({
  activePage,
  children,
  error,
  isSidebarOpen,
  onCloseSidebar,
  onLogout,
  onNavigate,
  onRetry,
  user,
}: DashboardShellProps) {
  const intl = useIntl();
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage === "project" ? "projects" : activePage}
        isOpen={isSidebarOpen}
        onClose={onCloseSidebar}
        onLogout={onLogout}
        onNavigate={onNavigate}
        user={user}
      />
      <main className="main-content">
        {error && (
          <div className="global-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={onRetry}>
              {intl.formatMessage({ id: 'common.retry' })}
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
