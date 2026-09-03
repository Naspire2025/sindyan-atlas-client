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
const UUID_RE = new RegExp(`^${UUID_PATTERN}$`);

/**
 * Map a URL path + search object back to the domain Route the page layer
 * renders. This is a pure function: it never reads window.location. TanStack
 * Router owns path matching and history; routeFromPath is the single place
 * that translates a matched path into the application's Route vocabulary.
 */
export function routeFromPath(
  path: string,
  search: Record<string, string | undefined> = {},
): Route {
  const normalized = path.replace(/\/+$/, '') || '/';

  if (normalized === '/login') {
    return { page: 'login', projectId: null, filter: 'all' };
  }

  if (normalized === '/accept-invitation') {
    return { page: 'acceptInvitation', token: search.token || '', projectId: null, filter: 'all' };
  }

  const projectId = matchSlug(normalized, '/projects/', UUID_RE);
  if (projectId) return { page: 'project', projectId, filter: 'all' };

  const taskId = matchSlug(normalized, '/tasks/', UUID_RE);
  if (taskId) return { page: 'task', taskId, projectId: null, filter: 'all' };

  const memberId = matchSlug(normalized, '/members/', UUID_RE);
  if (memberId) return { page: 'member', memberId, projectId: null, filter: 'all' };

  const milestoneId = matchSlug(normalized, '/milestones/', UUID_RE);
  if (milestoneId) return { page: 'milestone', milestoneId, projectId: null, filter: 'all' };

  if (normalized === '/projects' || normalized === '/projects/all') {
    return { page: 'projects', projectId: null, filter: search.view || 'all' };
  }

  const page = Object.entries(PAGE_PATHS).find(([, pagePath]) => pagePath === normalized)?.[0];
  return { page: page || 'notFound', projectId: null, filter: 'all' };
}

function matchSlug(
  path: string,
  prefix: string,
  standaloneRegex: RegExp,
): string | null {
  if (!path.startsWith(prefix)) return null;
  const slug = path.slice(prefix.length);
  return standaloneRegex.test(slug) ? slug : null;
}

export function getPagePath(page: string, filter = 'all'): string {
  if (page === 'projects') {
    return filter && filter !== 'all' ? `/projects/all?view=${encodeURIComponent(filter)}` : '/projects/all';
  }
  return PAGE_PATHS[page] || PAGE_PATHS.overview;
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

export function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}