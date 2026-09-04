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

export interface RiskRoute {
  page: 'risk';
  riskId: string;
  projectId: null;
  filter: string;
}

export interface IssueRoute {
  page: 'issue';
  issueId: string;
  projectId: null;
  filter: string;
}

export interface StandardRoute {
  page: string;
  projectId: null;
  filter: string;
  token?: undefined;
  taskId?: undefined;
  memberId?: undefined;
  milestoneId?: undefined;
  riskId?: undefined;
  issueId?: undefined;
}

export type Route = LoginRoute | AcceptInvitationRoute | ProjectRoute | TaskRoute | MemberRoute | MilestoneRoute | RiskRoute | IssueRoute | StandardRoute;

export interface ProjectFilters {
  search: string;
  status: string;
  priority: string;
  summary: string;
}
