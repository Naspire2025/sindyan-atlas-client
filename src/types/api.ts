export interface Option {
  value: string;
  label: string;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  priority?: string;
  summary?: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'blocked' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'reviewing' | 'reviewed' | 'done';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type UserRole = 'admin' | 'team_member';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskProbability = 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigating' | 'escalated' | 'resolved';
export type IssueStatus = 'open' | 'mitigating' | 'escalated' | 'resolved';
export type VaultEntryType = 'credential' | 'secret_key' | 'markdown_note' | 'file' | 'external_link';
export type ProjectRole = 'member' | 'project_lead';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'done' | 'missed';
export type HealthStatus = 'complete' | 'behind' | 'at_risk' | 'on_track' | 'no_update';
export type ThemePreference = 'system' | 'dark' | 'light';

export interface Option {
  value: string;
  label: string;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  priority?: string;
  summary?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface MemberProjectSummary {
  project_id: string;
  project_name: string;
  status: string;
  priority: string;
  project_role: ProjectRole;
}

export interface MemberAssignmentItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  project_id: string;
  project_name: string;
}

export interface MemberAssignments {
  tasks: MemberAssignmentItem[];
  risks: Array<{ id: string; title: string; severity: string; status: string; due_date?: string | null; project_id: string; project_name: string }>;
  issues: Array<{ id: string; title: string; priority: string; status: string; target_resolution_date?: string | null; project_id: string; project_name: string }>;
  vault_entries: Array<{ id: string; title: string; entry_type: string; category?: string | null; project_id?: string | null; project_name?: string | null }>;
  allocations: Array<{ project_id: string; project_name: string; starts_on: string; ends_on: string; allocation_percent: number }>;
}

export interface MemberSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  projects: MemberProjectSummary[];
  assignments: MemberAssignments;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  project_id: string;
  project_role: ProjectRole;
  name: string;
  email?: string;
  status: UserStatus;
}

export interface TaskSummary {
  total_tasks: number;
  done_tasks: number;
  blocked_tasks: number;
}

export interface Task {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string;
  assignee_user_id?: string | null;
  assignee_name?: string;
  owner?: string;
  milestone_id?: string | null;
  milestone_title?: string;
  blocker_note?: string;
  project_role?: ProjectRole;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  comments: TaskComment[];
  activity?: TaskActivityEvent[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  body: string;
  author: string;
  created_at: string;
}

export interface TaskActivityEvent {
  id: string;
  actor_name?: string;
  actor?: string;
  event_type: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  owner?: string;
  owner_name?: string;
  owner_user_id?: string;
  start_date?: string;
  deadline?: string;
  website_url?: string;
  drive_folder_url?: string;
  budget_allocated_amount?: number;
  budget_currency?: string;
  task_summary?: TaskSummary;
  tasks?: Task[];
  milestones?: Milestone[];
  team_members?: ProjectMember[];
  phases?: Phase[];
  links?: ProjectLink[];
}

export interface Milestone {
  id: string;
  project_id: string;
  phase_id?: string;
  phase_name?: string;
  title: string;
  target_date?: string;
  status: MilestoneStatus;
}

export interface MilestoneTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string;
  assignee_user_id?: string | null;
  assignee_name?: string;
  project_id: string;
  project_name: string;
}

export interface MilestoneMember {
  user_id: string;
  name: string;
  email?: string;
  project_role: ProjectRole;
}

export interface MilestoneDetail extends Milestone {
  project_name: string;
  progress: number;
  tasks: MilestoneTask[];
  members: MilestoneMember[];
}

export interface Phase {
  id: string;
  project_id: string;
  name: string;
  position?: number;
  start_date?: string;
  end_date?: string;
}

export interface ProjectLink {
  id: string;
  project_id: string;
  url: string;
  label?: string;
  title?: string;
  link_type?: string;
}

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  probability?: RiskProbability;
  status?: RiskStatus;
  mitigation_note?: string;
  mitigation_progress?: number;
  owner_user_id?: string;
  due_date?: string;
}

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  status?: IssueStatus;
}

export interface BudgetLine {
  id: string;
  project_id: string;
  category: string;
  planned_amount: number;
  currency: string;
  effective_date: string;
  note?: string;
}

export interface SpendRecord {
  id: string;
  project_id: string;
  amount: number;
  category?: string;
  description?: string;
  spend_date?: string;
  effective_date?: string;
}

export interface FinancialSummary {
  budget_allocated_amount?: number;
  budget_currency?: string;
  total_planned: number;
  total_spent: number;
  remaining?: number;
  variance?: number;
  currency: string;
}

export interface Invitation {
  id: string;
  name: string;
  email: string;
  role?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  created_at?: string;
}

export interface DashboardAttentionItem {
  id?: string;
  project_id?: string;
  title?: string;
  name?: string;
  description?: string;
  detail?: string;
  reason?: string;
  severity?: string;
  item_type?: 'task' | 'milestone' | 'risk' | 'issue';
}

export interface DashboardOverview {
  total_projects?: number;
  active_projects?: number;
  blocked_projects?: number;
  overdue_projects?: number;
}

export interface VaultEntry {
  id: string;
  title: string;
  entry_type: VaultEntryType;
  category?: string;
  project_id?: string | null;
  owner_user_id?: string;
  tags?: VaultTag[];
  markdown_content?: string;
  external_url?: string;
  secret_value?: string;
  files?: VaultFile[];
}

export interface VaultTag {
  name: string;
  display_name?: string;
}

export interface VaultFile {
  id: string;
  vault_entry_id?: string;
  original_filename: string;
  content_type?: string;
  size_bytes?: number;
  storage_status?: 'pending' | 'quarantined' | 'available' | 'rejected' | 'deleted' | 'deletion_pending';
  uploaded_by_user_id?: string;
  uploaded_at?: string;
  available_at?: string;
}

export interface VaultUploadIntent {
  file_id: string;
  upload_url: string;
  storage_status: 'pending';
}

export interface WorkloadItem {
  user_id?: string;
  id?: string;
  user_name?: string;
  name?: string;
  email?: string;
  allocated_hours?: number;
  capacity_hours?: number;
}

export interface Asset {
  id: string;
  name: string;
  type?: string;
  asset_type?: string;
  status?: string;
}

export interface MemberAllocation {
  id: string;
  user_id?: string;
  user_name?: string;
  project_id?: string;
  project_name?: string;
  allocation_percentage?: number;
  percentage?: number;
}

export interface AssetAllocation {
  id: string;
  asset_id?: string;
  asset_name?: string;
  project_id?: string;
  project_name?: string;
  allocation_percentage?: number;
  percentage?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface CreateInvitationPayload {
  name: string;
  email: string;
  role: UserRole;
  project_assignments?: { project_id: string; project_role: ProjectRole }[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  owner_user_id?: string | null;
  status?: ProjectStatus;
  priority?: Priority;
  start_date?: string;
  deadline?: string;
  website_url?: string;
  drive_folder_url?: string;
  budget_allocated_amount?: number | null;
  budget_currency?: string | null;
  links?: Array<Pick<CreateLinkPayload, 'label' | 'link_type' | 'url'>>;
}

export interface CreateTaskPayload {
  project_id: string;
  title: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
  assignee_user_id?: string | null;
  milestone_id?: string | null;
  status?: TaskStatus;
}

export interface CreateMilestonePayload {
  project_id: string;
  phase_id?: string | null;
  title: string;
  target_date?: string;
  status?: MilestoneStatus;
}

export interface CreateLinkPayload {
  project_id: string;
  url: string;
  label?: string;
  link_type?: string;
}

export interface CreateVaultEntryPayload {
  title: string;
  entry_type: VaultEntryType;
  category?: string;
  project_id?: string | null;
  markdown_content?: string;
  external_url?: string;
  secret_value?: string;
}

export interface CreateBudgetLinePayload {
  category: string;
  planned_amount: number;
  currency: string;
  effective_date: string;
  note?: string;
}

export interface CreateSpendRecordPayload {
  project_id: string;
  amount: number;
  category?: string;
  description?: string;
  spend_date?: string;
}

export interface CapacityProfile {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  capacity_hours: number;
  notes?: string;
}

export interface Availability {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'available' | 'unavailable' | 'limited';
  notes?: string;
}

export interface ProjectAllocation {
  user_id?: string;
  user_name?: string;
  project_id?: string;
  project_name?: string;
  allocation_percentage?: number;
  percentage?: number;
}
