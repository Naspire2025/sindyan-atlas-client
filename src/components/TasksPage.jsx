import { useMemo, useState } from 'react';
import { TASK_STATUSES } from '../constants.js';
import { formatDate, isPastDate } from '../utils/project.js';
import EmptyState from './EmptyState.jsx';
import Icon from './Icon.jsx';
import PageHeader from './PageHeader.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function TasksPage({ currentUser, tasks, onMenu, onSelectTask, onUpdateTask }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const visibleTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.project_name || ''} ${task.owner || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || task.status === status)), [search, status, tasks]);

  const handleStatusChange = async (task, nextStatus) => {
    setUpdatingId(task.id);
    try { await onUpdateTask(task.id, { ...task, status: nextStatus }); } finally { setUpdatingId(null); }
  };

  return (
    <>
      <PageHeader eyebrow="Personal queue" title="My tasks" description="Assigned work across projects, ordered by due date." onMenu={onMenu} />
      <section className="panel tasks-panel">
        <div className="project-toolbar">
          <div><span className="eyebrow">Work queue</span><h2>{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'}</h2></div>
          <div className="toolbar-fields"><label className="search-field"><Icon name="search" /><span className="sr-only">Search tasks</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /></label><label className="select-field"><span className="sr-only">Filter tasks by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{TASK_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        </div>
        {visibleTasks.length > 0 ? (
          <div className="task-list">{visibleTasks.map((task) => {
            const isOverdue = task.status !== 'done' && isPastDate(task.due_date);
            const statuses = allowedStatuses(currentUser, task);
            return <article className="task-list-item" key={task.id}><button className="task-open" type="button" onClick={() => onSelectTask(task.id)}><span className={`task-check status-${task.status}`} /><span className="task-copy"><strong>{task.title}</strong><small>{task.project_name || 'Project'}{task.assignee_name ? ` · ${task.assignee_name}` : ''}</small></span></button><span className={`task-date ${isOverdue ? 'is-overdue' : ''}`}><Icon name="calendar" size={14} />{formatDate(task.due_date)}</span><StatusBadge status={task.status} type="task" />{statuses.length > 1 ? <label className="status-select"><span className="sr-only">Update {task.title} status</span><select disabled={updatingId === task.id} value={task.status} onChange={(event) => handleStatusChange(task, event.target.value)}>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : <span />}</article>;
          })}</div>
        ) : <EmptyState icon="check" title="No tasks found" message="There are no tasks matching the current filters." />}
      </section>
    </>
  );
}

function allowedStatuses(user, task) {
  if (user?.role === 'admin') return TASK_STATUSES;
  if (task.assignee_user_id !== user?.id) return TASK_STATUSES.filter((item) => item.value === task.status);
  const transitions = { todo: ['todo', 'in_progress'], in_progress: ['in_progress', 'blocked', 'reviewing'], blocked: ['blocked', 'in_progress', 'reviewing'] };
  return TASK_STATUSES.filter((item) => (transitions[task.status] || [task.status]).includes(item.value));
}
