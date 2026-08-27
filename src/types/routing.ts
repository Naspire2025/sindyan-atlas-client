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
  projectId: number;
  filter: string;
  token?: undefined;
  taskId?: undefined;
}

export interface TaskRoute {
  page: 'task';
  taskId: number;
  projectId: null;
  filter: string;
  token?: undefined;
}

export interface StandardRoute {
  page: string;
  projectId: null;
  filter: string;
  token?: undefined;
  taskId?: undefined;
}

export type Route = LoginRoute | AcceptInvitationRoute | ProjectRoute | TaskRoute | StandardRoute;

export interface ProjectFilters {
  search: string;
  status: string;
  priority: string;
  summary: string;
}
