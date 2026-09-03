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

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export function readRoute(): Route {
  const path = normalizePath(window.location.pathname);
  const projectMatch = path.match(new RegExp(`^/projects/(${UUID_PATTERN})$`));
  const taskMatch = path.match(new RegExp(`^/tasks/(${UUID_PATTERN})$`));
  const memberMatch = path.match(new RegExp(`^/members/(${UUID_PATTERN})$`));
  const milestoneMatch = path.match(new RegExp(`^/milestones/(${UUID_PATTERN})$`));

  if (path === '/login') return { page: 'login', projectId: null, filter: 'all' };
  if (path === '/accept-invitation') return { page: 'acceptInvitation', token: new URLSearchParams(window.location.search).get('token') || '', projectId: null, filter: 'all' };

  if (projectMatch) {
    return { page: 'project', projectId: projectMatch[1], filter: 'all' };
  }

  if (taskMatch) {
    return { page: 'task', taskId: taskMatch[1], projectId: null, filter: 'all' };
  }

  if (memberMatch) {
    return { page: 'member', memberId: memberMatch[1], projectId: null, filter: 'all' };
  }

  if (milestoneMatch) {
    return { page: 'milestone', milestoneId: milestoneMatch[1], projectId: null, filter: 'all' };
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

export function getProjectPath(projectId: string): string {
  return `/projects/${projectId}`;
}

export function getTaskPath(taskId: string): string {
  return `/tasks/${taskId}`;
}

export function getMemberPath(memberId: string): string {
  return `/members/${memberId}`;
}

export function getMilestonePath(milestoneId: string): string {
  return `/milestones/${milestoneId}`;
}

function normalizePath(path: string): string {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}
