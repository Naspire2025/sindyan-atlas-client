import { useMemo, useState } from 'react';
import { TASK_STATUSES } from '../constants.js';
import type { User, Task } from '../types/api.js';
import { formatDate, isPastDate } from '../utils/project.js';
import { getAllowedTaskStatuses, getTaskCompletion } from '../utils/task.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';
import StatusBadge from './StatusBadge.js';
import TaskKanbanBoard from './TaskKanbanBoard.js';
import TaskStatusSelect from './TaskStatusSelect.js';

interface TasksPageProps {
  currentUser: User;
  tasks: Task[];
  onMenu: () => void;
  onSelectProject: (projectId: number) => void;
  onSelectTask: (taskId: number) => void;
  onUpdateTask: (taskId: number, task: Record<string, unknown>) => Promise<unknown>;
}

type TaskView = 'list' | 'kanban';
type TaskGrouping = 'due_date' | 'status' | 'project';

export default function TasksPage({ currentUser, tasks, onMenu, onSelectProject, onSelectTask, onUpdateTask }: TasksPageProps) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<TaskView>('list');
  const [grouping, setGrouping] = useState<TaskGrouping>('due_date');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState('');
  const visibleTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.project_name || ''} ${task.assignee_name || task.owner || ''} ${task.milestone_title || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || task.status === status)), [search, status, tasks]);
  const taskGroups = useMemo(() => groupTasks(visibleTasks, grouping), [grouping, visibleTasks]);
  const completion = getTaskCompletion(visibleTasks);
  const overdueCount = visibleTasks.filter((task) => task.status !== 'done' && isPastDate(task.due_date)).length;

  const handleStatusChange = async (task: Task, nextStatus: string) => {
    setUpdatingId(task.id);
    setUpdateError('');
    try {
      await onUpdateTask(task.id, { status: nextStatus as Task['status'] });
    } catch (error) {
      setUpdateError((error as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Personal queue" title="My tasks" description="Assigned work across projects, ordered by due date." onMenu={onMenu} />
      <section className="panel tasks-panel">
        {updateError && <div className="error-banner" role="alert">{updateError}</div>}
        <div className="project-toolbar">
          <div><span className="eyebrow">Work queue</span><h2>{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'}</h2></div>
          <div className="toolbar-fields"><label className="search-field"><Icon name="search" /><span className="sr-only">Search tasks</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, owners, or milestones" /></label><label className="select-field"><span className="sr-only">Filter tasks by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{TASK_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        </div>
        <div className="task-view-toolbar">
          <div className="segmented-control" aria-label="Task view">
            <button className={view === 'list' ? 'is-active' : ''} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
            <button className={view === 'kanban' ? 'is-active' : ''} type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>Kanban</button>
          </div>
          {view === 'list' && <label className="select-field task-group-select"><span>Group by</span><select value={grouping} onChange={(event) => setGrouping(event.target.value as TaskGrouping)}><option value="due_date">Due date</option><option value="status">Status</option><option value="project">Project</option></select></label>}
        </div>
        <div className="task-queue-summary" aria-label="Task completion summary">
          <span><strong>{completion}%</strong> complete</span>
          <span className="task-summary-progress" aria-label={`${completion}% of visible tasks complete`}><span style={{ width: `${completion}%` }} /></span>
          <span><strong>{overdueCount}</strong> overdue</span>
        </div>
        {visibleTasks.length > 0 ? (
          view === 'list'
            ? <TaskList currentUser={currentUser} groups={taskGroups} updatingId={updatingId} onSelectProject={onSelectProject} onSelectTask={onSelectTask} onStatusChange={handleStatusChange} />
            : <TaskKanbanBoard currentUser={currentUser} tasks={visibleTasks} updatingId={updatingId} onSelectTask={onSelectTask} onStatusChange={handleStatusChange} />
        ) : <EmptyState icon="check" title="No tasks found" message="There are no tasks matching the current filters." />}
      </section>
    </>
  );
}

interface TaskCollectionProps {
  currentUser: User;
  groups: Array<{ label: string; tasks: Task[] }>;
  updatingId: number | null;
  onSelectProject: (projectId: number) => void;
  onSelectTask: (taskId: number) => void;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
}

function TaskList({ currentUser, groups, updatingId, onSelectProject, onSelectTask, onStatusChange }: TaskCollectionProps) {
  return <div className="task-groups">{groups.map((group) => <section className="task-group" key={group.label} aria-labelledby={`task-group-${toDomId(group.label)}`}><header><h3 id={`task-group-${toDomId(group.label)}`}>{group.label}</h3><span>{group.tasks.length}</span></header><div className="task-list">{group.tasks.map((task) => <TaskListItem currentUser={currentUser} key={task.id} task={task} updatingId={updatingId} onSelectProject={onSelectProject} onSelectTask={onSelectTask} onStatusChange={onStatusChange} />)}</div></section>)}</div>;
}

function TaskListItem({ currentUser, task, updatingId, onSelectProject, onSelectTask, onStatusChange }: { currentUser: User; task: Task; updatingId: number | null; onSelectProject: (projectId: number) => void; onSelectTask: (taskId: number) => void; onStatusChange: (task: Task, nextStatus: string) => Promise<void> }) {
  const isOverdue = task.status !== 'done' && isPastDate(task.due_date);
  const statuses = getAllowedTaskStatuses(currentUser, task);
  return <article className="task-list-item"><div className="task-primary"><button className="task-open" type="button" onClick={() => onSelectTask(task.id)}><span className={`task-check status-${task.status}`} /><span className="task-copy"><strong>{task.title}</strong><small>{task.assignee_name || 'Unassigned'}{task.milestone_title ? ` · ${task.milestone_title}` : ''}</small></span></button><button className="task-project-button" type="button" onClick={() => onSelectProject(task.project_id)}>{task.project_name || 'Project'}</button></div><span className={`task-date ${isOverdue ? 'is-overdue' : ''}`}><Icon name="calendar" size={14} />{formatDate(task.due_date)}</span><StatusBadge status={task.status} type="task" /><TaskStatusSelect task={task} statuses={statuses} isUpdating={updatingId === task.id} onStatusChange={onStatusChange} /></article>;
}

function groupTasks(tasks: Task[], grouping: TaskGrouping): Array<{ label: string; tasks: Task[] }> {
  const groups = new Map<string, Task[]>();
  const sortedTasks = [...tasks].sort((first, second) => String(first.due_date || '9999').localeCompare(String(second.due_date || '9999')) || first.id - second.id);
  sortedTasks.forEach((task) => {
    const label = grouping === 'status' ? TASK_STATUSES.find((item) => item.value === task.status)?.label || task.status : grouping === 'project' ? task.project_name || 'No project' : getDueDateGroup(task);
    groups.set(label, [...(groups.get(label) || []), task]);
  });
  return [...groups].map(([label, groupedTasks]) => ({ label, tasks: groupedTasks }));
}

function getDueDateGroup(task: Task): string {
  if (!task.due_date) return 'No due date';
  if (task.status !== 'done' && isPastDate(task.due_date)) return 'Overdue';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${task.due_date}T00:00:00`);
  const daysAway = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (daysAway === 0) return 'Due today';
  if (daysAway <= 7) return 'Next 7 days';
  return 'Later';
}

function toDomId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
