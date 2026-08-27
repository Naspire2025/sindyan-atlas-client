import type { Route } from './types/routing.js';

const PAGE_PATHS: Record<string, string> = {
  overview: '/',
  projects: '/projects/all',
  tasks: '/tasks',
  team: '/team',
  vault: '/vault',
  resources: '/resources',
  invitations: '/invitations',
  account: '/account',
};

export function readRoute(): Route {
  const path = normalizePath(window.location.pathname);
  const projectMatch = path.match(/^\/projects\/(\d+)$/);
  const taskMatch = path.match(/^\/tasks\/(\d+)$/);

  if (path === '/login') return { page: 'login', projectId: null, filter: 'all' };
  if (path === '/accept-invitation') return { page: 'acceptInvitation', token: new URLSearchParams(window.location.search).get('token') || '', projectId: null, filter: 'all' };

  if (projectMatch) {
    return { page: 'project', projectId: Number(projectMatch[1]), filter: 'all' };
  }

  if (taskMatch) {
    return { page: 'task', taskId: Number(taskMatch[1]), projectId: null, filter: 'all' };
  }

  if (path === '/projects' || path === '/projects/all') {
    const filter = new URLSearchParams(window.location.search).get('view') || 'all';
    return { page: 'projects', projectId: null, filter };
  }

  const page = Object.entries(PAGE_PATHS).find(([, pagePath]) => pagePath === path)?.[0];
  return { page: page || 'notFound', projectId: null, filter: 'all' };
}

export function getPagePath(page: string, filter = 'all'): string {
  const path = PAGE_PATHS[page] || PAGE_PATHS.overview;
  if (page !== 'projects' || filter === 'all') return path;
  return `${path}?view=${encodeURIComponent(filter)}`;
}

export function getProjectPath(projectId: number): string {
  return `/projects/${projectId}`;
}

export function getTaskPath(taskId: number): string {
  return `/tasks/${taskId}`;
}

function normalizePath(path: string): string {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}
