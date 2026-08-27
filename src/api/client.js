const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = configuredBaseUrl.replace(/\/$/, '');

let csrfToken = null;
let unauthorizedHandler = null;
let isHandlingUnauthorized = false;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setCsrfToken(token) { csrfToken = token || null; }
export function setUnauthorizedHandler(handler) { unauthorizedHandler = handler; }

function withQuery(path, query) {
  const parameters = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') parameters.set(key, String(value));
  });
  const suffix = parameters.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function notifyUnauthorized() {
  if (isHandlingUnauthorized || !unauthorizedHandler) return;
  isHandlingUnauthorized = true;
  try { await unauthorizedHandler(); } finally { isHandlingUnauthorized = false; }
}

function buildHeaders(method, body, headers) {
  const resolvedHeaders = new Headers(headers);
  if (body !== undefined && !resolvedHeaders.has('Content-Type')) resolvedHeaders.set('Content-Type', 'application/json');
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) resolvedHeaders.set('X-CSRF-Token', csrfToken);
  return resolvedHeaders;
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  return body;
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const response = await fetch(`${BASE_URL}${path}`, { ...options, method, credentials: 'include', headers: buildHeaders(method, options.body, options.headers) });
  if (response.status === 401) {
    setCsrfToken(null);
    await notifyUnauthorized();
  }
  return parseResponse(response);
}

function jsonRequest(path, method, data) { return request(path, { method, body: JSON.stringify(data) }); }
function list(path, query, signal) { return request(withQuery(path, query), { signal }); }

async function uploadToSignedUrl(uploadUrl, file, onProgress) {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new ApiError('File upload failed.', response.status);
  onProgress?.(100);
}

export const api = {
  login: (data) => jsonRequest('/auth/login', 'POST', data),
  acceptInvitation: (token, data) => jsonRequest(`/auth/invitations/${encodeURIComponent(token)}/accept`, 'POST', data),
  getCurrentUser: () => request('/auth/me'), getCsrfToken: () => request('/auth/csrf'), logout: () => request('/auth/logout', { method: 'POST' }), changePassword: ({ currentPassword, newPassword }) => jsonRequest('/auth/change-password', 'POST', { current_password: currentPassword, new_password: newPassword }),
  listProjects: ({ signal, ...query } = {}) => list('/projects', query, signal), getProject: (id, signal) => request(`/projects/${id}`, { signal }), createProject: (data) => jsonRequest('/projects', 'POST', data), updateProject: (id, data) => jsonRequest(`/projects/${id}`, 'PUT', data), deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  listProjectMembers: (projectId, signal) => request(`/projects/${projectId}/members`, { signal }), addProjectMember: (projectId, data) => jsonRequest(`/projects/${projectId}/members`, 'POST', data), removeProjectMember: (projectId, userId) => request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  listTasks: ({ signal, ...query } = {}) => list('/tasks', query, signal), getTask: (id, signal) => request(`/tasks/${id}`, { signal }), getTaskActivity: (id, signal) => request(`/tasks/${id}/activity`, { signal }), createTask: (data) => jsonRequest('/tasks', 'POST', data), updateTask: (id, data) => jsonRequest(`/tasks/${id}`, 'PUT', data), deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }), createTaskComment: (id, data) => jsonRequest(`/tasks/${id}/comments`, 'POST', data),
  listUsers: ({ signal, ...query } = {}) => list('/users', query, signal), getUser: (id, signal) => request(`/users/${id}`, { signal }), updateUser: (id, data) => jsonRequest(`/users/${id}`, 'PATCH', data), listInvitations: (signal) => request('/invitations', { signal }), createInvitation: (data) => jsonRequest('/auth/invitations', 'POST', data), resendInvitation: (id) => request(`/auth/invitations/${id}/resend`, { method: 'POST' }), revokeInvitation: (id) => request(`/auth/invitations/${id}`, { method: 'DELETE' }),
  getDashboardOverview: (signal) => request('/dashboard/overview', { signal }), getDashboardAttention: (signal) => request('/dashboard/attention', { signal }),
  listLinks: (projectId, signal) => request(`/projects/${projectId}/links`, { signal }), createLink: (projectId, data) => jsonRequest(`/projects/${projectId}/links`, 'POST', data), updateLink: (projectId, linkId, data) => jsonRequest(`/projects/${projectId}/links/${linkId}`, 'PATCH', data), deleteLink: (projectId, linkId) => request(`/projects/${projectId}/links/${linkId}`, { method: 'DELETE' }),
  listPhases: (projectId, signal) => request(`/projects/${projectId}/phases`, { signal }), createPhase: (projectId, data) => jsonRequest(`/projects/${projectId}/phases`, 'POST', data), updatePhase: (projectId, phaseId, data) => jsonRequest(`/projects/${projectId}/phases/${phaseId}`, 'PATCH', data), deletePhase: (projectId, phaseId) => request(`/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' }),
  listMilestones: (projectId, signal) => request(`/projects/${projectId}/milestones`, { signal }), createMilestone: (projectId, data) => jsonRequest(`/projects/${projectId}/milestones`, 'POST', data), updateMilestone: (id, data) => jsonRequest(`/milestones/${id}`, 'PATCH', data), deleteMilestone: (id) => request(`/milestones/${id}`, { method: 'DELETE' }),
  getFinancialSummary: (projectId, signal) => request(`/projects/${projectId}/financial-summary`, { signal }), listBudgetLines: (projectId, signal) => request(`/projects/${projectId}/budget-lines`, { signal }), createBudgetLine: (projectId, data) => jsonRequest(`/projects/${projectId}/budget-lines`, 'POST', data), updateBudgetLine: (id, data) => jsonRequest(`/budget-lines/${id}`, 'PATCH', data), deleteBudgetLine: (id) => request(`/budget-lines/${id}`, { method: 'DELETE' }), listSpendRecords: (projectId, signal) => request(`/projects/${projectId}/spend-records`, { signal }), createSpendRecord: (projectId, data) => jsonRequest(`/projects/${projectId}/spend-records`, 'POST', data), updateSpendRecord: (id, data) => jsonRequest(`/spend-records/${id}`, 'PATCH', data), deleteSpendRecord: (id) => request(`/spend-records/${id}`, { method: 'DELETE' }),
  getWorkload: (signal) => request('/resources/workload', { signal }),
  listCapacityProfiles: (userId, signal) => request(`/users/${userId}/capacity-profiles`, { signal }), createCapacityProfile: (userId, data) => jsonRequest(`/users/${userId}/capacity-profiles`, 'POST', data), updateCapacityProfile: (userId, profileId, data) => jsonRequest(`/users/${userId}/capacity-profiles/${profileId}`, 'PATCH', data),
  listAvailability: (userId, signal) => request(`/users/${userId}/availability`, { signal }), createAvailability: (userId, data) => jsonRequest(`/users/${userId}/availability`, 'POST', data), updateAvailability: (userId, availabilityId, data) => jsonRequest(`/users/${userId}/availability/${availabilityId}`, 'PATCH', data), deleteAvailability: (userId, availabilityId) => request(`/users/${userId}/availability/${availabilityId}`, { method: 'DELETE' }),
  listAssets: (signal) => request('/assets', { signal }), createAsset: (data) => jsonRequest('/assets', 'POST', data), updateAsset: (id, data) => jsonRequest(`/assets/${id}`, 'PATCH', data), deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
  listMemberAllocations: ({ signal, ...query } = {}) => list('/project-member-allocations', query, signal), createMemberAllocation: (data) => jsonRequest('/project-member-allocations', 'POST', data), updateMemberAllocation: (id, data) => jsonRequest(`/project-member-allocations/${id}`, 'PATCH', data), deleteMemberAllocation: (id) => request(`/project-member-allocations/${id}`, { method: 'DELETE' }),
  listAssetAllocations: ({ signal, ...query } = {}) => list('/asset-allocations', query, signal), createAssetAllocation: (data) => jsonRequest('/asset-allocations', 'POST', data), updateAssetAllocation: (id, data) => jsonRequest(`/asset-allocations/${id}`, 'PATCH', data), deleteAssetAllocation: (id) => request(`/asset-allocations/${id}`, { method: 'DELETE' }), getProjectAllocations: (projectId, signal) => request(`/projects/${projectId}/allocations`, { signal }),
  listRisks: (projectId, signal) => request(`/projects/${projectId}/risks`, { signal }), createRisk: (projectId, data) => jsonRequest(`/projects/${projectId}/risks`, 'POST', data), updateRisk: (id, data) => jsonRequest(`/risks/${id}`, 'PATCH', data), deleteRisk: (id) => request(`/risks/${id}`, { method: 'DELETE' }), listIssues: (projectId, signal) => request(`/projects/${projectId}/issues`, { signal }), createIssue: (projectId, data) => jsonRequest(`/projects/${projectId}/issues`, 'POST', data), updateIssue: (id, data) => jsonRequest(`/issues/${id}`, 'PATCH', data), deleteIssue: (id) => request(`/issues/${id}`, { method: 'DELETE' }),
  listVaultEntries: ({ signal, ...query } = {}) => list('/vault/entries', query, signal), getVaultEntry: (id, signal) => request(`/vault/entries/${id}`, { signal }), createVaultEntry: (data) => jsonRequest('/vault/entries', 'POST', data), updateVaultEntry: (id, data) => jsonRequest(`/vault/entries/${id}`, 'PATCH', data), deleteVaultEntry: (id) => request(`/vault/entries/${id}`, { method: 'DELETE' }), revealVaultSecret: (id) => request(`/vault/entries/${id}/reveal`, { method: 'POST' }), listVaultFiles: (entryId, signal) => request(`/vault/entries/${entryId}/files`, { signal }), createUploadIntent: (entryId, data) => jsonRequest(`/vault/entries/${entryId}/files/upload-intents`, 'POST', data), uploadToSignedUrl, finalizeUpload: (fileId, data) => jsonRequest(`/vault/files/${fileId}/finalize`, 'POST', data), getFileDownload: (fileId) => request(`/vault/files/${fileId}/download`, { method: 'POST' }), deleteVaultFile: (fileId) => request(`/vault/files/${fileId}`, { method: 'DELETE' }),
};
