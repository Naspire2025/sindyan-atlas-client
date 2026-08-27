export function isAdmin(user) {
  return user?.role === 'admin';
}

export function isProjectLead(user, project) {
  return project?.team_members?.some(
    (m) => m.user_id === user?.id && m.project_role === 'project_lead'
  );
}

export function canCreateProjects(user) {
  return isAdmin(user);
}

export function canViewPortfolio(user) {
  return isAdmin(user);
}

export function canManageProject(user, project) {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canManageFinance(user) {
  return isAdmin(user);
}

export function canManageTeam(user) {
  return isAdmin(user);
}

export function canManageInvitations(user) {
  return isAdmin(user);
}

export function canManageResources(user) {
  return isAdmin(user);
}

export function canCreateTask(user, project) {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canDeleteTask(user, project) {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canRevealSecret(user) {
  return isAdmin(user);
}

export function canManageRisk(user, project) {
  return isAdmin(user) || isProjectLead(user, project);
}

export function canManageIssue(user, project) {
  return isAdmin(user) || isProjectLead(user, project);
}
