import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { TASK_STATUSES } from '../constants.js';
import type { User, Task } from '../types/api.js';
import type { MessageId } from '../i18n/messages/en.js';
import { formatDate, isPastDate } from '../utils/project.js';
import { getAllowedTaskStatuses, getTaskCompletion } from '../utils/task.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import StatusBadge from './StatusBadge.js';
import TaskKanbanBoard from './TaskKanbanBoard.js';
import TaskStatusSelect from './TaskStatusSelect.js';
import { Calendar, CircleCheck, Search } from 'lucide-react';

interface TasksPageProps {
  currentUser: User;
  tasks: Task[];
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, task: Record<string, unknown>) => Promise<unknown>;
}

type TaskView = 'list' | 'kanban';
type TaskGrouping = 'due_date' | 'status' | 'project';

export default function TasksPage({ currentUser, tasks, onMenu, onSelectProject, onSelectTask, onUpdateTask }: TasksPageProps) {
  const intl = useIntl();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<TaskView>('list');
  const [grouping, setGrouping] = useState<TaskGrouping>('due_date');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState('');
  const visibleTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.project_name || ''} ${task.assignee_name || task.owner || ''} ${task.milestone_title || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || task.status === status)), [search, status, tasks]);
  const taskGroups = useMemo(() => groupTasks(visibleTasks, grouping, intl), [grouping, intl, visibleTasks]);
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
      <PageHeader eyebrow={intl.formatMessage({ id: 'task.eyebrow' })} title={intl.formatMessage({ id: 'task.title' })} description={intl.formatMessage({ id: 'task.pageDescription' })} onMenu={onMenu} />
      <section className="panel tasks-panel">
        {updateError && <div className="error-banner" role="alert">{updateError}</div>}
        <div className="project-toolbar">
          <div><span className="eyebrow">{intl.formatMessage({ id: 'task.queueTitle' })}</span><h2><FormattedMessage id="task.count" values={{ n: visibleTasks.length }} /></h2></div>
          <div className="toolbar-fields"><label className="search-field"><Search /><span className="sr-only">{intl.formatMessage({ id: 'task.searchTasks' })}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={intl.formatMessage({ id: 'task.searchPlaceholder' })} /></label><label className="select-field"><span className="sr-only">{intl.formatMessage({ id: 'task.filterByStatus' })}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{intl.formatMessage({ id: 'common.allStatuses' })}</option>{TASK_STATUSES.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label as MessageId })}</option>)}</select></label></div>
        </div>
        <div className="task-view-toolbar">
          <div className="segmented-control" aria-label={intl.formatMessage({ id: 'task.viewLabel' })}>
            <button className={view === 'list' ? 'is-active' : ''} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>{intl.formatMessage({ id: 'task.viewList' })}</button>
            <button className={view === 'kanban' ? 'is-active' : ''} type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>{intl.formatMessage({ id: 'task.viewBoard' })}</button>
          </div>
          {view === 'list' && <label className="select-field task-group-select"><span>{intl.formatMessage({ id: 'task.groupBy' })}</span><select value={grouping} onChange={(event) => setGrouping(event.target.value as TaskGrouping)}><option value="due_date">{intl.formatMessage({ id: 'task.dueDate' })}</option><option value="status">{intl.formatMessage({ id: 'task.status' })}</option><option value="project">{intl.formatMessage({ id: 'task.project' })}</option></select></label>}
        </div>
        <div className="task-queue-summary" aria-label={intl.formatMessage({ id: 'task.completionSummary' })}>
          <span><strong>{completion}%</strong> {intl.formatMessage({ id: 'task.complete' })}</span>
          <span className="task-summary-progress" aria-label={intl.formatMessage({ id: 'task.completionAria' }, { n: completion })}><span style={{ width: `${completion}%` }} /></span>
          <span><strong>{overdueCount}</strong> {intl.formatMessage({ id: 'task.overdue' })}</span>
        </div>
        {visibleTasks.length > 0 ? (
          view === 'list'
            ? <TaskList currentUser={currentUser} groups={taskGroups} updatingId={updatingId} onSelectProject={onSelectProject} onSelectTask={onSelectTask} onStatusChange={handleStatusChange} />
            : <TaskKanbanBoard currentUser={currentUser} tasks={visibleTasks} updatingId={updatingId} onSelectTask={onSelectTask} onStatusChange={handleStatusChange} />
          ) : <EmptyState icon={CircleCheck} title={intl.formatMessage({ id: 'task.noTasksFound' })} message={intl.formatMessage({ id: 'task.noTasksFoundMessage' })} />}
      </section>
    </>
  );
}

interface TaskCollectionProps {
  currentUser: User;
  groups: Array<{ label: string; tasks: Task[] }>;
  updatingId: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
  onStatusChange: (task: Task, nextStatus: string) => Promise<void>;
}

function TaskList({ currentUser, groups, updatingId, onSelectProject, onSelectTask, onStatusChange }: TaskCollectionProps) {
  return <div className="task-groups">{groups.map((group) => <section className="task-group" key={group.label} aria-labelledby={`task-group-${toDomId(group.label)}`}><header><h3 id={`task-group-${toDomId(group.label)}`}>{group.label}</h3><span>{group.tasks.length}</span></header><div className="task-list">{group.tasks.map((task) => <TaskListItem currentUser={currentUser} key={task.id} task={task} updatingId={updatingId} onSelectProject={onSelectProject} onSelectTask={onSelectTask} onStatusChange={onStatusChange} />)}</div></section>)}</div>;
}

function TaskListItem({ currentUser, task, updatingId, onSelectProject, onSelectTask, onStatusChange }: { currentUser: User; task: Task; updatingId: string | null; onSelectProject: (projectId: string) => void; onSelectTask: (taskId: string) => void; onStatusChange: (task: Task, nextStatus: string) => Promise<void> }) {
  const intl = useIntl();
  const isOverdue = task.status !== 'done' && isPastDate(task.due_date);
  const statuses = getAllowedTaskStatuses(currentUser, task);
  return <article className="task-list-item"><div className="task-primary"><button className="task-open" type="button" onClick={() => onSelectTask(task.id)}><span className={`task-check status-${task.status}`} /><span className="task-copy"><strong>{task.title}</strong><small>{task.assignee_name || intl.formatMessage({ id: 'common.unassigned' })}{task.milestone_title ? ` · ${task.milestone_title}` : ''}</small></span></button><button className="task-project-button" type="button" onClick={() => onSelectProject(task.project_id)}>{task.project_name || intl.formatMessage({ id: 'task.projectFallback' })}</button></div><span className={`task-date ${isOverdue ? 'is-overdue' : ''}`}><Calendar size={14} />{formatDate(task.due_date)}</span><StatusBadge status={task.status} type="task" /><TaskStatusSelect task={task} statuses={statuses} isUpdating={updatingId === task.id} onStatusChange={onStatusChange} /></article>;
}

function groupTasks(tasks: Task[], grouping: TaskGrouping, intl: ReturnType<typeof useIntl>): Array<{ label: string; tasks: Task[] }> {
  const groups = new Map<string, Task[]>();
  const sortedTasks = [...tasks].sort((first, second) => String(first.due_date || '9999').localeCompare(String(second.due_date || '9999')) || first.id.localeCompare(second.id));
  sortedTasks.forEach((task) => {
    const label = grouping === 'status' ? intl.formatMessage({ id: (TASK_STATUSES.find((item) => item.value === task.status)?.label || task.status) as MessageId }) : grouping === 'project' ? task.project_name || intl.formatMessage({ id: 'task.noProject' }) : getDueDateGroup(task, intl);
    groups.set(label, [...(groups.get(label) || []), task]);
  });
  return [...groups].map(([label, groupedTasks]) => ({ label, tasks: groupedTasks }));
}

function getDueDateGroup(task: Task, intl: ReturnType<typeof useIntl>): string {
  if (!task.due_date) return intl.formatMessage({ id: 'common.noDueDate' });
  if (task.status !== 'done' && isPastDate(task.due_date)) return intl.formatMessage({ id: 'task.groupOverdue' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${task.due_date}T00:00:00`);
  const daysAway = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (daysAway === 0) return intl.formatMessage({ id: 'task.dueToday' });
  if (daysAway <= 7) return intl.formatMessage({ id: 'task.next7Days' });
  return intl.formatMessage({ id: 'task.later' });
}

function toDomId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
