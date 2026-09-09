import { useIntl } from 'react-intl';
import type { Task } from '../types/api.js';
import type { TaskStatusOption } from '../utils/task.js';
import type { MessageId } from '../i18n/messages/en.js';

interface TaskStatusSelectProps {
  task: Task;
  statuses: TaskStatusOption[];
  isUpdating: boolean;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
}

export default function TaskStatusSelect({ task, statuses, isUpdating, onStatusChange }: TaskStatusSelectProps) {
  const intl = useIntl();
  if (statuses.length <= 1) return <span />;
  return (
    <label className="status-select">
      <span className="sr-only">{intl.formatMessage({ id: 'task.updateStatus' }, { title: task.title })}</span>
      <select disabled={isUpdating} value={task.status} onChange={(event) => onStatusChange(task, event.target.value)}>
        {statuses.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label as MessageId })}</option>)}
      </select>
    </label>
  );
}
