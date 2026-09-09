import type {
  AuthSession,
  User,
  Project,
  Task,
  TaskComment,
  Milestone,
  ProjectLink,
  Risk,
  Issue,
  BudgetLine,
  SpendRecord,
  FinancialSummary,
  DashboardOverview,
  DashboardAttentionItem,
  Invitation,
  VaultEntry,
  VaultFile,
  VaultUploadIntent,
  WorkloadItem,
  MemberAllocation,
  CapacityProfile,
  Availability,
  MemberSummary,
  LoginPayload,
  CreateInvitationPayload,
  CreateProjectPayload,
  CreateTaskPayload,
  CreateMilestonePayload,
  CreateLinkPayload,
  CreateVaultEntryPayload,
  CreateBudgetLinePayload,
  CreateSpendRecordPayload,
  ProjectMember,
  ProjectAllocation,
  ProjectFilters,
  MilestoneDetail,
} from '../types/api.js';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = configuredBaseUrl.replace(/\/$/, '');

const SESSION_STORAGE_KEY = 'atlas_session_token';

let unauthorizedHandler: ((error?: ApiError) => Promise<void>) | null = null;
let isHandlingUnauthorized = false;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getSessionToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable; the in-memory token is not used for requests
  }
}

export function setUnauthorizedHandler(handler: ((error?: ApiError) => Promise<void>) | null): void { unauthorizedHandler = handler; }

function withQuery(path: string, query?: Record<string, unknown>): string {
  const parameters = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') parameters.set(key, String(value));
  });
  const suffix = parameters.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function notifyUnauthorized(error?: ApiError): Promise<void> {
  if (isHandlingUnauthorized || !unauthorizedHandler) return;
  isHandlingUnauthorized = true;
  try { await unauthorizedHandler(error); } finally { isHandlingUnauthorized = false; }
}

function buildHeaders(method: string, body?: string, headers?: HeadersInit): Headers {
  const resolvedHeaders = new Headers(headers);
  if (body !== undefined && !resolvedHeaders.has('Content-Type')) resolvedHeaders.set('Content-Type', 'application/json');
  const token = getSessionToken();
  if (token && !resolvedHeaders.has('Authorization')) resolvedHeaders.set('Authorization', `Bearer ${token}`);
  return resolvedHeaders;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  return body;
}

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      copy[key] = /password|token|secret|csrf|key/i.test(key) ? '[REDACTED]' : redactSensitive(entry);
    }
    return copy;
  }
  return value;
}

function parseRequestPayload(options: RequestInit): string | null {
  if (typeof options.body !== 'string' || !options.body) return null;
  try {
    const parsed = JSON.parse(options.body);
    return JSON.stringify(redactSensitive(parsed));
  } catch {
    return '(unparseable body)';
  }
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const method = (options.method || 'GET') as string;
  const startedAt = performance.now();
  const payload = parseRequestPayload(options);
  console.log(`[api] → ${method} ${BASE_URL}${path}${payload ? ` body=${payload}` : ''}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...options, method, headers: buildHeaders(method, options.body as string | undefined, options.headers) });

  if (response.status === 401) {
    const duration = Math.round(performance.now() - startedAt);
    console.warn(`[api] ← ${method} ${BASE_URL}${path} -> 401 (${duration}ms) session not established`);
    await notifyUnauthorized(new ApiError('Your session could not be established. Please sign in again.', 401));
    return parseResponse(response);
  }

  const duration = Math.round(performance.now() - startedAt);
  let responseBody: unknown = null;
  try {
    responseBody = await response.json().catch(() => null);
  } catch {
    responseBody = null;
  }
  const log = (level: 'log' | 'warn' | 'error') => console[level](
    `[api] ← ${method} ${BASE_URL}${path} -> ${response.status} (${duration}ms)${responseBody !== null ? ` body=${JSON.stringify(redactSensitive(responseBody))}` : ''}`,
  );
  if (response.ok) log('log');
  else if (response.status < 500) log('warn');
  else log('error');
  if (response.status === 204) return null;
  if (!response.ok) throw new ApiError((responseBody as { error?: string } | null)?.error || `Request failed: ${response.status}`, response.status);
  return responseBody;
}

function jsonRequest(path: string, method: string, data: unknown): Promise<unknown> { return request(path, { method, body: JSON.stringify(data) }); }
function list(path: string, query: Record<string, unknown> | undefined, signal: AbortSignal | undefined): Promise<unknown> { return request(withQuery(path, query), { signal }); }

async function uploadToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  } catch {
    throw new ApiError('File storage could not be reached. Verify the R2 bucket CORS policy allows this app origin.', 0);
  }
  if (!response.ok) throw new ApiError('File upload failed.', response.status);
}

async function fetchVaultFileContent(fileId: string): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/vault/files/${fileId}/content`, {
    headers: buildHeaders('GET'),
  });
  if (response.status === 401) {
    const error = new ApiError('Your session could not be established. Please sign in again.', 401);
    await notifyUnauthorized(error);
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || 'File preview could not be loaded.', response.status);
  }
  return response.blob();
}

export const api = {
  login: (data: LoginPayload): Promise<AuthSession> => jsonRequest('/auth/login', 'POST', data) as Promise<AuthSession>,
  acceptInvitation: (token: string, data: { password: string }): Promise<AuthSession> => jsonRequest(`/auth/invitations/${encodeURIComponent(token)}/accept`, 'POST', data) as Promise<AuthSession>,
  getCurrentUser: (): Promise<{ user: User }> => request('/auth/me') as Promise<{ user: User }>,
  logout: (): Promise<null> => request('/auth/logout', { method: 'POST' }) as Promise<null>,
  changePassword: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }): Promise<{ token: string }> => jsonRequest('/auth/change-password', 'POST', { current_password: currentPassword, new_password: newPassword }) as Promise<{ token: string }>,
  updatePreferences: (data: { locale?: string }): Promise<{ user: User }> => jsonRequest('/users/me/preferences', 'PATCH', data) as Promise<{ user: User }>,

  listProjects: ({ signal, ...query }: { signal?: AbortSignal } & Partial<ProjectFilters> = {}): Promise<Project[]> => list('/projects', query, signal) as Promise<Project[]>,
  getProject: (id: string, signal?: AbortSignal): Promise<Project> => request(`/projects/${id}`, { signal }) as Promise<Project>,
  createProject: (data: CreateProjectPayload): Promise<Project> => jsonRequest('/projects', 'POST', data) as Promise<Project>,
  updateProject: (id: string, data: Partial<CreateProjectPayload>): Promise<Project> => jsonRequest(`/projects/${id}`, 'PUT', data) as Promise<Project>,
  deleteProject: (id: string): Promise<null> => request(`/projects/${id}`, { method: 'DELETE' }) as Promise<null>,

  listProjectMembers: (projectId: string, signal?: AbortSignal): Promise<ProjectMember[]> => request(`/projects/${projectId}/members`, { signal }) as Promise<ProjectMember[]>,
  addProjectMember: (projectId: string, data: { user_id: string; project_role: string }): Promise<ProjectMember> => jsonRequest(`/projects/${projectId}/members`, 'POST', data) as Promise<ProjectMember>,
  removeProjectMember: (projectId: string, userId: string): Promise<null> => request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }) as Promise<null>,

  listTasks: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<Task[]> => list('/tasks', query, signal) as Promise<Task[]>,
  getTask: (id: string, signal?: AbortSignal): Promise<Task> => request(`/tasks/${id}`, { signal }) as Promise<Task>,
  getTaskActivity: (id: string, signal?: AbortSignal): Promise<{ activity: import('../types/api.js').TaskActivityEvent[] }> => request(`/tasks/${id}/activity`, { signal }) as Promise<{ activity: import('../types/api.js').TaskActivityEvent[] }>,
  createTask: (data: CreateTaskPayload): Promise<Task> => jsonRequest('/tasks', 'POST', data) as Promise<Task>,
  updateTask: (id: string, data: Partial<CreateTaskPayload>): Promise<Task> => jsonRequest(`/tasks/${id}`, 'PUT', data) as Promise<Task>,
  deleteTask: (id: string): Promise<null> => request(`/tasks/${id}`, { method: 'DELETE' }) as Promise<null>,
  createTaskComment: (id: string, data: { body: string }): Promise<TaskComment> => jsonRequest(`/tasks/${id}/comments`, 'POST', data) as Promise<TaskComment>,

  listUsers: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<User[]> => list('/users', query, signal) as Promise<User[]>,
  getUser: (id: string, signal?: AbortSignal): Promise<User> => request(`/users/${id}`, { signal }) as Promise<User>,
  getMemberSummary: (id: string, signal?: AbortSignal): Promise<MemberSummary> => request(`/users/${id}/summary`, { signal }) as Promise<MemberSummary>,
  updateUser: (id: string, data: Partial<User>): Promise<User> => jsonRequest(`/users/${id}`, 'PATCH', data) as Promise<User>,
  listInvitations: (signal?: AbortSignal): Promise<Invitation[]> => request('/invitations', { signal }) as Promise<Invitation[]>,
  createInvitation: (data: CreateInvitationPayload): Promise<Invitation> => jsonRequest('/auth/invitations', 'POST', data) as Promise<Invitation>,
  resendInvitation: (id: string): Promise<null> => request(`/auth/invitations/${id}/resend`, { method: 'POST' }) as Promise<null>,
  revokeInvitation: (id: string): Promise<null> => request(`/auth/invitations/${id}`, { method: 'DELETE' }) as Promise<null>,

  getDashboardOverview: (signal?: AbortSignal): Promise<DashboardOverview> => request('/dashboard/overview', { signal }) as Promise<DashboardOverview>,
  getDashboardAttention: (signal?: AbortSignal): Promise<DashboardAttentionItem[]> => request('/dashboard/attention', { signal }) as Promise<DashboardAttentionItem[]>,

  listLinks: (projectId: string, signal?: AbortSignal): Promise<ProjectLink[]> => request(`/projects/${projectId}/links`, { signal }) as Promise<ProjectLink[]>,
  createLink: (projectId: string, data: CreateLinkPayload): Promise<ProjectLink> => jsonRequest(`/projects/${projectId}/links`, 'POST', data) as Promise<ProjectLink>,
  updateLink: (projectId: string, linkId: string, data: Partial<CreateLinkPayload>): Promise<ProjectLink> => jsonRequest(`/projects/${projectId}/links/${linkId}`, 'PATCH', data) as Promise<ProjectLink>,
  deleteLink: (projectId: string, linkId: string): Promise<null> => request(`/projects/${projectId}/links/${linkId}`, { method: 'DELETE' }) as Promise<null>,

  listPhases: (projectId: string, signal?: AbortSignal): Promise<import('../types/api.js').Phase[]> => request(`/projects/${projectId}/phases`, { signal }) as Promise<import('../types/api.js').Phase[]>,
  createPhase: (projectId: string, data: { name: string; start_date?: string; end_date?: string }): Promise<import('../types/api.js').Phase> => jsonRequest(`/projects/${projectId}/phases`, 'POST', data) as Promise<import('../types/api.js').Phase>,
  updatePhase: (projectId: string, phaseId: string, data: { name?: string; start_date?: string; end_date?: string }): Promise<import('../types/api.js').Phase> => jsonRequest(`/projects/${projectId}/phases/${phaseId}`, 'PATCH', data) as Promise<import('../types/api.js').Phase>,
  deletePhase: (projectId: string, phaseId: string): Promise<null> => request(`/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' }) as Promise<null>,

  listMilestones: (projectId: string, signal?: AbortSignal): Promise<Milestone[]> => request(`/projects/${projectId}/milestones`, { signal }) as Promise<Milestone[]>,
  getMilestone: (id: string, signal?: AbortSignal): Promise<MilestoneDetail> => request(`/milestones/${id}`, { signal }) as Promise<MilestoneDetail>,
  createMilestone: (projectId: string, data: CreateMilestonePayload): Promise<Milestone> => jsonRequest(`/projects/${projectId}/milestones`, 'POST', data) as Promise<Milestone>,
  updateMilestone: (id: string, data: Partial<CreateMilestonePayload>): Promise<Milestone> => jsonRequest(`/milestones/${id}`, 'PATCH', data) as Promise<Milestone>,
  deleteMilestone: (id: string): Promise<null> => request(`/milestones/${id}`, { method: 'DELETE' }) as Promise<null>,

  getFinancialSummary: (projectId: string, signal?: AbortSignal): Promise<FinancialSummary> => request(`/projects/${projectId}/financial-summary`, { signal }) as Promise<FinancialSummary>,
  listBudgetLines: (projectId: string, signal?: AbortSignal): Promise<BudgetLine[]> => request(`/projects/${projectId}/budget-lines`, { signal }) as Promise<BudgetLine[]>,
  createBudgetLine: (projectId: string, data: CreateBudgetLinePayload): Promise<BudgetLine> => jsonRequest(`/projects/${projectId}/budget-lines`, 'POST', data) as Promise<BudgetLine>,
  updateBudgetLine: (id: string, data: Partial<CreateBudgetLinePayload>): Promise<BudgetLine> => jsonRequest(`/budget-lines/${id}`, 'PATCH', data) as Promise<BudgetLine>,
  deleteBudgetLine: (id: string): Promise<null> => request(`/budget-lines/${id}`, { method: 'DELETE' }) as Promise<null>,
  listSpendRecords: (projectId: string, signal?: AbortSignal): Promise<SpendRecord[]> => request(`/projects/${projectId}/spend-records`, { signal }) as Promise<SpendRecord[]>,
  createSpendRecord: (projectId: string, data: CreateSpendRecordPayload): Promise<SpendRecord> => jsonRequest(`/projects/${projectId}/spend-records`, 'POST', data) as Promise<SpendRecord>,
  updateSpendRecord: (id: string, data: Partial<CreateSpendRecordPayload>): Promise<SpendRecord> => jsonRequest(`/spend-records/${id}`, 'PATCH', data) as Promise<SpendRecord>,
  deleteSpendRecord: (id: string): Promise<null> => request(`/spend-records/${id}`, { method: 'DELETE' }) as Promise<null>,

  getWorkload: (query?: { starts_on?: string; ends_on?: string }, signal?: AbortSignal): Promise<WorkloadItem[]> => list('/resources/workload', query, signal) as Promise<WorkloadItem[]>,

  listCapacityProfiles: (userId: string, signal?: AbortSignal): Promise<CapacityProfile[]> => request(`/users/${userId}/capacity-profiles`, { signal }) as Promise<CapacityProfile[]>,
  listAllCapacityProfiles: (signal?: AbortSignal): Promise<CapacityProfile[]> => request('/resources/capacity-profiles', { signal }) as Promise<CapacityProfile[]>,
  createCapacityProfile: (userId: string, data: Omit<CapacityProfile, 'id' | 'user_id'>): Promise<CapacityProfile> => jsonRequest(`/users/${userId}/capacity-profiles`, 'POST', data) as Promise<CapacityProfile>,
  updateCapacityProfile: (userId: string, profileId: string, data: Partial<CapacityProfile>): Promise<CapacityProfile> => jsonRequest(`/users/${userId}/capacity-profiles/${profileId}`, 'PATCH', data) as Promise<CapacityProfile>,

  listAllAvailability: (signal?: AbortSignal): Promise<Availability[]> => request('/resources/availability', { signal }) as Promise<Availability[]>,
  createAvailability: (userId: string, data: Omit<Availability, 'id' | 'user_id'>): Promise<Availability> => jsonRequest(`/users/${userId}/availability`, 'POST', data) as Promise<Availability>,
  updateAvailability: (userId: string, availabilityId: string, data: Partial<Availability>): Promise<Availability> => jsonRequest(`/users/${userId}/availability/${availabilityId}`, 'PATCH', data) as Promise<Availability>,
  deleteAvailability: (userId: string, availabilityId: string): Promise<null> => request(`/users/${userId}/availability/${availabilityId}`, { method: 'DELETE' }) as Promise<null>,

  listMemberAllocations: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<MemberAllocation[]> => list('/project-member-allocations', query, signal) as Promise<MemberAllocation[]>,
  createMemberAllocation: (data: Omit<MemberAllocation, 'id'>): Promise<MemberAllocation> => jsonRequest('/project-member-allocations', 'POST', data) as Promise<MemberAllocation>,
  updateMemberAllocation: (id: string, data: Partial<MemberAllocation>): Promise<MemberAllocation> => jsonRequest(`/project-member-allocations/${id}`, 'PATCH', data) as Promise<MemberAllocation>,
  deleteMemberAllocation: (id: string): Promise<null> => request(`/project-member-allocations/${id}`, { method: 'DELETE' }) as Promise<null>,

  getProjectAllocations: (projectId: string, signal?: AbortSignal): Promise<ProjectAllocation[]> => request(`/projects/${projectId}/allocations`, { signal }) as Promise<ProjectAllocation[]>,
  getProjectWorkload: (projectId: string, query?: { starts_on?: string; ends_on?: string }, signal?: AbortSignal): Promise<WorkloadItem[]> => list(`/projects/${projectId}/workload`, query, signal) as Promise<WorkloadItem[]>,

  listRisks: (projectId: string, signal?: AbortSignal): Promise<Risk[]> => request(`/projects/${projectId}/risks`, { signal }) as Promise<Risk[]>,
  listAllRisks: (signal?: AbortSignal): Promise<Risk[]> => request('/risks', { signal }) as Promise<Risk[]>,
  createRisk: (projectId: string, data: Omit<Risk, 'id' | 'project_id'>): Promise<Risk> => jsonRequest(`/projects/${projectId}/risks`, 'POST', data) as Promise<Risk>,
  updateRisk: (id: string, data: Partial<Risk>): Promise<Risk> => jsonRequest(`/risks/${id}`, 'PATCH', data) as Promise<Risk>,
  deleteRisk: (id: string): Promise<null> => request(`/risks/${id}`, { method: 'DELETE' }) as Promise<null>,
  listIssues: (projectId: string, signal?: AbortSignal): Promise<Issue[]> => request(`/projects/${projectId}/issues`, { signal }) as Promise<Issue[]>,
  listAllIssues: (signal?: AbortSignal): Promise<Issue[]> => request('/issues', { signal }) as Promise<Issue[]>,
  createIssue: (projectId: string, data: Omit<Issue, 'id' | 'project_id'>): Promise<Issue> => jsonRequest(`/projects/${projectId}/issues`, 'POST', data) as Promise<Issue>,
  updateIssue: (id: string, data: Partial<Issue>): Promise<Issue> => jsonRequest(`/issues/${id}`, 'PATCH', data) as Promise<Issue>,
  deleteIssue: (id: string): Promise<null> => request(`/issues/${id}`, { method: 'DELETE' }) as Promise<null>,

  listVaultEntries: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<VaultEntry[]> => list('/vault/entries', query, signal) as Promise<VaultEntry[]>,
  getVaultEntry: (id: string, signal?: AbortSignal): Promise<VaultEntry> => request(`/vault/entries/${id}`, { signal }) as Promise<VaultEntry>,
  createVaultEntry: (data: CreateVaultEntryPayload): Promise<VaultEntry> => jsonRequest('/vault/entries', 'POST', data) as Promise<VaultEntry>,
  updateVaultEntry: (id: string, data: Partial<CreateVaultEntryPayload>): Promise<VaultEntry> => jsonRequest(`/vault/entries/${id}`, 'PATCH', data) as Promise<VaultEntry>,
  deleteVaultEntry: (id: string): Promise<null> => request(`/vault/entries/${id}`, { method: 'DELETE' }) as Promise<null>,
  revealVaultSecret: (id: string): Promise<{ secret_value: string }> => request(`/vault/entries/${id}/reveal`, { method: 'POST' }) as Promise<{ secret_value: string }>,
  listVaultFiles: (entryId: string, signal?: AbortSignal): Promise<VaultFile[]> => request(`/vault/entries/${entryId}/files`, { signal }) as Promise<VaultFile[]>,
  createUploadIntent: (entryId: string, data: { filename: string; content_type: string; size_bytes: number }): Promise<VaultUploadIntent> => jsonRequest(`/vault/entries/${entryId}/files/upload-intents`, 'POST', data) as Promise<VaultUploadIntent>,
  uploadToSignedUrl,
  finalizeUpload: (fileId: string, data: Record<string, unknown>): Promise<{ file_id: string; storage_status: VaultFile['storage_status'] }> => jsonRequest(`/vault/files/${fileId}/finalize`, 'POST', data) as Promise<{ file_id: string; storage_status: VaultFile['storage_status'] }>,
  reviewVaultFile: (fileId: string, status: 'available' | 'rejected'): Promise<{ file_id: string; storage_status: VaultFile['storage_status'] }> => jsonRequest(`/vault/files/${fileId}/review`, 'POST', { status }) as Promise<{ file_id: string; storage_status: VaultFile['storage_status'] }>,
  getFileDownload: (fileId: string): Promise<{ download_url: string; filename?: string }> => request(`/vault/files/${fileId}/download`, { method: 'POST' }) as Promise<{ download_url: string; filename?: string }>,
  fetchVaultFileContent,
  deleteVaultFile: (fileId: string): Promise<null> => request(`/vault/files/${fileId}`, { method: 'DELETE' }) as Promise<null>,
};
