import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Project, Task, CreateTaskPayload, User } from './types/api.js';
import type { Route } from './types/routing.js';
import { api } from './api/client.js';
import { queryKeys } from './api/queryKeys.js';
import { useAuth } from './auth/useAuth.js';
import { canCreateProjects, canViewPortfolio, canManageTeam, canManageInvitations } from './auth/permissions.js';
import AccountPage from './components/AccountPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import DashboardShell from './components/DashboardShell.jsx';
import Icon from './components/Icon.jsx';
import InvitationsPage from './components/InvitationsPage.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import NewProjectModal from './components/NewProjectModal.jsx';
import ProjectPage from './components/ProjectPage.jsx';
import ProjectsPage from './components/ProjectsPage.jsx';
import ResourcesPage from './components/ResourcesPage.jsx';
import TaskPage from './components/TaskPage.jsx';
import TasksPage from './components/TasksPage.jsx';
import TeamDirectoryPage from './components/TeamDirectoryPage.jsx';
import VaultPage from './components/VaultPage.jsx';
import { getPagePath, getProjectPath, getTaskPath, readRoute } from './routing.js';

export default function App() {
  const { error, status } = useAuth();
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const handleHistoryChange = () => setRoute(readRoute());
    window.addEventListener('popstate', handleHistoryChange);
    return () => window.removeEventListener('popstate', handleHistoryChange);
  }, []);

  if (status === 'checking') return <LoadingScreen message="Confirming your session…" />;
  if (status === 'error') return <SessionError message={error} />;
  if (status !== 'authenticated') return <PublicApp route={route} />;
  return <AuthenticatedApp route={route} setRoute={setRoute} />;
}

interface AuthenticatedAppProps {
  route: Route;
  setRoute: (route: Route) => void;
}

function AuthenticatedApp({ route, setRoute }: AuthenticatedAppProps) {
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: ({ signal }) => api.listProjects({ signal }),
  });
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(),
    queryFn: ({ signal }) => api.listTasks({ signal }),
  });
  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: (project) => {
      setIsNewProjectOpen(false);
      queryClient.setQueryData<Project[]>(queryKeys.projects(), (projects = []) => [project, ...projects.filter((item) => item.id !== project.id)]);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      navigateToPath(getProjectPath(project.id), setRoute);
    },
  });
  const updateTask = useMutation({
    mutationFn: ({ taskId, task }: { taskId: number; task: Record<string, unknown> }) => api.updateTask(taskId, task as Partial<CreateTaskPayload>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
  const workspaceError = projectsQuery.error || tasksQuery.error || createProject.error || updateTask.error;
  const projects = projectsQuery.data || [];
  const tasks = tasksQuery.data || [];

  const navigate = (page: string, filter = 'all') => navigateToPath(getPagePath(page, filter), setRoute);
  const refreshWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
  };

  return (
    <DashboardShell activePage={route.page} error={workspaceError?.message} isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} onLogout={logout} onNavigate={navigate} onRetry={refreshWorkspace} user={user!}>
      {projectsQuery.isLoading || tasksQuery.isLoading ? <LoadingScreen message="Loading workspace…" /> : <PageContent
        canCreateProject={canCreateProjects(user)}
        canManageInvitations={canManageInvitations(user)}
        canManageTeam={canManageTeam(user)}
        canViewPortfolio={canViewPortfolio(user)}
        navigate={navigate}
        onCreateProject={() => setIsNewProjectOpen(true)}
        onMenu={() => setIsSidebarOpen(true)}
        onSelectProject={(projectId) => navigateToPath(getProjectPath(projectId), setRoute)}
        onSelectTask={(taskId) => navigateToPath(getTaskPath(taskId), setRoute)}
        onUpdateTask={(taskId, task) => updateTask.mutateAsync({ taskId, task })}
        onWorkspaceChanged={refreshWorkspace}
        projects={projects}
        route={route}
        tasks={tasks}
        user={user!}
      />}
      {isNewProjectOpen && <NewProjectModal isSubmitting={createProject.isPending} onClose={() => setIsNewProjectOpen(false)} onCreate={createProject.mutateAsync} />}
    </DashboardShell>
  );
}

interface PageContentProps {
  canCreateProject: boolean;
  canManageInvitations: boolean;
  canManageTeam: boolean;
  canViewPortfolio: boolean;
  navigate: (page: string, filter?: string) => void;
  onCreateProject: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: number) => void;
  onSelectTask: (taskId: number) => void;
  onUpdateTask: (taskId: number, task: Record<string, unknown>) => Promise<unknown>;
  onWorkspaceChanged: () => void;
  projects: Project[];
  route: Route;
  tasks: Task[];
  user: User;
}

function PageContent({ canCreateProject, canManageInvitations, canManageTeam, canViewPortfolio: canViewOverview, navigate, onCreateProject, onMenu, onSelectProject, onSelectTask, onUpdateTask, onWorkspaceChanged, projects, route, tasks, user }: PageContentProps) {
  const sharedPageProps = { onMenu };

  if (route.page === 'account') return <AccountPage {...sharedPageProps} />;
  if (route.page === 'team') {
    if (!canManageTeam) return <PermissionDeniedPage onMenu={onMenu} />;
    return <TeamDirectoryPage {...sharedPageProps} />;
  }
  if (route.page === 'invitations') {
    if (!canManageInvitations) return <PermissionDeniedPage onMenu={onMenu} />;
    return <InvitationsPage {...sharedPageProps} />;
  }
  if (route.page === 'resources') {
    if (!canManageTeam) return <PermissionDeniedPage onMenu={onMenu} />;
    return <ResourcesPage {...sharedPageProps} />;
  }
  if (route.page === 'project') return <ProjectPage {...sharedPageProps} currentUser={user} key={route.projectId} projectId={route.projectId ?? 0} onBack={() => navigate('projects')} onChanged={onWorkspaceChanged} onSelectTask={onSelectTask} />;
  if (route.page === 'task') return <TaskPage {...sharedPageProps} currentUser={user} key={route.taskId} taskId={route.taskId ?? 0} onBack={() => navigate('tasks')} onChanged={onWorkspaceChanged} onSelectProject={onSelectProject} />;
  if (route.page === 'projects') return <ProjectsPage {...sharedPageProps} canCreate={canCreateProject} key={route.filter} initialFilter={route.filter} projects={projects} onCreate={onCreateProject} onSelectProject={onSelectProject} />;
  if (route.page === 'tasks') return <TasksPage {...sharedPageProps} currentUser={user} tasks={tasks} onSelectProject={onSelectProject} onSelectTask={onSelectTask} onUpdateTask={onUpdateTask} />;
  if (route.page === 'vault') return <VaultPage {...sharedPageProps} />;
  if (route.page === 'notFound') return <NotFoundPage onMenu={onMenu} />;
  if (!canViewOverview) return <TasksPage {...sharedPageProps} currentUser={user} tasks={tasks} onSelectProject={onSelectProject} onSelectTask={onSelectTask} onUpdateTask={onUpdateTask} />;
  return <DashboardPage {...sharedPageProps} projects={projects} tasks={tasks} onNavigate={navigate} onSelectProject={onSelectProject} onSelectTask={onSelectTask} />;
}

interface PublicAppProps {
  route: Route;
}

function PublicApp({ route }: PublicAppProps) {
  const { acceptInvitation, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const invitationToken = route.page === 'acceptInvitation' ? route.token : null;
  const title = invitationToken ? 'Set up your Atlas account' : 'Sign in to Atlas';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (invitationToken) await acceptInvitation(invitationToken, form.password);
      else await login(form);
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="auth-page"><section className="auth-card"><div className="workspace-mark">AT</div><span className="eyebrow">Atlas command center</span><h1>{title}</h1><p>{invitationToken ? 'Choose a password with at least 12 characters to continue.' : 'Use your assigned work email and password.'}</p><form onSubmit={submit}>{error && <div className="error-banner" role="alert">{error}</div>}{!invitationToken && <label className="field-group" htmlFor="email">Email<input autoComplete="email" id="email" required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>}<label className="field-group" htmlFor="password">Password<span className="password-field"><input autoComplete={invitationToken ? 'new-password' : 'current-password'} id="password" minLength={invitationToken ? 12 : undefined} required type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><button aria-label={showPassword ? 'Hide password' : 'Show password'} className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} /></button></span></label><button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">{isSubmitting ? 'Please wait…' : invitationToken ? 'Activate account' : 'Sign in'}</button></form></section></main>;
}

interface SessionErrorProps {
  message: string;
}

function SessionError({ message }: SessionErrorProps) {
  const { refreshSession } = useAuth();
  return <main className="auth-page"><section className="auth-card"><h1>Session unavailable</h1><p>{message}</p><button className="button button-primary" type="button" onClick={refreshSession}>Try again</button></section></main>;
}

interface PermissionDeniedPageProps {
  onMenu: () => void;
}

function PermissionDeniedPage({ onMenu }: PermissionDeniedPageProps) {
  return (
    <>
      <header className="page-header">
        <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}>
          <svg aria-hidden="true" fill="none" height={18} viewBox="0 0 24 24" width={18} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="page-heading">
          <span className="eyebrow">Access restricted</span>
          <h1>Permission denied</h1>
          <p>You don't have permission to view this page.</p>
        </div>
      </header>
      <div className="empty-state">
        <span className="empty-state-icon"><svg aria-hidden="true" fill="none" height={18} viewBox="0 0 24 24" width={18} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg></span>
        <h3>Access restricted</h3>
        <p>Contact your administrator to request access to this section.</p>
      </div>
    </>
  );
}

interface LoadingScreenProps {
  message: string;
}

function LoadingScreen({ message }: LoadingScreenProps) { return <div className="loading-screen"><span className="spinner" /><strong>{message}</strong></div>; }

function navigateToPath(path: string, setRoute: (route: Route) => void) {
  if (`${window.location.pathname}${window.location.search}` !== path) window.history.pushState({}, '', path);
  setRoute(readRoute());
  window.scrollTo({ top: 0, behavior: 'auto' });
  document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'auto' });
}
