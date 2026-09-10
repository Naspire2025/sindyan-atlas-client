import { useState, type FormEvent, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { Project, Task, CreateTaskPayload, User } from "./types/api.js";
import type { Route } from "./types/routing.js";
import { api } from "./api/client.js";
import { queryKeys } from "./api/queryKeys.js";
import { useAuth } from "./auth/useAuth.js";
import {
  canCreateProjects,
  canViewPortfolio,
  canManageTeam,
  canManageInvitations,
} from "./auth/permissions.js";
import { Eye, EyeOff, Menu, Shield } from "lucide-react";
import AccountPage from "./components/AccountPage.jsx";
import DashboardPage from "./components/DashboardPage.jsx";
import DashboardShell from "./components/DashboardShell.jsx";
import InvitationsPage from "./components/InvitationsPage.jsx";
import IssuePage from "./components/IssuePage.jsx";
import { LanguageSwitcher } from "./components/LanguageSwitcher.js";
import MemberPage from "./components/MemberPage.jsx";
import MilestonePage from "./components/MilestonePage.jsx";
import NotFoundPage from "./components/NotFoundPage.jsx";
import NewProjectModal from "./components/NewProjectModal.jsx";
import ProjectPage from "./components/ProjectPage.jsx";
import ProjectsPage from "./components/ProjectsPage.jsx";
import ResourcesPage from "./components/ResourcesPage.jsx";
import RiskPage from "./components/RiskPage.jsx";
import RisksIssuesPage from "./components/RisksIssuesPage.jsx";
import TaskPage from "./components/TaskPage.jsx";
import TasksPage from "./components/TasksPage.jsx";
import TeamDirectoryPage from "./components/TeamDirectoryPage.jsx";
import VaultPage from "./components/VaultPage.jsx";
import {
  getIssuePath,
  getMemberPath,
  getMilestonePath,
  getPagePath,
  getProjectPath,
  getRiskPath,
  getTaskPath,
  routeFromPath,
} from "./routing.js";

export default function App() {
  const route = useRouterState({ select: (state) => state.location });
  const currentRoute: Route = routeFromPath(route.pathname, route.search);
  const { error, status } = useAuth();
  const intl = useIntl();

  if (status === "checking")
    return (
      <PublicPageFrame>
        <LoadingScreen message={intl.formatMessage({ id: "dashboard.confirmSession" })} />
      </PublicPageFrame>
    );
  if (status === "error") return <SessionError message={error} />;
  if (status !== "authenticated")
    return <PublicApp route={currentRoute} sessionError={error} />;
  return <AuthenticatedApp route={currentRoute} />;
}

interface AuthenticatedAppProps {
  route: Route;
}

function AuthenticatedApp({ route }: AuthenticatedAppProps) {
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const appNavigate = useNavigate();
  const intl = useIntl();
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
      queryClient.setQueryData<Project[]>(
        queryKeys.projects(),
        (projects = []) => [
          project,
          ...projects.filter((item) => item.id !== project.id),
        ],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      appNavigate({ to: getProjectPath(project.id) });
    },
  });
  const updateTask = useMutation({
    mutationFn: ({
      taskId,
      task,
    }: {
      taskId: string;
      task: Record<string, unknown>;
    }) => api.updateTask(taskId, task as Partial<CreateTaskPayload>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
  const workspaceError =
    projectsQuery.error ||
    tasksQuery.error ||
    createProject.error ||
    updateTask.error;
  const projects = projectsQuery.data || [];
  const tasks = tasksQuery.data || [];

  const navigate = (page: string, filter = "all") =>
    appNavigate({ to: getPagePath(page, filter) });
  const refreshWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
  };

  return (
    <DashboardShell
      activePage={route.page}
      error={workspaceError?.message}
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onLogout={logout}
      onNavigate={navigate}
      onRetry={refreshWorkspace}
      user={user!}
    >
      {projectsQuery.isLoading || tasksQuery.isLoading ? (
        <LoadingScreen message={intl.formatMessage({ id: "dashboard.loadingWorkspace" })} />
      ) : (
        <PageContent
          canCreateProject={canCreateProjects(user)}
          canManageInvitations={canManageInvitations(user)}
          canManageTeam={canManageTeam(user)}
          canViewPortfolio={canViewPortfolio(user)}
          navigate={navigate}
          onCreateProject={() => setIsNewProjectOpen(true)}
          onMenu={() => setIsSidebarOpen(true)}
          onSelectProject={(projectId) => appNavigate({ to: getProjectPath(projectId) })}
          onSelectMember={(userId) => appNavigate({ to: getMemberPath(userId) })}
          onSelectMilestone={(milestoneId) =>
            appNavigate({ to: getMilestonePath(milestoneId) })
          }
          onSelectRisk={(riskId) => appNavigate({ to: getRiskPath(riskId) })}
          onSelectIssue={(issueId) => appNavigate({ to: getIssuePath(issueId) })}
          onSelectTask={(taskId) => appNavigate({ to: getTaskPath(taskId) })}
          onUpdateTask={(taskId, task) =>
            updateTask.mutateAsync({ taskId, task })
          }
          onWorkspaceChanged={refreshWorkspace}
          projects={projects}
          route={route}
          tasks={tasks}
          user={user!}
        />
      )}
      {isNewProjectOpen && (
        <NewProjectModal
          isSubmitting={createProject.isPending}
          onClose={() => setIsNewProjectOpen(false)}
          onCreate={createProject.mutateAsync}
        />
      )}
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
  onSelectProject: (projectId: string) => void;
  onSelectMember: (userId: string) => void;
  onSelectMilestone: (milestoneId: string) => void;
  onSelectRisk: (riskId: string) => void;
  onSelectIssue: (issueId: string) => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (
    taskId: string,
    task: Record<string, unknown>,
  ) => Promise<unknown>;
  onWorkspaceChanged: () => void;
  projects: Project[];
  route: Route;
  tasks: Task[];
  user: User;
}

function PageContent({
  canCreateProject,
  canManageInvitations,
  canManageTeam,
  canViewPortfolio: canViewOverview,
  navigate,
  onCreateProject,
  onMenu,
  onSelectMember,
  onSelectMilestone,
  onSelectProject,
  onSelectRisk,
  onSelectIssue,
  onSelectTask,
  onUpdateTask,
  onWorkspaceChanged,
  projects,
  route,
  tasks,
  user,
}: PageContentProps) {
  const sharedPageProps = { onMenu };

  if (route.page === "account") return <AccountPage {...sharedPageProps} />;
  if (route.page === "team") {
    if (!canManageTeam) return <PermissionDeniedPage onMenu={onMenu} />;
    return (
      <TeamDirectoryPage {...sharedPageProps} onSelectMember={onSelectMember} />
    );
  }
  if (route.page === "invitations") {
    if (!canManageInvitations) return <PermissionDeniedPage onMenu={onMenu} />;
    return <InvitationsPage {...sharedPageProps} />;
  }
  if (route.page === "resources") {
    if (!canManageTeam) return <PermissionDeniedPage onMenu={onMenu} />;
    return <ResourcesPage {...sharedPageProps} />;
  }
  if (route.page === "risksIssues") {
    if (!canManageTeam) return <PermissionDeniedPage onMenu={onMenu} />;
    return <RisksIssuesPage {...sharedPageProps} onSelectProject={onSelectProject} />;
  }
  if (route.page === "risk")
    return (
      <RiskPage
        {...sharedPageProps}
        key={route.riskId}
        riskId={route.riskId ?? ""}
        onSelectProject={onSelectProject}
      />
    );
  if (route.page === "issue")
    return (
      <IssuePage
        {...sharedPageProps}
        key={route.issueId}
        issueId={route.issueId ?? ""}
        onSelectProject={onSelectProject}
      />
    );
  if (route.page === "project")
    return (
      <ProjectPage
        {...sharedPageProps}
        currentUser={user}
        key={route.projectId}
        projectId={route.projectId ?? ""}
        onBack={() => navigate("projects")}
        onChanged={onWorkspaceChanged}
        onSelectMember={onSelectMember}
        onSelectMilestone={onSelectMilestone}
        onSelectTask={onSelectTask}
      />
    );
  if (route.page === "task")
    return (
      <TaskPage
        {...sharedPageProps}
        currentUser={user}
        key={route.taskId}
        taskId={route.taskId ?? ""}
        onBack={() => navigate("tasks")}
        onChanged={onWorkspaceChanged}
        onSelectMember={onSelectMember}
        onSelectProject={onSelectProject}
      />
    );
  if (route.page === "member")
    return (
      <MemberPage
        {...sharedPageProps}
        key={route.memberId}
        memberId={route.memberId ?? ""}
        onBack={() => navigate("team")}
        onSelectProject={onSelectProject}
        onSelectTask={onSelectTask}
      />
    );
  if (route.page === "milestone")
    return (
      <MilestonePage
        {...sharedPageProps}
        currentUser={user}
        key={route.milestoneId}
        milestoneId={route.milestoneId ?? ""}
        onBack={() => navigate("projects")}
        onSelectMember={onSelectMember}
        onSelectProject={onSelectProject}
        onSelectTask={onSelectTask}
      />
    );
  if (route.page === "projects")
    return (
      <ProjectsPage
        {...sharedPageProps}
        canCreate={canCreateProject}
        key={route.filter}
        initialFilter={route.filter}
        projects={projects}
        onCreate={onCreateProject}
        onSelectProject={onSelectProject}
      />
    );
  if (route.page === "tasks")
    return (
      <TasksPage
        {...sharedPageProps}
        currentUser={user}
        tasks={tasks}
        onSelectProject={onSelectProject}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
      />
    );
  if (route.page === "vault")
    return <VaultPage {...sharedPageProps} currentUser={user} />;
  if (route.page === "notFound") return <NotFoundPage onMenu={onMenu} />;
  if (!canViewOverview)
    return (
      <TasksPage
        {...sharedPageProps}
        currentUser={user}
        tasks={tasks}
        onSelectProject={onSelectProject}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
      />
    );
  return (
    <DashboardPage
      {...sharedPageProps}
      projects={projects}
      tasks={tasks}
      onNavigate={navigate}
      onSelectProject={onSelectProject}
      onSelectTask={onSelectTask}
      onSelectRisk={onSelectRisk}
      onSelectIssue={onSelectIssue}
    />
  );
}

function PublicApp({
  route,
  sessionError,
}: {
  route: Route;
  sessionError: string;
}) {
  const { acceptInvitation, login } = useAuth();
  const intl = useIntl();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(sessionError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const invitationToken =
    route.page === "acceptInvitation" ? route.token : null;
  const title = invitationToken
    ? intl.formatMessage({ id: "auth.acceptInvitationTitle" })
    : intl.formatMessage({ id: "auth.signInTitle" });
  const description = invitationToken
    ? intl.formatMessage({ id: "auth.acceptInvitationDescription" })
    : intl.formatMessage({ id: "auth.signInDescription" });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (invitationToken)
        await acceptInvitation(invitationToken, form.password);
      else await login(form);
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicPageFrame>
      <main className="auth-page">
        <section className="auth-card">
          <div className="workspace-mark">AT</div>
          <span className="eyebrow">{intl.formatMessage({ id: "auth.atlasCommandCenter" })}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <form onSubmit={submit}>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            {!invitationToken && (
              <label className="field-group" htmlFor="email">
                {intl.formatMessage({ id: "auth.email" })}
                <input
                  autoComplete="email"
                  id="email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            <label className="field-group" htmlFor="password">
              {intl.formatMessage({ id: "auth.password" })}
              <span className="password-field">
                <input
                  autoComplete={
                    invitationToken ? "new-password" : "current-password"
                  }
                  id="password"
                  minLength={invitationToken ? 12 : undefined}
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
                <button
                  aria-label={
                    showPassword
                      ? intl.formatMessage({ id: "auth.hidePassword" })
                      : intl.formatMessage({ id: "auth.showPassword" })
                  }
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <button
              className="button button-primary auth-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? intl.formatMessage({ id: "auth.pleaseWait" })
                : invitationToken
                  ? intl.formatMessage({ id: "auth.activateAccount" })
                  : intl.formatMessage({ id: "auth.signIn" })}
            </button>
          </form>
        </section>
      </main>
    </PublicPageFrame>
  );
}

interface SessionErrorProps {
  message: string;
}

function SessionError({ message }: SessionErrorProps) {
  const { refreshSession } = useAuth();
  const intl = useIntl();
  return (
    <PublicPageFrame>
      <main className="auth-page">
        <section className="auth-card">
          <h1>{intl.formatMessage({ id: "auth.sessionUnavailable" })}</h1>
          <p>{message}</p>
          <button
            className="button button-primary"
            type="button"
            onClick={refreshSession}
          >
            {intl.formatMessage({ id: "common.retry" })}
          </button>
        </section>
      </main>
    </PublicPageFrame>
  );
}

function PublicPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full">
      <div className="fixed right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}

interface PermissionDeniedPageProps {
  onMenu: () => void;
}

function PermissionDeniedPage({ onMenu }: PermissionDeniedPageProps) {
  const intl = useIntl();
  return (
    <>
      <header className="page-header">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label={intl.formatMessage({ id: "common.openNavigation" })}
          onClick={onMenu}
        >
          <Menu size={18} />
        </button>
        <div className="page-heading">
          <span className="eyebrow">{intl.formatMessage({ id: "permission.accessRestricted" })}</span>
          <h1>{intl.formatMessage({ id: "permission.permissionDenied" })}</h1>
          <p>{intl.formatMessage({ id: "permission.noPermission" })}</p>
        </div>
      </header>
      <div className="empty-state">
        <span className="empty-state-icon">
          <Shield size={18} />
            <Shield size={18} />
        </span>
        <h3>{intl.formatMessage({ id: "permission.accessRestricted" })}</h3>
        <p>{intl.formatMessage({ id: "permission.contactAdmin" })}</p>
      </div>
    </>
  );
}

interface LoadingScreenProps {
  message: string;
}

function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <span className="spinner" />
      <strong>{message}</strong>
    </div>
  );
}
