import type { LucideIcon } from 'lucide-react';
import { CircleCheck, Filter, Layers, LayoutGrid, Lock, Send, TriangleAlert, Users } from 'lucide-react';
import type { MessageId } from './i18n/messages/en.js';

export interface Option {
  value: string;
  label: MessageId;
}

export interface NavItem {
  id: string;
  label: MessageId;
  icon: LucideIcon;
  adminOnly: boolean;
}

export const PROJECT_STATUSES: Option[] = [
  { value: 'planning', label: 'status.project.planning' },
  { value: 'active', label: 'status.project.active' },
  { value: 'on_hold', label: 'status.project.onHold' },
  { value: 'blocked', label: 'status.project.blocked' },
  { value: 'completed', label: 'status.project.completed' },
  { value: 'cancelled', label: 'status.project.cancelled' },
];

export const TASK_STATUSES: Option[] = [
  { value: 'todo', label: 'status.task.todo' },
  { value: 'in_progress', label: 'status.task.inProgress' },
  { value: 'blocked', label: 'status.task.blocked' },
  { value: 'reviewing', label: 'status.task.reviewing' },
  { value: 'reviewed', label: 'status.task.reviewed' },
  { value: 'done', label: 'status.task.done' },
];

export const PRIORITIES: Option[] = [
  { value: 'critical', label: 'priority.critical' },
  { value: 'high', label: 'priority.high' },
  { value: 'medium', label: 'priority.medium' },
  { value: 'low', label: 'priority.low' },
];

export const RISK_SEVERITIES: Option[] = [
  { value: 'critical', label: 'priority.critical' },
  { value: 'high', label: 'priority.high' },
  { value: 'medium', label: 'priority.medium' },
  { value: 'low', label: 'priority.low' },
];

export const RISK_PROBABILITIES: Option[] = [
  { value: 'high', label: 'priority.high' },
  { value: 'medium', label: 'priority.medium' },
  { value: 'low', label: 'priority.low' },
];

export const RISK_STATUSES: Option[] = [
  { value: 'open', label: 'status.risk.open' },
  { value: 'mitigating', label: 'status.risk.mitigating' },
  { value: 'escalated', label: 'status.risk.escalated' },
  { value: 'resolved', label: 'status.risk.resolved' },
];

export const ISSUE_STATUSES: Option[] = [
  { value: 'open', label: 'status.issue.open' },
  { value: 'mitigating', label: 'status.issue.mitigating' },
  { value: 'escalated', label: 'status.issue.escalated' },
  { value: 'resolved', label: 'status.issue.resolved' },
];

export const VAULT_ENTRY_TYPES: Option[] = [
  { value: 'credential', label: 'vaultType.credential' },
  { value: 'secret_key', label: 'vaultType.secretKey' },
  { value: 'markdown_note', label: 'vaultType.markdownNote' },
  { value: 'file', label: 'vaultType.file' },
  { value: 'external_link', label: 'vaultType.externalLink' },
];

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'nav.overview', icon: LayoutGrid, adminOnly: false },
  { id: 'projects', label: 'nav.projects', icon: Layers, adminOnly: false },
  { id: 'tasks', label: 'nav.tasks', icon: CircleCheck, adminOnly: false },
  { id: 'risksIssues', label: 'nav.risksIssues', icon: TriangleAlert, adminOnly: true },
  { id: 'team', label: 'nav.team', icon: Users, adminOnly: true },
  { id: 'invitations', label: 'nav.invitations', icon: Send, adminOnly: true },
  { id: 'resources', label: 'nav.resources', icon: Filter, adminOnly: true },
  { id: 'vault', label: 'nav.vault', icon: Lock, adminOnly: false },
];

export function getLabel(items: Option[], value: string): MessageId {
  return items.find((item) => item.value === value)?.label ?? (value as MessageId);
}
