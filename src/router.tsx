import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import App from './App.jsx';
import AuthProvider from './auth/AuthProvider.js';
import { ThemeProvider } from './theme/ThemeProvider.js';

const rootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
});

const acceptInvitationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invitation',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  validateSearch: (search: Record<string, unknown>) => ({
    view: typeof search.view === 'string' ? search.view : undefined,
  }),
});

const projectsAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/all',
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
});

const taskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/$taskId',
});

const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team',
});

const memberRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/members/$memberId',
});

const vaultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vault',
});

const resourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/resources',
});

const invitationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invitations',
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
});

const milestoneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/milestones/$milestoneId',
});

const risksIssuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/risks-issues',
});

const riskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/risks/$riskId',
});

const issueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues/$issueId',
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/{$}',
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  acceptInvitationRoute,
  projectsRoute,
  projectsAllRoute,
  projectRoute,
  tasksRoute,
  taskRoute,
  teamRoute,
  memberRoute,
  vaultRoute,
  resourcesRoute,
  invitationsRoute,
  accountRoute,
  milestoneRoute,
  risksIssuesRoute,
  riskRoute,
  issueRoute,
  notFoundRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}