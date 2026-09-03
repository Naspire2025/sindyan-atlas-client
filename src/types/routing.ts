export interface LoginRoute {
  page: 'login';
  projectId: null;
  filter: string;
  token?: undefined;
  taskId?: undefined;
}

export interface AcceptInvitationRoute {
  page: 'acceptInvitation';
  token: string;
  projectId: null;
  filter: string;
  taskId?: undefined;
}

export interface ProjectRoute {
  page: 'project';
  projectId: string;
  filter: string;
  token?: undefined;
  taskId?: undefined;
  memberId?: undefined;
  milestoneId?: undefined;
}

export interface TaskRoute {
  page: 'task';
  taskId: string;
  projectId: null;
  filter: string;
  token?: undefined;
  memberId?: undefined;
  milestoneId?: undefined;
}

export interface MemberRoute {
  page: 'member';
  memberId: string;
  projectId: null;
  filter: string;
  token?: undefined;
  taskId?: undefined;
}

export interface MilestoneRoute {
  page: 'milestone';
  milestoneId: string;
  projectId: null;
  filter: string;
  token?: undefined;
  taskId?: undefined;
  memberId?: undefined;
}

export interface StandardRoute {
  page: string;
  projectId: null;
  filter: string;
  token?: undefined;
  taskId?: undefined;
  memberId?: undefined;
  milestoneId?: undefined;
}

export type Route = LoginRoute | AcceptInvitationRoute | ProjectRoute | TaskRoute | MemberRoute | MilestoneRoute | StandardRoute;

export interface ProjectFilters {
  search: string;
  status: string;
  priority: string;
  summary: string;
}
