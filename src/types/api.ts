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
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed';
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
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

export interface ProjectMember {
  id: number;
  user_id: number;
  project_id: number;
  project_role: ProjectRole;
  name: string;
  email?: string;
}

export interface TaskSummary {
  total_tasks: number;
  done_tasks: number;
  blocked_tasks: number;
}

export interface Task {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string;
  assignee_user_id?: number;
  assignee_name?: string;
  owner?: string;
  milestone_id?: number;
  milestone_title?: string;
  blocker_note?: string;
  project_role?: ProjectRole;
  created_at?: string;
  created_by_name?: string;
  comments: TaskComment[];
  activity?: TaskActivityEvent[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  body: string;
  author: string;
  created_at: string;
}

export interface TaskActivityEvent {
  id: number;
  actor_name?: string;
  actor?: string;
  event_type: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  owner?: string;
  owner_name?: string;
  owner_user_id?: number;
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
  id: number;
  project_id: number;
  title: string;
  target_date?: string;
  status: MilestoneStatus;
}

export interface Phase {
  id: number;
  project_id: number;
  name: string;
  start_date?: string;
  end_date?: string;
}

export interface ProjectLink {
  id: number;
  project_id: number;
  url: string;
  label?: string;
  title?: string;
  link_type?: string;
}

export interface Risk {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  probability?: RiskProbability;
  status?: RiskStatus;
  mitigation_note?: string;
  mitigation_progress?: number;
  owner_user_id?: number;
  due_date?: string;
}

export interface Issue {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  status?: IssueStatus;
}

export interface BudgetLine {
  id: number;
  project_id: number;
  category: string;
  planned_amount: number;
  currency: string;
  effective_date: string;
  note?: string;
}

export interface SpendRecord {
  id: number;
  project_id: number;
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
  id: number;
  name: string;
  email: string;
  role?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  created_at?: string;
}

export interface DashboardAttentionItem {
  id?: number;
  project_id?: number;
  title?: string;
  name?: string;
  description?: string;
  detail?: string;
  reason?: string;
  severity?: string;
}

export interface DashboardOverview {
  total_projects?: number;
  active_projects?: number;
  blocked_projects?: number;
  overdue_projects?: number;
}

export interface VaultEntry {
  id: number;
  title: string;
  entry_type: VaultEntryType;
  category?: string;
  tags?: VaultTag[];
  markdown_content?: string;
  external_url?: string;
  secret_value?: string;
}

export interface VaultTag {
  name: string;
  display_name?: string;
}

export interface VaultFile {
  id: number;
  file_id?: number;
  entry_id: number;
  filename: string;
  content_type?: string;
  size_bytes?: number;
  upload_url?: string;
}

export interface WorkloadItem {
  user_id?: number;
  id?: number;
  user_name?: string;
  name?: string;
  email?: string;
  allocated_hours?: number;
  capacity_hours?: number;
}

export interface Asset {
  id: number;
  name: string;
  type?: string;
  asset_type?: string;
  status?: string;
}

export interface MemberAllocation {
  id: number;
  user_id?: number;
  user_name?: string;
  project_id?: number;
  project_name?: string;
  allocation_percentage?: number;
  percentage?: number;
}

export interface AssetAllocation {
  id: number;
  asset_id?: number;
  asset_name?: string;
  project_id?: number;
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
  csrfToken: string;
}

export interface CreateInvitationPayload {
  name: string;
  email: string;
  role: UserRole;
  project_assignments?: { project_id: number; project_role: ProjectRole }[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  owner_user_id?: number | null;
  status?: ProjectStatus;
  priority?: Priority;
  start_date?: string;
  deadline?: string;
  website_url?: string;
  drive_folder_url?: string;
  budget_allocated_amount?: number | null;
  budget_currency?: string | null;
}

export interface CreateTaskPayload {
  project_id: number;
  title: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
  assignee_user_id?: number | null;
  milestone_id?: number | null;
  status?: TaskStatus;
}

export interface CreateMilestonePayload {
  project_id: number;
  title: string;
  target_date?: string;
  status?: MilestoneStatus;
}

export interface CreateLinkPayload {
  project_id: number;
  url: string;
  label?: string;
  link_type?: string;
}

export interface CreateVaultEntryPayload {
  title: string;
  entry_type: VaultEntryType;
  category?: string;
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
  project_id: number;
  amount: number;
  category?: string;
  description?: string;
  spend_date?: string;
}

export interface CapacityProfile {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  capacity_hours: number;
  notes?: string;
}

export interface Availability {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  status: 'available' | 'unavailable' | 'limited';
  notes?: string;
}

export interface ProjectAllocation {
  user_id?: number;
  user_name?: string;
  project_id?: number;
  project_name?: string;
  allocation_percentage?: number;
  percentage?: number;
}
