import { PROJECT_STATUSES, TASK_STATUSES, getLabel } from '../constants.js';

export default function StatusBadge({ status, type = 'project' }) {
  const options = type === 'task' ? TASK_STATUSES : PROJECT_STATUSES;
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {getLabel(options, status)}
    </span>
  );
}
