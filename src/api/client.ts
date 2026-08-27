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
  WorkloadItem,
  Asset,
  MemberAllocation,
  AssetAllocation,
  CapacityProfile,
  Availability,
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
} from '../types/api.js';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = configuredBaseUrl.replace(/\/$/, '');

let csrfToken: string | null = null;
let unauthorizedHandler: (() => Promise<void>) | null = null;
let isHandlingUnauthorized = false;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setCsrfToken(token: string | null): void { csrfToken = token || null; }
export function setUnauthorizedHandler(handler: (() => Promise<void>) | null): void { unauthorizedHandler = handler; }

function withQuery(path: string, query?: Record<string, unknown>): string {
  const parameters = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') parameters.set(key, String(value));
  });
  const suffix = parameters.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function notifyUnauthorized(): Promise<void> {
  if (isHandlingUnauthorized || !unauthorizedHandler) return;
  isHandlingUnauthorized = true;
  try { await unauthorizedHandler(); } finally { isHandlingUnauthorized = false; }
}

function buildHeaders(method: string, body?: string, headers?: HeadersInit): Headers {
  const resolvedHeaders = new Headers(headers);
  if (body !== undefined && !resolvedHeaders.has('Content-Type')) resolvedHeaders.set('Content-Type', 'application/json');
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) resolvedHeaders.set('X-CSRF-Token', csrfToken);
  return resolvedHeaders;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  return body;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const method = (options.method || 'GET') as string;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, method, credentials: 'include', headers: buildHeaders(method, options.body as string | undefined, options.headers) });
  if (response.status === 401) {
    setCsrfToken(null);
    await notifyUnauthorized();
  }
  return parseResponse(response);
}

function jsonRequest(path: string, method: string, data: unknown): Promise<unknown> { return request(path, { method, body: JSON.stringify(data) }); }
function list(path: string, query: Record<string, unknown> | undefined, signal: AbortSignal | undefined): Promise<unknown> { return request(withQuery(path, query), { signal }); }

async function uploadToSignedUrl(uploadUrl: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new ApiError('File upload failed.', response.status);
  onProgress?.(100);
}

export const api = {
  login: (data: LoginPayload): Promise<AuthSession> => jsonRequest('/auth/login', 'POST', data) as Promise<AuthSession>,
  acceptInvitation: (token: string, data: { password: string }): Promise<AuthSession> => jsonRequest(`/auth/invitations/${encodeURIComponent(token)}/accept`, 'POST', data) as Promise<AuthSession>,
  getCurrentUser: (): Promise<{ user: User }> => request('/auth/me') as Promise<{ user: User }>,
  getCsrfToken: (): Promise<{ csrfToken: string }> => request('/auth/csrf') as Promise<{ csrfToken: string }>,
  logout: (): Promise<null> => request('/auth/logout', { method: 'POST' }) as Promise<null>,
  changePassword: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }): Promise<null> => jsonRequest('/auth/change-password', 'POST', { current_password: currentPassword, new_password: newPassword }) as Promise<null>,

  listProjects: ({ signal, ...query }: { signal?: AbortSignal } & Partial<ProjectFilters> = {}): Promise<Project[]> => list('/projects', query, signal) as Promise<Project[]>,
  getProject: (id: number, signal?: AbortSignal): Promise<Project> => request(`/projects/${id}`, { signal }) as Promise<Project>,
  createProject: (data: CreateProjectPayload): Promise<Project> => jsonRequest('/projects', 'POST', data) as Promise<Project>,
  updateProject: (id: number, data: Partial<CreateProjectPayload>): Promise<Project> => jsonRequest(`/projects/${id}`, 'PUT', data) as Promise<Project>,
  deleteProject: (id: number): Promise<null> => request(`/projects/${id}`, { method: 'DELETE' }) as Promise<null>,

  listProjectMembers: (projectId: number, signal?: AbortSignal): Promise<ProjectMember[]> => request(`/projects/${projectId}/members`, { signal }) as Promise<ProjectMember[]>,
  addProjectMember: (projectId: number, data: { user_id: number; project_role: string }): Promise<ProjectMember> => jsonRequest(`/projects/${projectId}/members`, 'POST', data) as Promise<ProjectMember>,
  removeProjectMember: (projectId: number, userId: number): Promise<null> => request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }) as Promise<null>,

  listTasks: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<Task[]> => list('/tasks', query, signal) as Promise<Task[]>,
  getTask: (id: number, signal?: AbortSignal): Promise<Task> => request(`/tasks/${id}`, { signal }) as Promise<Task>,
  getTaskActivity: (id: number, signal?: AbortSignal): Promise<{ activity: import('../types/api.js').TaskActivityEvent[] }> => request(`/tasks/${id}/activity`, { signal }) as Promise<{ activity: import('../types/api.js').TaskActivityEvent[] }>,
  createTask: (data: CreateTaskPayload): Promise<Task> => jsonRequest('/tasks', 'POST', data) as Promise<Task>,
  updateTask: (id: number, data: Partial<CreateTaskPayload>): Promise<Task> => jsonRequest(`/tasks/${id}`, 'PUT', data) as Promise<Task>,
  deleteTask: (id: number): Promise<null> => request(`/tasks/${id}`, { method: 'DELETE' }) as Promise<null>,
  createTaskComment: (id: number, data: { body: string }): Promise<TaskComment> => jsonRequest(`/tasks/${id}/comments`, 'POST', data) as Promise<TaskComment>,

  listUsers: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<User[]> => list('/users', query, signal) as Promise<User[]>,
  getUser: (id: number, signal?: AbortSignal): Promise<User> => request(`/users/${id}`, { signal }) as Promise<User>,
  updateUser: (id: number, data: Partial<User>): Promise<User> => jsonRequest(`/users/${id}`, 'PATCH', data) as Promise<User>,
  listInvitations: (signal?: AbortSignal): Promise<Invitation[]> => request('/invitations', { signal }) as Promise<Invitation[]>,
  createInvitation: (data: CreateInvitationPayload): Promise<Invitation> => jsonRequest('/auth/invitations', 'POST', data) as Promise<Invitation>,
  resendInvitation: (id: number): Promise<null> => request(`/auth/invitations/${id}/resend`, { method: 'POST' }) as Promise<null>,
  revokeInvitation: (id: number): Promise<null> => request(`/auth/invitations/${id}`, { method: 'DELETE' }) as Promise<null>,

  getDashboardOverview: (signal?: AbortSignal): Promise<DashboardOverview> => request('/dashboard/overview', { signal }) as Promise<DashboardOverview>,
  getDashboardAttention: (signal?: AbortSignal): Promise<DashboardAttentionItem[]> => request('/dashboard/attention', { signal }) as Promise<DashboardAttentionItem[]>,

  listLinks: (projectId: number, signal?: AbortSignal): Promise<ProjectLink[]> => request(`/projects/${projectId}/links`, { signal }) as Promise<ProjectLink[]>,
  createLink: (projectId: number, data: CreateLinkPayload): Promise<ProjectLink> => jsonRequest(`/projects/${projectId}/links`, 'POST', data) as Promise<ProjectLink>,
  updateLink: (projectId: number, linkId: number, data: Partial<CreateLinkPayload>): Promise<ProjectLink> => jsonRequest(`/projects/${projectId}/links/${linkId}`, 'PATCH', data) as Promise<ProjectLink>,
  deleteLink: (projectId: number, linkId: number): Promise<null> => request(`/projects/${projectId}/links/${linkId}`, { method: 'DELETE' }) as Promise<null>,

  listPhases: (projectId: number, signal?: AbortSignal): Promise<import('../types/api.js').Phase[]> => request(`/projects/${projectId}/phases`, { signal }) as Promise<import('../types/api.js').Phase[]>,
  createPhase: (projectId: number, data: { name: string; start_date?: string; end_date?: string }): Promise<import('../types/api.js').Phase> => jsonRequest(`/projects/${projectId}/phases`, 'POST', data) as Promise<import('../types/api.js').Phase>,
  updatePhase: (projectId: number, phaseId: number, data: { name?: string; start_date?: string; end_date?: string }): Promise<import('../types/api.js').Phase> => jsonRequest(`/projects/${projectId}/phases/${phaseId}`, 'PATCH', data) as Promise<import('../types/api.js').Phase>,
  deletePhase: (projectId: number, phaseId: number): Promise<null> => request(`/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' }) as Promise<null>,

  listMilestones: (projectId: number, signal?: AbortSignal): Promise<Milestone[]> => request(`/projects/${projectId}/milestones`, { signal }) as Promise<Milestone[]>,
  createMilestone: (projectId: number, data: CreateMilestonePayload): Promise<Milestone> => jsonRequest(`/projects/${projectId}/milestones`, 'POST', data) as Promise<Milestone>,
  updateMilestone: (id: number, data: Partial<CreateMilestonePayload>): Promise<Milestone> => jsonRequest(`/milestones/${id}`, 'PATCH', data) as Promise<Milestone>,
  deleteMilestone: (id: number): Promise<null> => request(`/milestones/${id}`, { method: 'DELETE' }) as Promise<null>,

  getFinancialSummary: (projectId: number, signal?: AbortSignal): Promise<FinancialSummary> => request(`/projects/${projectId}/financial-summary`, { signal }) as Promise<FinancialSummary>,
  listBudgetLines: (projectId: number, signal?: AbortSignal): Promise<BudgetLine[]> => request(`/projects/${projectId}/budget-lines`, { signal }) as Promise<BudgetLine[]>,
  createBudgetLine: (projectId: number, data: CreateBudgetLinePayload): Promise<BudgetLine> => jsonRequest(`/projects/${projectId}/budget-lines`, 'POST', data) as Promise<BudgetLine>,
  updateBudgetLine: (id: number, data: Partial<CreateBudgetLinePayload>): Promise<BudgetLine> => jsonRequest(`/budget-lines/${id}`, 'PATCH', data) as Promise<BudgetLine>,
  deleteBudgetLine: (id: number): Promise<null> => request(`/budget-lines/${id}`, { method: 'DELETE' }) as Promise<null>,
  listSpendRecords: (projectId: number, signal?: AbortSignal): Promise<SpendRecord[]> => request(`/projects/${projectId}/spend-records`, { signal }) as Promise<SpendRecord[]>,
  createSpendRecord: (projectId: number, data: CreateSpendRecordPayload): Promise<SpendRecord> => jsonRequest(`/projects/${projectId}/spend-records`, 'POST', data) as Promise<SpendRecord>,
  updateSpendRecord: (id: number, data: Partial<CreateSpendRecordPayload>): Promise<SpendRecord> => jsonRequest(`/spend-records/${id}`, 'PATCH', data) as Promise<SpendRecord>,
  deleteSpendRecord: (id: number): Promise<null> => request(`/spend-records/${id}`, { method: 'DELETE' }) as Promise<null>,

  getWorkload: (signal?: AbortSignal): Promise<WorkloadItem[]> => request('/resources/workload', { signal }) as Promise<WorkloadItem[]>,

  listCapacityProfiles: (userId: number, signal?: AbortSignal): Promise<CapacityProfile[]> => request(`/users/${userId}/capacity-profiles`, { signal }) as Promise<CapacityProfile[]>,
  createCapacityProfile: (userId: number, data: Omit<CapacityProfile, 'id' | 'user_id'>): Promise<CapacityProfile> => jsonRequest(`/users/${userId}/capacity-profiles`, 'POST', data) as Promise<CapacityProfile>,
  updateCapacityProfile: (userId: number, profileId: number, data: Partial<CapacityProfile>): Promise<CapacityProfile> => jsonRequest(`/users/${userId}/capacity-profiles/${profileId}`, 'PATCH', data) as Promise<CapacityProfile>,

  listAvailability: (userId: number, signal?: AbortSignal): Promise<Availability[]> => request(`/users/${userId}/availability`, { signal }) as Promise<Availability[]>,
  createAvailability: (userId: number, data: Omit<Availability, 'id' | 'user_id'>): Promise<Availability> => jsonRequest(`/users/${userId}/availability`, 'POST', data) as Promise<Availability>,
  updateAvailability: (userId: number, availabilityId: number, data: Partial<Availability>): Promise<Availability> => jsonRequest(`/users/${userId}/availability/${availabilityId}`, 'PATCH', data) as Promise<Availability>,
  deleteAvailability: (userId: number, availabilityId: number): Promise<null> => request(`/users/${userId}/availability/${availabilityId}`, { method: 'DELETE' }) as Promise<null>,

  listAssets: (signal?: AbortSignal): Promise<Asset[]> => request('/assets', { signal }) as Promise<Asset[]>,
  createAsset: (data: Omit<Asset, 'id'>): Promise<Asset> => jsonRequest('/assets', 'POST', data) as Promise<Asset>,
  updateAsset: (id: number, data: Partial<Asset>): Promise<Asset> => jsonRequest(`/assets/${id}`, 'PATCH', data) as Promise<Asset>,
  deleteAsset: (id: number): Promise<null> => request(`/assets/${id}`, { method: 'DELETE' }) as Promise<null>,

  listMemberAllocations: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<MemberAllocation[]> => list('/project-member-allocations', query, signal) as Promise<MemberAllocation[]>,
  createMemberAllocation: (data: Omit<MemberAllocation, 'id'>): Promise<MemberAllocation> => jsonRequest('/project-member-allocations', 'POST', data) as Promise<MemberAllocation>,
  updateMemberAllocation: (id: number, data: Partial<MemberAllocation>): Promise<MemberAllocation> => jsonRequest(`/project-member-allocations/${id}`, 'PATCH', data) as Promise<MemberAllocation>,
  deleteMemberAllocation: (id: number): Promise<null> => request(`/project-member-allocations/${id}`, { method: 'DELETE' }) as Promise<null>,

  listAssetAllocations: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<AssetAllocation[]> => list('/asset-allocations', query, signal) as Promise<AssetAllocation[]>,
  createAssetAllocation: (data: Omit<AssetAllocation, 'id'>): Promise<AssetAllocation> => jsonRequest('/asset-allocations', 'POST', data) as Promise<AssetAllocation>,
  updateAssetAllocation: (id: number, data: Partial<AssetAllocation>): Promise<AssetAllocation> => jsonRequest(`/asset-allocations/${id}`, 'PATCH', data) as Promise<AssetAllocation>,
  deleteAssetAllocation: (id: number): Promise<null> => request(`/asset-allocations/${id}`, { method: 'DELETE' }) as Promise<null>,
  getProjectAllocations: (projectId: number, signal?: AbortSignal): Promise<ProjectAllocation[]> => request(`/projects/${projectId}/allocations`, { signal }) as Promise<ProjectAllocation[]>,

  listRisks: (projectId: number, signal?: AbortSignal): Promise<Risk[]> => request(`/projects/${projectId}/risks`, { signal }) as Promise<Risk[]>,
  createRisk: (projectId: number, data: Omit<Risk, 'id' | 'project_id'>): Promise<Risk> => jsonRequest(`/projects/${projectId}/risks`, 'POST', data) as Promise<Risk>,
  updateRisk: (id: number, data: Partial<Risk>): Promise<Risk> => jsonRequest(`/risks/${id}`, 'PATCH', data) as Promise<Risk>,
  deleteRisk: (id: number): Promise<null> => request(`/risks/${id}`, { method: 'DELETE' }) as Promise<null>,
  listIssues: (projectId: number, signal?: AbortSignal): Promise<Issue[]> => request(`/projects/${projectId}/issues`, { signal }) as Promise<Issue[]>,
  createIssue: (projectId: number, data: Omit<Issue, 'id' | 'project_id'>): Promise<Issue> => jsonRequest(`/projects/${projectId}/issues`, 'POST', data) as Promise<Issue>,
  updateIssue: (id: number, data: Partial<Issue>): Promise<Issue> => jsonRequest(`/issues/${id}`, 'PATCH', data) as Promise<Issue>,
  deleteIssue: (id: number): Promise<null> => request(`/issues/${id}`, { method: 'DELETE' }) as Promise<null>,

  listVaultEntries: ({ signal, ...query }: { signal?: AbortSignal } & Record<string, unknown> = {}): Promise<VaultEntry[]> => list('/vault/entries', query, signal) as Promise<VaultEntry[]>,
  getVaultEntry: (id: number, signal?: AbortSignal): Promise<VaultEntry> => request(`/vault/entries/${id}`, { signal }) as Promise<VaultEntry>,
  createVaultEntry: (data: CreateVaultEntryPayload): Promise<VaultEntry> => jsonRequest('/vault/entries', 'POST', data) as Promise<VaultEntry>,
  updateVaultEntry: (id: number, data: Partial<CreateVaultEntryPayload>): Promise<VaultEntry> => jsonRequest(`/vault/entries/${id}`, 'PATCH', data) as Promise<VaultEntry>,
  deleteVaultEntry: (id: number): Promise<null> => request(`/vault/entries/${id}`, { method: 'DELETE' }) as Promise<null>,
  revealVaultSecret: (id: number): Promise<{ secret_value: string }> => request(`/vault/entries/${id}/reveal`, { method: 'POST' }) as Promise<{ secret_value: string }>,
  listVaultFiles: (entryId: number, signal?: AbortSignal): Promise<VaultFile[]> => request(`/vault/entries/${entryId}/files`, { signal }) as Promise<VaultFile[]>,
  createUploadIntent: (entryId: number, data: { filename: string; content_type: string; size_bytes: number }): Promise<VaultFile> => jsonRequest(`/vault/entries/${entryId}/files/upload-intents`, 'POST', data) as Promise<VaultFile>,
  uploadToSignedUrl,
  finalizeUpload: (fileId: number, data: Record<string, unknown>): Promise<null> => jsonRequest(`/vault/files/${fileId}/finalize`, 'POST', data) as Promise<null>,
  getFileDownload: (fileId: number): Promise<{ download_url: string }> => request(`/vault/files/${fileId}/download`, { method: 'POST' }) as Promise<{ download_url: string }>,
  deleteVaultFile: (fileId: number): Promise<null> => request(`/vault/files/${fileId}`, { method: 'DELETE' }) as Promise<null>,
};
