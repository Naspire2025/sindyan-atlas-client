import { useMemo, useState } from 'react';
import { TASK_STATUSES } from '../constants.js';
import type { User, Task } from '../types/api.js';
import { formatDate, isPastDate } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';
import StatusBadge from './StatusBadge.js';

import TaskKanbanBoard, { TaskStatusSelect, allowedStatuses } from './TaskKanbanBoard.js';

interface TasksPageProps {
  currentUser: User;
  tasks: Task[];
  onMenu: () => void;
  onSelectTask: (taskId: number) => void;
  onUpdateTask: (taskId: number, task: Record<string, unknown>) => Promise<unknown>;
}

type TaskView = 'list' | 'kanban';

export default function TasksPage({ currentUser, tasks, onMenu, onSelectTask, onUpdateTask }: TasksPageProps) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<TaskView>('list');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const visibleTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.project_name || ''} ${task.owner || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || task.status === status)), [search, status, tasks]);

  const handleStatusChange = async (task: Task, nextStatus: string) => {
    setUpdatingId(task.id);
    try { await onUpdateTask(task.id, { ...task, status: nextStatus as Task['status'] }); } finally { setUpdatingId(null); }
  };

  return (
    <>
      <PageHeader eyebrow="Personal queue" title="My tasks" description="Assigned work across projects, ordered by due date." onMenu={onMenu} />
      <section className="panel tasks-panel">
        <div className="project-toolbar">
          <div><span className="eyebrow">Work queue</span><h2>{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'}</h2></div>
          <div className="toolbar-fields"><label className="search-field"><Icon name="search" /><span className="sr-only">Search tasks</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /></label><label className="select-field"><span className="sr-only">Filter tasks by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{TASK_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        </div>
        <div className="task-view-toolbar">
          <div className="segmented-control" aria-label="Task view">
            <button className={view === 'list' ? 'is-active' : ''} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
            <button className={view === 'kanban' ? 'is-active' : ''} type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>Kanban</button>
          </div>
        </div>
        {visibleTasks.length > 0 ? (
          view === 'list'
            ? <TaskList currentUser={currentUser} tasks={visibleTasks} updatingId={updatingId} onSelectTask={onSelectTask} onStatusChange={handleStatusChange} />
            : <TaskKanbanBoard currentUser={currentUser} tasks={visibleTasks} updatingId={updatingId} onSelectTask={onSelectTask} onStatusChange={handleStatusChange} />
        ) : <EmptyState icon="check" title="No tasks found" message="There are no tasks matching the current filters." />}
      </section>
    </>
  );
}

interface TaskCollectionProps {
  currentUser: User;
  tasks: Task[];
  updatingId: number | null;
  onSelectTask: (taskId: number) => void;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
}

function TaskList({ currentUser, tasks, updatingId, onSelectTask, onStatusChange }: TaskCollectionProps) {
  return <div className="task-list">{tasks.map((task) => <TaskListItem currentUser={currentUser} key={task.id} task={task} updatingId={updatingId} onSelectTask={onSelectTask} onStatusChange={onStatusChange} />)}</div>;
}

function TaskListItem({ currentUser, task, updatingId, onSelectTask, onStatusChange }: { currentUser: User; task: Task; updatingId: number | null; onSelectTask: (taskId: number) => void; onStatusChange: (task: Task, nextStatus: string) => Promise<void> }) {
  const isOverdue = task.status !== 'done' && isPastDate(task.due_date);
  const statuses = allowedStatuses(currentUser, task);
  return <article className="task-list-item"><button className="task-open" type="button" onClick={() => onSelectTask(task.id)}><span className={`task-check status-${task.status}`} /><span className="task-copy"><strong>{task.title}</strong><small>{task.project_name || 'Project'}{task.assignee_name ? ` · ${task.assignee_name}` : ''}</small></span></button><span className={`task-date ${isOverdue ? 'is-overdue' : ''}`}><Icon name="calendar" size={14} />{formatDate(task.due_date)}</span><StatusBadge status={task.status} type="task" /><TaskStatusSelect task={task} statuses={statuses} isUpdating={updatingId === task.id} onStatusChange={onStatusChange} /></article>;
}
