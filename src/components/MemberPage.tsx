import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import type { MemberSummary } from '../types/api.js';
import { formatDate } from '../utils/project.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import { Calendar, ChevronDown, CircleCheck, Layers, Menu, TriangleAlert } from 'lucide-react';

interface MemberPageProps {
  memberId: string;
  onBack: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
}

function roleLabel(role: string): string {
  if (role === 'project_lead') return 'Project lead';
  return 'Member';
}

export default function MemberPage({ memberId, onBack, onMenu, onSelectProject, onSelectTask }: MemberPageProps) {
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const loaded = await api.getMemberSummary(memberId);
      setSummary(loaded);
      setError('');
    } catch (loadError) {
      setSummary(null);
      setError((loadError as Error).message);
    }
  }, [memberId]);

  useEffect(() => {
    // Loading the URL-selected member is the synchronization purpose of this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  if (error && !summary) {
    return (
      <div className="page">
        <PageHeader eyebrow="Member" title="Member unavailable" description={error} onMenu={onMenu} />
        <EmptyState icon={TriangleAlert} title="Failed to load member" message={error} action={<button className="button ghost" type="button" onClick={load}>Try again</button>} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page">
        <PageHeader eyebrow="Member" title="Loading…" onMenu={onMenu} />
        <div className="loading-state">Loading member details…</div>
      </div>
    );
  }

  const openProjects = summary.projects.filter((p) => p.status !== 'done').length;

  return (
    <div className="page">
      <header className="project-breadcrumb-bar">
        <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Menu size={18} /></button>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <button type="button" onClick={onBack}>Team</button>
          <ChevronDown size={13} />
          <span>{summary.name}</span>
        </nav>
        <span className={`status-badge status-${summary.status === 'active' ? 'active' : 'cancelled'}`}><span className="status-dot" />{summary.status}</span>
      </header>
      <PageHeader
        eyebrow="Member"
        title={summary.name}
        description={`${summary.email} · ${summary.role === 'admin' ? 'Admin' : 'Team member'}`}
        onMenu={onMenu}
      />

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <div className="eyebrow">Member</div>
              <h2>{summary.name}</h2>
              <p>{summary.email}</p>
            </div>
          </div>
          <div className="project-stat-grid">
            <div className="project-stat">
              <strong>{summary.projects.length}</strong>
              <span>Projects</span>
            </div>
            <div className="project-stat">
              <strong>{openProjects}</strong>
              <span>Active projects</span>
            </div>
            <div className="project-stat">
              <strong>{summary.assignments.tasks.length}</strong>
              <span>Assigned tasks</span>
            </div>
            <div className="project-stat">
              <strong>{summary.assignments.vault_entries.length}</strong>
              <span>Vault entries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <h2>Projects & roles</h2>
              <p>Memberships across the workspace</p>
            </div>
          </div>
          {summary.projects.length === 0 ? (
            <EmptyState icon={Layers} title="No projects" message="Not part of any project yet." />
          ) : (
            <DetailList>
              {summary.projects.map((project) => (
                <DetailRow key={project.project_id}>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectProject(project.project_id)}
                  >
                    {project.project_name}
                  </button>
                  <div className="detail-list-copy">
                    <small>{roleLabel(project.project_role)}</small>
                  </div>
                  <span className="role-pill">{project.status}</span>
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
              <h2>Assigned tasks</h2>
              <p>Tasks this member is the assignee for</p>
            </div>
          </div>
          {summary.assignments.tasks.length === 0 ? (
            <EmptyState icon={CircleCheck} title="No tasks assigned" message="No tasks assigned to this member." />
          ) : (
            <DetailList>
              {summary.assignments.tasks.map((task) => (
                <DetailRow key={`task-${task.id}`}>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                  >
                    {task.title}
                  </button>
                  <div className="detail-list-copy">
                    <small>
                      {task.project_name} · {task.status.replaceAll('_', ' ')}
                      {task.due_date ? ` · due ${formatDate(task.due_date)}` : ''}
                    </small>
                  </div>
                  <span className="role-pill">{task.priority}</span>
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
              <h2>Owned risks</h2>
              <p>Risks where this member is the owner</p>
            </div>
          </div>
          {summary.assignments.risks.length === 0 ? (
            <EmptyState icon={TriangleAlert} title="No risks owned" message="No risks are owned by this member." />
          ) : (
            <DetailList>
              {summary.assignments.risks.map((risk) => (
                <DetailRow key={`risk-${risk.id}`}>
                  <span className="detail-list-copy">
                    <strong>{risk.title}</strong>
                    <small>
                      {risk.project_name} · {risk.severity} · {risk.status.replaceAll('_', ' ')}
                      {risk.due_date ? ` · due ${formatDate(risk.due_date)}` : ''}
                    </small>
                  </span>
                  <span className="role-pill">{risk.severity}</span>
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
              <h2>Owned issues</h2>
              <p>Issues where this member is the owner</p>
            </div>
          </div>
          {summary.assignments.issues.length === 0 ? (
            <EmptyState icon={TriangleAlert} title="No issues owned" message="No issues are owned by this member." />
          ) : (
            <DetailList>
              {summary.assignments.issues.map((issue) => (
                <DetailRow key={`issue-${issue.id}`}>
                  <span className="detail-list-copy">
                    <strong>{issue.title}</strong>
                    <small>
                      {issue.project_name} · {issue.status.replaceAll('_', ' ')}
                      {issue.target_resolution_date
                        ? ` · target ${formatDate(issue.target_resolution_date)}`
                        : ''}
                    </small>
                  </span>
                  <span className="role-pill">{issue.priority}</span>
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
              <h2>Allocations</h2>
              <p>Time allocated across projects</p>
            </div>
          </div>
          {summary.assignments.allocations.length === 0 ? (
            <EmptyState icon={Calendar} title="No allocations" message="No time allocated across projects." />
          ) : (
            <DetailList>
              {summary.assignments.allocations.map((allocation, index) => (
                <DetailRow key={`allocation-${index}`}>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectProject(allocation.project_id)}
                  >
                    {allocation.project_name}
                  </button>
                  <div className="detail-list-copy">
                    <small>
                      {formatDate(allocation.starts_on)} → {formatDate(allocation.ends_on)}
                    </small>
                  </div>
                  <span className="role-pill">{allocation.allocation_percent}%</span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>
      </div>
    </div>
  );
}