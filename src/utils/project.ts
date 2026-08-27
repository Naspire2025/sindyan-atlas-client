import type { Project, TaskSummary, ProjectMember, HealthStatus } from '../types/api.js';

const DAY_IN_MS = 86_400_000;

export function getTaskSummary(project: Project): { total: number; done: number; blocked: number } {
  const summary = project.task_summary ?? ({} as TaskSummary);
  return {
    total: summary.total_tasks ?? 0,
    done: summary.done_tasks ?? 0,
    blocked: summary.blocked_tasks ?? 0,
  };
}

export function getProgress(project: Project): number {
  const { total, done } = getTaskSummary(project);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function isPastDate(date: string | null | undefined): boolean {
  if (!date) return false;
  return new Date(`${date}T23:59:59`) < new Date();
}

export function isProjectOverdue(project: Project): boolean {
  return project.status !== 'completed' && isPastDate(project.deadline);
}

export function getProjectHealth(project: Project): HealthStatus {
  const progress = getProgress(project);
  const { blocked } = getTaskSummary(project);

  if (project.status === 'completed') return 'complete';
  if (project.status === 'blocked' || blocked > 0 || isProjectOverdue(project)) return 'behind';
  if (!project.deadline) return 'no_update';

  const daysRemaining = (new Date(project.deadline).getTime() - Date.now()) / DAY_IN_MS;
  return daysRemaining <= 14 && progress < 70 ? 'at_risk' : 'on_track';
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`));
}

export function getInitials(name: string | null | undefined): string {
  const normalizedName = String(name ?? '').trim();
  const initials = normalizedName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
  return initials.toUpperCase() || '—';
}

export interface AggregatedMember extends ProjectMember {
  projects: string[];
}

export function aggregateMembers(members: ProjectMember[], projects: Project[]): AggregatedMember[] {
  const projectsById = new Map(projects.map((project) => [project.id, project.name]));
  const directory = new Map<string, AggregatedMember>();

  members.forEach((member) => {
    const key = member.email?.toLowerCase() || member.name.toLowerCase();
    const existing = directory.get(key) ?? { ...member, projects: [] };
    const projectName = projectsById.get(member.project_id);
    if (projectName && !existing.projects.includes(projectName)) existing.projects.push(projectName);
    directory.set(key, existing);
  });

  return [...directory.values()];
}
