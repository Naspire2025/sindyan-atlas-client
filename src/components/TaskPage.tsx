import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PRIORITIES, TASK_STATUSES, getLabel } from '../constants.js';
import type { User, Task, TaskComment, TaskActivityEvent } from '../types/api.js';
import { formatDate, getInitials } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';

interface TaskPageProps {
  currentUser: User;
  onBack: () => void;
  onChanged: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: number) => void;
  taskId: number;
}

function initialTask(): Task | null {
  return null;
}

export default function TaskPage({ currentUser, onBack, onChanged, onMenu, onSelectProject, taskId }: TaskPageProps) {
  const [task, setTask] = useState<Task | null>(() => normalizeTask(initialTask()));
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      setTask(normalizeTask(await api.getTask(taskId)));
      setError('');
    } catch (loadError) {
      setTask(null);
      setError((loadError as Error).message);
    }
  }, [taskId]);

  useEffect(() => {
    // Loading the URL-selected task is the synchronization purpose of this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    loadTask();
  }, [loadTask]);

  const updateProperty = async (field: string, value: string) => {
    setIsSavingProperty(true);
    try {
      const updatedTask = await api.updateTask(task!.id, getTaskUpdatePayload(task!, { [field]: value }));
      setTask((current) => ({ ...current!, ...updatedTask }));
      await onChanged();
    } catch (updateError) {
      setError((updateError as Error).message);
    } finally {
      setIsSavingProperty(false);
    }
  };

  const postComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = comment.trim();
    if (!body || isPostingComment) return;

    setIsPostingComment(true);
    try {
      const createdComment = await api.createTaskComment(task!.id, { body });
      setTask((current) => ({ ...current!, comments: [...current!.comments, createdComment] }));
      setComment('');
      setError('');
    } catch (commentError) {
      setError((commentError as Error).message);
    } finally {
      setIsPostingComment(false);
    }
  };

  if (error && !task) return <TaskError error={error} onBack={onBack} onMenu={onMenu} />;
  if (!task) return <div className="loading-state task-loading"><span className="spinner" />Loading task…</div>;

  return (
    <div className="task-page project-page">
      <TaskBreadcrumb task={task} onBack={onBack} onMenu={onMenu} onSelectProject={onSelectProject} />
      {error && <div className="task-error-banner error-banner" role="alert">{error}</div>}
      <div className="task-detail-layout">
        <div className="task-detail-main">
          <header className="task-heading">
            <span className={`task-check task-heading-status status-${task.status}`} />
            <div>
              <span className="eyebrow">TASK-{task.id}</span>
              <h1>{task.title}</h1>
            </div>
          </header>

          <section className="task-description" aria-labelledby="task-description-title">
            <h2 id="task-description-title">Description</h2>
            <p>{task.description || task.blocker_note || 'No description has been added yet.'}</p>
          </section>

          <section className="task-activity" aria-labelledby="task-activity-title">
            <div className="task-section-heading">
              <h2 id="task-activity-title">Activity</h2>
              <span>{task.comments.length} comment{task.comments.length === 1 ? '' : 's'}</span>
            </div>
            <ActivityEvent task={task} />
            {task.comments.map((item) => <CommentItem comment={item} key={item.id} />)}
            <CommentForm
              comment={comment}
              isPosting={isPostingComment}
              onChange={setComment}
              onSubmit={postComment}
            />
          </section>
        </div>

        <TaskProperties
          currentUser={currentUser}
          isSaving={isSavingProperty}
          onSelectProject={onSelectProject}
          onUpdate={updateProperty}
          task={task}
        />
      </div>
    </div>
  );
}

interface TaskBreadcrumbProps {
  task: Task;
  onBack: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: number) => void;
}

function TaskBreadcrumb({ onBack, onMenu, onSelectProject, task }: TaskBreadcrumbProps) {
  return (
    <header className="project-breadcrumb-bar task-breadcrumb-bar">
      <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Icon name="menu" size={18} /></button>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <button type="button" onClick={onBack}>My tasks</button>
        <Icon name="chevron" size={13} />
        <button type="button" onClick={() => onSelectProject(task.project_id)}>{task.project_name}</button>
        <Icon name="chevron" size={13} />
        <span>TASK-{task.id}</span>
      </nav>
      <span className={`status-badge status-${task.status}`}><span className="status-dot" />{getLabel(TASK_STATUSES, task.status)}</span>
    </header>
  );
}

interface TaskPropertiesProps {
  currentUser: User;
  isSaving: boolean;
  onSelectProject: (projectId: number) => void;
  onUpdate: (field: string, value: string) => void;
  task: Task;
}

function TaskProperties({ currentUser, isSaving, onSelectProject, onUpdate, task }: TaskPropertiesProps) {
  const availableStatuses = getAvailableStatuses(currentUser, task);
  return (
    <aside className="task-properties" aria-label="Task properties">
      <h2>Properties</h2>
      {availableStatuses.length > 1 ? <label className="task-property-control"><Icon name="check" size={15} /><span>Status</span><select disabled={isSaving} value={task.status} onChange={(event) => onUpdate('status', event.target.value)}>{availableStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : <PropertyRow icon="check" label="Status" value={getLabel(TASK_STATUSES, task.status)} />}
      {canEditPriority(currentUser, task) ? <label className="task-property-control"><Icon name="priority" size={15} /><span>Priority</span><select disabled={isSaving} value={task.priority} onChange={(event) => onUpdate('priority', event.target.value)}>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : <PropertyRow icon="priority" label="Priority" value={getLabel(PRIORITIES, task.priority)} />}
      <PropertyRow icon="user" label="Assignee" value={task.owner || 'Unassigned'} />
      <PropertyRow icon="calendar" label="Due date" value={formatDate(task.due_date)} />
      <PropertyRow icon="milestone" label="Milestone" value={task.milestone_title || 'No milestone'} />

      <div className="task-property-group">
        <h3>Project</h3>
        <button className="task-project-link" type="button" onClick={() => onSelectProject(task.project_id)}>
          <span className={`project-glyph priority-${task.priority}`} />
          <span>{task.project_name}</span>
          <Icon name="chevron" size={13} />
        </button>
      </div>
    </aside>
  );
}

interface PropertyRowProps {
  icon: string;
  label: string;
  value: string;
}

function PropertyRow({ icon, label, value }: PropertyRowProps) {
  return <div className="task-property-row"><Icon name={icon} size={15} /><span>{label}</span><strong>{value}</strong></div>;
}

interface ActivityEventProps {
  task: Task;
}

function ActivityEvent({ task }: ActivityEventProps) {
  const events: (TaskActivityEvent | { id: string; actor_name: string; event_type: string; created_at: string })[] = task.activity?.length ? task.activity : [{ id: 'created', actor_name: task.created_by_name || 'Atlas', event_type: 'created', created_at: task.created_at || '' }];
  return (
    events.map((event) => <div className="activity-item" key={event.id}><span className="avatar avatar-small">{getInitials('actor_name' in event ? event.actor_name : 'Atlas')}</span><div><p><strong>{'actor_name' in event ? event.actor_name : 'Atlas'}</strong> {formatActivity(event.event_type)}</p><time dateTime={event.created_at}>{formatTimestamp(event.created_at)}</time></div></div>)
  );
}

interface CommentItemProps {
  comment: TaskComment;
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <article className="activity-item comment-item">
      <span className="avatar avatar-small">{getInitials(comment.author)}</span>
      <div className="comment-content">
        <header><strong>{comment.author}</strong><time dateTime={comment.created_at}>{formatTimestamp(comment.created_at)}</time></header>
        <p>{comment.body}</p>
      </div>
    </article>
  );
}

interface CommentFormProps {
  comment: string;
  isPosting: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function CommentForm({ comment, isPosting, onChange, onSubmit }: CommentFormProps) {
  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <span className="avatar avatar-small">••</span>
      <div className="comment-composer">
        <label className="sr-only" htmlFor="task-comment">Add a comment</label>
        <textarea
          id="task-comment"
          maxLength={2000}
          placeholder="Leave a comment…"
          rows={3}
          value={comment}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="comment-actions">
          <span>{comment.length}/2000</span>
          <button className="comment-submit" type="submit" aria-label="Post comment" disabled={isPosting || !comment.trim()}>
            <Icon name="send" size={14} />
          </button>
        </div>
      </div>
    </form>
  );
}

interface TaskErrorProps {
  error: string;
  onBack: () => void;
  onMenu: () => void;
}

function TaskError({ error, onBack, onMenu }: TaskErrorProps) {
  return <><header className="project-breadcrumb-bar"><button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Icon name="menu" /></button><button className="text-button" type="button" onClick={onBack}>My tasks</button></header><div className="project-error"><EmptyState icon="alert" title="Task unavailable" message={error} action={<button className="button button-secondary" type="button" onClick={onBack}>Back to my tasks</button>} /></div></>;
}

function getTaskUpdatePayload(task: Task, changes: Record<string, string>) {
  if ('status' in changes) return { status: changes.status };
  if ('priority' in changes) return { priority: changes.priority };
  return changes;
}

function canEditPriority(user: User, task: Task) {
  return user?.role === 'admin' || task.project_role === 'project_lead';
}

interface StatusOption {
  value: string;
  label: string;
}

function getAvailableStatuses(user: User, task: Task): StatusOption[] {
  if (user?.role === 'admin') return TASK_STATUSES;
  if (task.project_role === 'project_lead') return TASK_STATUSES.filter((item) => item.value !== 'reviewed' && item.value !== 'done');
  if (task.assignee_user_id !== user?.id) return [{ value: task.status, label: getLabel(TASK_STATUSES, task.status) }];
  const transitions: Record<string, string[]> = { todo: ['todo', 'in_progress'], in_progress: ['in_progress', 'blocked', 'reviewing'], blocked: ['blocked', 'in_progress', 'reviewing'] };
  const values = transitions[task.status] || [task.status];
  return TASK_STATUSES.filter((item) => values.includes(item.value));
}

function normalizeTask(task: Task | null): Task | null {
  return task ? { ...task, comments: task.comments || [] } : null;
}

function formatActivity(eventType: string) { return eventType === 'created' ? 'created this task' : eventType === 'commented' ? 'commented on this task' : 'updated this task'; }

function formatTimestamp(value: string) {
  if (!value) return 'Just now';
  const normalizedValue = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}
