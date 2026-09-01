import type { Task } from '../types/api.js';
import type { TaskStatusOption } from '../utils/task.js';

interface TaskStatusSelectProps {
  task: Task;
  statuses: TaskStatusOption[];
  isUpdating: boolean;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
}

export default function TaskStatusSelect({ task, statuses, isUpdating, onStatusChange }: TaskStatusSelectProps) {
  if (statuses.length <= 1) return <span />;
  return (
    <label className="status-select">
      <span className="sr-only">Update {task.title} status</span>
      <select disabled={isUpdating} value={task.status} onChange={(event) => onStatusChange(task, event.target.value)}>
        {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}
