import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { api } from '../api/client.js';
import { PRIORITIES, TASK_STATUSES, getLabel } from '../constants.js';
import type { User, Task, TaskComment, TaskActivityEvent, Milestone, ProjectMember } from '../types/api.js';
import type { MessageId } from '../i18n/messages/en.js';
import { formatDate, getInitials } from '../utils/project.js';
import { getAllowedTaskStatuses } from '../utils/task.js';
import EmptyState from './EmptyState.js';
import { Calendar, ChevronDown, CircleCheck, Diamond, Flag, Menu, Send, TriangleAlert, User as UserIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';


interface TaskPageProps {
  currentUser: User;
  onBack: () => void;
  onChanged: () => void;
  onMenu: () => void;
  onSelectMember: (userId: string) => void;
  onSelectProject: (projectId: string) => void;
  taskId: string;
}

function initialTask(): Task | null {
  return null;
}

export default function TaskPage({ currentUser, onBack, onChanged, onMenu, onSelectMember, onSelectProject, taskId }: TaskPageProps) {
  const intl = useIntl();
  const [task, setTask] = useState<Task | null>(() => normalizeTask(initialTask()));
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      const loadedTask = await api.getTask(taskId);
      const [projectMilestones, projectMembers] = await Promise.all([
        api.listMilestones(loadedTask.project_id),
        api.listProjectMembers(loadedTask.project_id),
      ]);
      setTask(normalizeTask(loadedTask));
      setMilestones(projectMilestones);
      setMembers(projectMembers);
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

  const updateProperty = async (field: string, value: string | number | null) => {
    setIsSavingProperty(true);
    try {
      const updatedTask = await api.updateTask(task!.id, getTaskUpdatePayload(task!, { [field]: value }));
      setTask((current) => ({ ...current!, ...updatedTask }));
      setError('');
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
  if (!task) return <div className="loading-state task-loading"><span className="spinner" />{intl.formatMessage({ id: 'task.loading' })}</div>;

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
            <h2 id="task-description-title">{intl.formatMessage({ id: 'task.descriptionSection' })}</h2>
            <p>{task.description || task.blocker_note || intl.formatMessage({ id: 'task.descriptionEmptyFallback' })}</p>
          </section>

          <section className="task-activity" aria-labelledby="task-activity-title">
            <div className="task-section-heading">
              <h2 id="task-activity-title">{intl.formatMessage({ id: 'task.activity' })}</h2>
              <span><FormattedMessage id="task.commentsCount" values={{ n: task.comments.length }} /></span>
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
          members={members}
          milestones={milestones}
          onSelectMember={onSelectMember}
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
  onSelectProject: (projectId: string) => void;
}

function TaskBreadcrumb({ onBack, onMenu, onSelectProject, task }: TaskBreadcrumbProps) {
  const intl = useIntl();
  return (
    <header className="project-breadcrumb-bar task-breadcrumb-bar">
      <button className="icon-button mobile-menu" type="button" aria-label={intl.formatMessage({ id: 'common.openNavigation' })} onClick={onMenu}><Menu size={18} /></button>
      <nav aria-label={intl.formatMessage({ id: 'common.breadcrumb' })} className="breadcrumb">
        <button type="button" onClick={onBack}>{intl.formatMessage({ id: 'task.title' })}</button>
        <ChevronDown size={13} />
        <button type="button" onClick={() => onSelectProject(task.project_id)}>{task.project_name}</button>
        <ChevronDown size={13} />
        <span>TASK-{task.id}</span>
      </nav>
      <span className={`status-badge status-${task.status}`}><span className="status-dot" />{intl.formatMessage({ id: getLabel(TASK_STATUSES, task.status) })}</span>
    </header>
  );
}

interface TaskPropertiesProps {
  currentUser: User;
  isSaving: boolean;
  members: ProjectMember[];
  milestones: Milestone[];
  onSelectMember: (userId: string) => void;
  onSelectProject: (projectId: string) => void;
  onUpdate: (field: string, value: string | number | null) => void;
  task: Task;
}

function TaskProperties({ currentUser, isSaving, members, milestones, onSelectMember, onSelectProject, onUpdate, task }: TaskPropertiesProps) {
  const intl = useIntl();
  const availableStatuses = getAllowedTaskStatuses(currentUser, task);
  const canManage = canManageTaskProperties(currentUser, task);
  return (
    <aside className="task-properties" aria-label={intl.formatMessage({ id: 'task.properties' })}>
      <h2>{intl.formatMessage({ id: 'task.properties' })}</h2>
      {availableStatuses.length > 1 ? <label className="task-property-control"><CircleCheck size={15} /><span>{intl.formatMessage({ id: 'task.statusLabel' })}</span><select disabled={isSaving} value={task.status} onChange={(event) => onUpdate('status', event.target.value)}>{availableStatuses.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label as MessageId })}</option>)}</select></label> : <PropertyRow icon={CircleCheck} label={intl.formatMessage({ id: 'task.statusLabel' })} value={intl.formatMessage({ id: getLabel(TASK_STATUSES, task.status) })} />}
      {canManage ? <label className="task-property-control"><Flag size={15} /><span>{intl.formatMessage({ id: 'task.priorityLabel' })}</span><select disabled={isSaving} value={task.priority} onChange={(event) => onUpdate('priority', event.target.value)}>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label as MessageId })}</option>)}</select></label> : <PropertyRow icon={Flag} label={intl.formatMessage({ id: 'task.priorityLabel' })} value={intl.formatMessage({ id: getLabel(PRIORITIES, task.priority) })} />}
      {canManage ? <label className="task-property-control"><UserIcon size={15} /><span>{intl.formatMessage({ id: 'task.assigneeLabel' })}</span><select disabled={isSaving} value={task.assignee_user_id || ''} onChange={(event) => onUpdate('assignee_user_id', event.target.value || null)}><option value="">{intl.formatMessage({ id: 'common.unassigned' })}</option>{members.map((member) => <option disabled={member.status !== 'active'} key={member.user_id} value={member.user_id}>{member.name}{member.status !== 'active' ? ` (${intl.formatMessage({ id: member.status === 'suspended' ? 'team.suspended' : 'team.pending' })})` : ''}</option>)}</select></label> : <PropertyRow icon={UserIcon} label={intl.formatMessage({ id: 'task.assigneeLabel' })} value={task.assignee_user_id ? <button className="text-button user-link" type="button" onClick={() => onSelectMember(task.assignee_user_id!)}>{task.assignee_name || intl.formatMessage({ id: 'task.assigneeFallback' })}</button> : task.owner || intl.formatMessage({ id: 'common.unassigned' })} />}
      {canManage ? <label className="task-property-control"><Calendar size={15} /><span>{intl.formatMessage({ id: 'task.dueDateLabel' })}</span><input disabled={isSaving} type="date" value={task.due_date || ''} onChange={(event) => onUpdate('due_date', event.target.value || null)} /></label> : <PropertyRow icon={Calendar} label={intl.formatMessage({ id: 'task.dueDateLabel' })} value={formatDate(task.due_date, intl)} />}
      {canManage ? <label className="task-property-control"><Diamond size={15} /><span>{intl.formatMessage({ id: 'task.milestoneLabel' })}</span><select disabled={isSaving} value={task.milestone_id || ''} onChange={(event) => onUpdate('milestone_id', event.target.value || null)}><option value="">{intl.formatMessage({ id: 'task.noMilestone' })}</option>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label> : <PropertyRow icon={Diamond} label={intl.formatMessage({ id: 'task.milestoneLabel' })} value={task.milestone_title || intl.formatMessage({ id: 'task.noMilestone' })} />}

      <div className="task-property-group">
        <h3>{intl.formatMessage({ id: 'task.projectLabel' })}</h3>
        <button className="task-project-link" type="button" onClick={() => onSelectProject(task.project_id)}>
          <span className={`project-glyph priority-${task.priority}`} />
          <span>{task.project_name}</span>
          <ChevronDown size={13} />
        </button>
      </div>
    </aside>
  );
}

interface PropertyRowProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

function PropertyRow({ icon: Icon, label, value }: PropertyRowProps) {
  return <div className="task-property-row"><Icon size={15} /><span>{label}</span><strong>{value}</strong></div>;
}

interface ActivityEventProps {
  task: Task;
}

function ActivityEvent({ task }: ActivityEventProps) {
  const intl = useIntl();
  const events: (TaskActivityEvent | { id: string; actor_name: string; event_type: string; created_at: string })[] = task.activity?.length ? task.activity : [{ id: 'created', actor_name: task.created_by_name || 'Atlas', event_type: 'created', created_at: task.created_at || '' }];
  return (
    events.map((event) => <div className="activity-item" key={event.id}><span className="avatar avatar-small">{getInitials('actor_name' in event ? event.actor_name : 'Atlas')}</span><div><p><strong>{'actor_name' in event ? event.actor_name : 'Atlas'}</strong> {formatActivity(event.event_type, intl)}</p><time dateTime={event.created_at}>{formatTimestamp(event.created_at, intl)}</time></div></div>)
  );
}

interface CommentItemProps {
  comment: TaskComment;
}

function CommentItem({ comment }: CommentItemProps) {
  const intl = useIntl();
  return (
    <article className="activity-item comment-item">
      <span className="avatar avatar-small">{getInitials(comment.author)}</span>
      <div className="comment-content">
        <header><strong>{comment.author}</strong><time dateTime={comment.created_at}>{formatTimestamp(comment.created_at, intl)}</time></header>
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
  const intl = useIntl();
  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <span className="avatar avatar-small">••</span>
      <div className="comment-composer">
        <label className="sr-only" htmlFor="task-comment">{intl.formatMessage({ id: 'task.addComment' })}</label>
        <textarea
          id="task-comment"
          maxLength={2000}
          placeholder={intl.formatMessage({ id: 'task.commentPlaceholder' })}
          rows={3}
          value={comment}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="comment-actions">
          <span>{comment.length}/2000</span>
          <button className="comment-submit" type="submit" aria-label={intl.formatMessage({ id: 'task.postComment' })} disabled={isPosting || !comment.trim()}>
            <Send size={14} />
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
  const intl = useIntl();
  return <><header className="project-breadcrumb-bar"><button className="icon-button mobile-menu" type="button" aria-label={intl.formatMessage({ id: 'common.openNavigation' })} onClick={onMenu}><Menu /></button><button className="text-button" type="button" onClick={onBack}>{intl.formatMessage({ id: 'task.title' })}</button></header><div className="project-error"><EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'task.unavailable' })} message={error} action={<button className="button button-secondary" type="button" onClick={onBack}>{intl.formatMessage({ id: 'task.backToTasks' })}</button>} /></div></>;
}

function getTaskUpdatePayload(task: Task, changes: Record<string, unknown>) {
  if ('status' in changes) return { status: changes.status };
  if ('priority' in changes) return { priority: changes.priority };
  return changes;
}

function canManageTaskProperties(user: User, task: Task) {
  return user?.role === 'admin' || task.project_role === 'project_lead';
}

function normalizeTask(task: Task | null): Task | null {
  return task ? { ...task, comments: task.comments || [] } : null;
}

function formatActivity(eventType: string, intl: ReturnType<typeof useIntl>) { return eventType === 'created' ? intl.formatMessage({ id: 'task.activityCreated' }) : eventType === 'commented' ? intl.formatMessage({ id: 'task.activityCommented' }) : intl.formatMessage({ id: 'task.activityUpdated' }); }

function formatTimestamp(value: string, intl: ReturnType<typeof useIntl>) {
  if (!value) return intl.formatMessage({ id: 'task.justNow' });
  const normalizedValue = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return value;
  return intl.formatDate(date, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
