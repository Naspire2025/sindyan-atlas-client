import { TASK_STATUSES } from '../constants.js';
import type { Task, User } from '../types/api.js';

export interface TaskStatusOption {
  value: string;
  label: string;
}

export function getAllowedTaskStatuses(user: User, task: Task): TaskStatusOption[] {
  if (user?.role !== 'admin' && task.assignee_user_id !== user?.id && task.project_role !== 'project_lead') {
    return TASK_STATUSES.filter((item) => item.value === task.status);
  }

  const adminTransitions: Record<string, string[]> = {
    todo: ['todo', 'in_progress', 'blocked'],
    in_progress: ['todo', 'in_progress', 'blocked', 'reviewing'],
    blocked: ['todo', 'in_progress', 'blocked', 'reviewing'],
    reviewing: ['in_progress', 'reviewing', 'reviewed'],
    reviewed: ['reviewing', 'reviewed', 'done'],
    done: ['reviewed', 'done'],
  };
  const contributorTransitions: Record<string, string[]> = {
    todo: ['todo', 'in_progress'],
    in_progress: ['in_progress', 'blocked', 'reviewing'],
    blocked: ['blocked', 'in_progress', 'reviewing'],
    reviewing: ['reviewing', 'in_progress'],
  };
  const transitions = user?.role === 'admin' ? adminTransitions : contributorTransitions;
  const values = transitions[task.status] || [task.status];
  return TASK_STATUSES.filter((item) => values.includes(item.value));
}

export function getTaskCompletion(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100);
}
