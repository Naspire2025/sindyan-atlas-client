import type { User, Project, ProjectMember } from '../types/api.js';

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isProjectLead(user: User | null | undefined, project: Project | null | undefined): boolean {
  return project?.team_members?.some(
    (m: ProjectMember) => m.user_id === user?.id && m.project_role === 'project_lead'
  ) ?? false;
}

export function canCreateProjects(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canViewPortfolio(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canManageProject(user: User | null | undefined, project: Project | null | undefined): boolean {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canManageFinance(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canManageTeam(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canManageInvitations(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canManageResources(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canCreateTask(user: User | null | undefined, project: Project | null | undefined): boolean {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canDeleteTask(user: User | null | undefined, project: Project | null | undefined): boolean {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canRevealSecret(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canManageRisk(user: User | null | undefined, project: Project | null | undefined): boolean {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canManageIssue(user: User | null | undefined, project: Project | null | undefined): boolean {
  return isAdmin(user) || isProjectLead(user, project);
}
