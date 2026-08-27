const DAY_IN_MS = 86_400_000;

export function getTaskSummary(project) {
  const summary = project.task_summary ?? {};
  return {
    total: summary.total_tasks ?? 0,
    done: summary.done_tasks ?? 0,
    blocked: summary.blocked_tasks ?? 0,
  };
}

export function getProgress(project) {
  const { total, done } = getTaskSummary(project);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function isPastDate(date) {
  if (!date) return false;
  return new Date(`${date}T23:59:59`) < new Date();
}

export function isProjectOverdue(project) {
  return project.status !== 'completed' && isPastDate(project.deadline);
}

export function getProjectHealth(project) {
  const progress = getProgress(project);
  const { blocked } = getTaskSummary(project);

  if (project.status === 'completed') return 'complete';
  if (project.status === 'blocked' || blocked > 0 || isProjectOverdue(project)) return 'behind';
  if (!project.deadline) return 'no_update';

  const daysRemaining = (new Date(project.deadline) - new Date()) / DAY_IN_MS;
  return daysRemaining <= 14 && progress < 70 ? 'at_risk' : 'on_track';
}

export function formatDate(date) {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`));
}

export function getInitials(name) {
  const normalizedName = String(name ?? '').trim();
  const initials = normalizedName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
  return initials.toUpperCase() || '—';
}

export function aggregateMembers(members, projects) {
  const projectsById = new Map(projects.map((project) => [project.id, project.name]));
  const directory = new Map();

  members.forEach((member) => {
    const key = member.email?.toLowerCase() || member.name.toLowerCase();
    const existing = directory.get(key) ?? { ...member, projects: [] };
    const projectName = projectsById.get(member.project_id);
    if (projectName && !existing.projects.includes(projectName)) existing.projects.push(projectName);
    directory.set(key, existing);
  });

  return [...directory.values()];
}
