import { useIntl } from 'react-intl';
import { PROJECT_STATUSES, TASK_STATUSES, getLabel } from '../constants.js';

interface StatusBadgeProps {
  status: string;
  type?: 'project' | 'task';
}

export default function StatusBadge({ status, type = 'project' }: StatusBadgeProps) {
  const intl = useIntl();
  const options = type === 'task' ? TASK_STATUSES : PROJECT_STATUSES;
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {intl.formatMessage({ id: getLabel(options, status) })}
    </span>
  );
}