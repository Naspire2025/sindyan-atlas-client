import Sidebar from './Sidebar.jsx';

export default function DashboardShell({ activePage, children, error, isSidebarOpen, onCloseSidebar, onLogout, onNavigate, onRetry, user }) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage === 'project' ? 'projects' : activePage} isOpen={isSidebarOpen} onClose={onCloseSidebar} onLogout={onLogout} onNavigate={onNavigate} user={user} />
      <main className="main-content">
        {error && <div className="global-error" role="alert"><span>{error}</span><button type="button" onClick={onRetry}>Try again</button></div>}
        {children}
      </main>
    </div>
  );
}
