import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { canManageProject } from '../auth/permissions.js';
import { PRIORITIES, TASK_STATUSES, getLabel } from '../constants.js';
import type { MilestoneDetail, Project, ProjectRole, User } from '../types/api.js';
import { formatDate } from '../utils/project.js';
import { DetailList, DetailRow } from './DetailList.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import { TaskDialog } from './ProjectPage.js';
import { ChevronDown, CircleCheck, Menu, Plus, TriangleAlert, Users } from 'lucide-react';

interface MilestonePageProps {
  currentUser: User;
  milestoneId: string;
  onBack: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectMember: (userId: string) => void;
}

function milestoneStatusLabel(status: string): string {
  return status ? status.replaceAll('_', ' ') : 'Unscheduled';
}

function AddMemberDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: queryKeys.users(), queryFn: ({ signal }) => api.listUsers({ signal }) });
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<ProjectRole>('member');
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: { user_id: string; project_role: ProjectRole }) => api.addProjectMember(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(project.id) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) { setError('Select a team member.'); return; }
    saveMutation.mutate({ user_id: userId, project_role: role });
  };

  return (
    <DialogShell title="Add person" description={`Add a team member to ${project.name}.`} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="mi-member-user">Team member</label><select id="mi-member-user" required value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Select a user</option>{(usersQuery.data || []).filter((user) => user.status === 'active').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div>
        <div className="field-group"><label htmlFor="mi-member-role">Project role</label><select id="mi-member-role" value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}><option value="member">Member</option><option value="project_lead">Project lead</option></select></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

export default function MilestonePage({ currentUser, milestoneId, onBack, onMenu, onSelectProject, onSelectTask, onSelectMember }: MilestonePageProps) {
  const queryClient = useQueryClient();
  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [error, setError] = useState('');
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const loaded = await api.getMilestone(milestoneId);
      setMilestone(loaded);
      setError('');
    } catch (loadError) {
      setMilestone(null);
      setError((loadError as Error).message);
    }
  }, [milestoneId]);

  useEffect(() => {
    // Loading the URL-selected milestone is the synchronization purpose of this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(milestone?.project_id ?? ''),
    queryFn: ({ signal }) => api.getProject(milestone!.project_id, signal),
    enabled: Boolean(milestone?.project_id),
  });

  if (error && !milestone) {
    return (
      <div className="page">
        <PageHeader eyebrow="Milestone" title="Milestone unavailable" description={error} onMenu={onMenu} />
        <EmptyState icon={TriangleAlert} title="Failed to load milestone" message={error} action={<button className="button ghost" type="button" onClick={load}>Try again</button>} />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="page">
        <PageHeader eyebrow="Milestone" title="Loading…" onMenu={onMenu} />
        <div className="loading-state">Loading milestone details…</div>
      </div>
    );
  }

  const { tasks } = milestone;
  const project = projectQuery.data;
  const canEdit = canManageProject(currentUser, project);
  const refreshMilestone = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.milestone(milestoneId) });
    load();
  };

  return (
    <div className="page">
      <header className="project-breadcrumb-bar milestone-header">
        <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Menu size={18} /></button>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <button type="button" onClick={onBack}>Projects</button>
          <ChevronDown size={13} />
          <button type="button" onClick={() => onSelectProject(milestone.project_id)}>{milestone.project_name}</button>
          <ChevronDown size={13} />
          <span>{milestone.title}</span>
        </nav>
        <span className={`status-badge status-${milestone.status === 'done' ? 'active' : milestone.status === 'missed' ? 'cancelled' : 'pending'}`}><span className="status-dot" />{milestoneStatusLabel(milestone.status)}</span>
      </header>

      <PageHeader
        eyebrow="Milestone"
        title={milestone.title}
        description={`${milestone.phase_name || 'No phase'} · target ${formatDate(milestone.target_date)}`}
        onMenu={onMenu}
        action={<div className="mini-progress milestone-progress milestone-progress-header"><span style={{ width: `${milestone.progress}%` }} /></div>}
      />

      <div className="project-section-block">
        <div className="project-stat-grid">
            <div className="project-stat">
              <strong>{tasks.length}</strong>
              <span>Tasks</span>
            </div>
            <div className="project-stat">
              <strong>{tasks.filter((task) => task.status === 'done').length}</strong>
              <span>Done</span>
            </div>
            <div className="project-stat">
              <strong>{tasks.filter((task) => task.status === 'blocked').length}</strong>
              <span>Blocked</span>
            </div>
            <div className="project-stat">
              <strong>{milestone.progress}%</strong>
              <span>Progress</span>
            </div>
          </div>
        </div>

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <h2>Tasks</h2>
              <p>Work attached to this milestone</p>
            </div>
            {canEdit && project && <button className="button button-secondary button-small" type="button" onClick={() => setIsTaskOpen(true)}><Plus size={14} />Add task</button>}
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon={CircleCheck} title="No tasks" message="No tasks are attached to this milestone yet." action={canEdit && project ? <button className="button button-secondary" type="button" onClick={() => setIsTaskOpen(true)}>Add task</button> : undefined} />
          ) : (
            <DetailList>
              {tasks.map((task) => (
                <DetailRow key={task.id}>
                  <span className={`task-check status-${task.status}`} />
                  <button className="detail-list-copy detail-list-link" type="button" onClick={() => onSelectTask(task.id)}>
                    <strong>{task.title}</strong>
                    <small>{task.status !== 'done' ? getLabel(TASK_STATUSES, task.status) : 'Done'} · {getLabel(PRIORITIES, task.priority)} · {task.due_date ? formatDate(task.due_date) : 'No due date'}</small>
                  </button>
                  {task.assignee_user_id && (
                    <button className="text-button user-link" type="button" onClick={() => onSelectMember(task.assignee_user_id!)}>{task.assignee_name || 'Assignee'}</button>
                  )}
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>
      </div>

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <h2>People</h2>
              <p>Members assigned to these tasks</p>
            </div>
            {canEdit && project && <button className="button button-secondary button-small" type="button" onClick={() => setIsMemberOpen(true)}><Plus size={14} />Add people</button>}
          </div>
          {milestone.members.length === 0 ? (
            <EmptyState icon={Users} title="No people" message="No team members are assigned to tasks on this milestone." action={canEdit && project ? <button className="button button-secondary" type="button" onClick={() => setIsMemberOpen(true)}>Add people</button> : undefined} />
          ) : (
            <DetailList>
              {milestone.members.map((member) => (
                <DetailRow key={member.user_id}>
                  <span className="avatar">{member.name?.slice(0, 2).toUpperCase() || '—'}</span>
                  <span className="detail-list-copy">
                    <button className="text-button user-link" type="button" onClick={() => onSelectMember(member.user_id)}>{member.name}</button>
                    <small>{member.email || 'No email'}</small>
                  </span>
                  <span className="role-pill">{member.project_role === 'project_lead' ? 'Project lead' : 'Member'}</span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>
      </div>

      {isTaskOpen && project && <TaskDialog project={project} projectId={project.id} initialMilestoneId={milestone.id} onClose={() => setIsTaskOpen(false)} onCreated={refreshMilestone} />}
      {isMemberOpen && project && <AddMemberDialog project={project} onClose={() => setIsMemberOpen(false)} />}
    </div>
  );
}
