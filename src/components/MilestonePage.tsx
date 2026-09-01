import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PRIORITIES, TASK_STATUSES, getLabel } from '../constants.js';
import type { MilestoneDetail } from '../types/api.js';
import { formatDate } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface MilestonePageProps {
  milestoneId: number;
  onBack: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: number) => void;
  onSelectTask: (taskId: number) => void;
  onSelectMember: (userId: number) => void;
}

function milestoneStatusLabel(status: string): string {
  return status ? status.replaceAll('_', ' ') : 'Unscheduled';
}

export default function MilestonePage({ milestoneId, onBack, onMenu, onSelectProject, onSelectTask, onSelectMember }: MilestonePageProps) {
  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [error, setError] = useState('');

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

  if (error && !milestone) {
    return (
      <div className="page">
        <PageHeader eyebrow="Milestone" title="Milestone unavailable" description={error} onMenu={onMenu} />
        <EmptyState icon="alert" title="Failed to load milestone" message={error} action={<button className="button ghost" type="button" onClick={load}>Try again</button>} />
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

  return (
    <div className="page">
      <header className="project-breadcrumb-bar">
        <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Icon name="menu" size={18} /></button>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <button type="button" onClick={onBack}>Projects</button>
          <Icon name="chevron" size={13} />
          <button type="button" onClick={() => onSelectProject(milestone.project_id)}>{milestone.project_name}</button>
          <Icon name="chevron" size={13} />
          <span>{milestone.title}</span>
        </nav>
        <span className={`status-badge status-${milestone.status === 'done' ? 'active' : milestone.status === 'missed' ? 'cancelled' : 'pending'}`}><span className="status-dot" />{milestoneStatusLabel(milestone.status)}</span>
      </header>

      <PageHeader
        eyebrow="Milestone"
        title={milestone.title}
        description={`${milestone.phase_name || 'No phase'} · target ${formatDate(milestone.target_date)}`}
        onMenu={onMenu}
      />

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <div className="eyebrow">Milestone</div>
              <h2>{milestone.title}</h2>
              <p>{milestone.phase_name || 'No phase'} · {formatDate(milestone.target_date)}</p>
            </div>
          </div>
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
          <div className="mini-progress milestone-progress"><span style={{ width: `${milestone.progress}%` }} /></div>
        </div>
      </div>

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <h2>Tasks</h2>
              <p>Work attached to this milestone</p>
            </div>
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon="check" title="No tasks" message="No tasks are attached to this milestone yet." />
          ) : (
            <div className="detail-list">
              {tasks.map((task) => (
                <div className="detail-list-row" key={task.id}>
                  <span className={`task-check status-${task.status}`} />
                  <button className="detail-list-copy detail-list-link" type="button" onClick={() => onSelectTask(task.id)}>
                    <strong>{task.title}</strong>
                    <small>{task.status !== 'done' ? getLabel(TASK_STATUSES, task.status) : 'Done'} · {getLabel(PRIORITIES, task.priority)} · {task.due_date ? formatDate(task.due_date) : 'No due date'}</small>
                  </button>
                  {task.assignee_user_id && (
                    <button className="text-button user-link" type="button" onClick={() => onSelectMember(task.assignee_user_id!)}>{task.assignee_name || 'Assignee'}</button>
                  )}
                </div>
              ))}
            </div>
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
          </div>
          {milestone.members.length === 0 ? (
            <EmptyState icon="users" title="No people" message="No team members are assigned to tasks on this milestone." />
          ) : (
            <div className="detail-list">
              {milestone.members.map((member) => (
                <div className="detail-list-row" key={member.user_id}>
                  <span className="avatar">{member.name?.slice(0, 2).toUpperCase() || '—'}</span>
                  <span className="detail-list-copy">
                    <button className="text-button user-link" type="button" onClick={() => onSelectMember(member.user_id)}>{member.name}</button>
                    <small>{member.email || 'No email'}</small>
                  </span>
                  <span className="role-pill">{member.project_role === 'project_lead' ? 'Project lead' : 'Member'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
