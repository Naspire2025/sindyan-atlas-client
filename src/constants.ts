export interface Option {
  value: string;
  label: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  adminOnly: boolean;
}

export const PROJECT_STATUSES: Option[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const TASK_STATUSES: Option[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'reviewing', label: 'In review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'done', label: 'Done' },
];

export const PRIORITIES: Option[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const RISK_SEVERITIES: Option[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const RISK_PROBABILITIES: Option[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const RISK_STATUSES: Option[] = [
  { value: 'open', label: 'Open' },
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
];

export const ISSUE_STATUSES: Option[] = [
  { value: 'open', label: 'Open' },
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
];

export const VAULT_ENTRY_TYPES: Option[] = [
  { value: 'credential', label: 'Credential' },
  { value: 'secret_key', label: 'Secret key' },
  { value: 'markdown_note', label: 'Markdown note' },
  { value: 'file', label: 'File' },
  { value: 'external_link', label: 'External link' },
];

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'overview', adminOnly: false },
  { id: 'projects', label: 'Projects', icon: 'projects', adminOnly: false },
  { id: 'tasks', label: 'My tasks', icon: 'check', adminOnly: false },
  { id: 'risksIssues', label: 'Risks & issues', icon: 'alert', adminOnly: true },
  { id: 'team', label: 'Team', icon: 'users', adminOnly: true },
  { id: 'invitations', label: 'Invitations', icon: 'send', adminOnly: true },
  { id: 'resources', label: 'Resources', icon: 'filter', adminOnly: true },
  { id: 'vault', label: 'Secure vault', icon: 'lock', adminOnly: false },
];

export function getLabel(items: Option[], value: string): string {
  return items.find((item) => item.value === value)?.label ?? value;
}
