import { PROJECT_STATUSES, TASK_STATUSES, getLabel } from '../constants.js';

interface StatusBadgeProps {
  status: string;
  type?: 'project' | 'task';
}

export default function StatusBadge({ status, type = 'project' }: StatusBadgeProps) {
  const options = type === 'task' ? TASK_STATUSES : PROJECT_STATUSES;
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {getLabel(options, status)}
    </span>
  );
}
