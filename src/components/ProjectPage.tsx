import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { PRIORITIES } from '../constants.js';
import { canManageProject, canManageFinance, canManageRisk, canManageIssue } from '../auth/permissions.js';
import type { User, Project, Task, Milestone, Risk, Issue, BudgetLine, SpendRecord, ProjectLink, Priority, MilestoneStatus, ProjectRole, RiskSeverity, IssueStatus, RiskProbability, RiskStatus, CreateTaskPayload, CreateMilestonePayload } from '../types/api.js';
import { formatDate, getInitials, getProgress, getProjectHealth } from '../utils/project.js';
import ConfirmDialog from './ConfirmDialog.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';
import { SearchField, SelectField } from './FilterBar.js';
import Icon from './Icon.js';
import PhaseModal from './PhaseModal.js';
import StatusBadge from './StatusBadge.js';
import TaskKanbanBoard from './TaskKanbanBoard.js';

interface ProjectPageProps {
  currentUser: User;
  onBack: () => void;
  onChanged: () => void;
  onMenu: () => void;
  onSelectTask: (taskId: number) => void;
  projectId: number;
}

const PROJECT_TABS_ADMIN = ['Overview', 'Tasks', 'Milestones', 'Timeline', 'Links', 'Finance', 'Risks & Issues', 'Team'];
const PROJECT_TABS_MEMBER = ['Overview', 'Tasks', 'Milestones', 'Timeline', 'Links', 'Risks & Issues', 'Team'];

export default function ProjectPage({ currentUser, onBack, onChanged, onMenu, onSelectTask, projectId }: ProjectPageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [createType, setCreateType] = useState('');

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: ({ signal }) => api.getProject(projectId, signal),
  });

  const project = projectQuery.data;
  const error = projectQuery.error;

  const handleCreated = async () => {
    setCreateType('');
    await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    await onChanged();
  };

  if (error) return <ProjectError error={error} onBack={onBack} onMenu={onMenu} />;
  if (projectQuery.isLoading) return <div className="loading-state project-loading"><span className="spinner" />Loading project…</div>;
  if (!project) return null;

  const isPrivileged = canManageProject(currentUser, project);
  const showFinance = canManageFinance(currentUser);
  const projectTabs = showFinance ? PROJECT_TABS_ADMIN : PROJECT_TABS_MEMBER;

  return (
    <div className="project-page">
      <ProjectBreadcrumb project={project} onBack={onBack} onMenu={onMenu} />
      <nav className="project-tabs" aria-label="Project sections">
        {projectTabs.map((tab) => (
          <button
            className={activeTab === tab ? 'is-active' : ''}
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => { setActiveTab(tab); setCreateType(''); }}
          >
            {tab}
            <TabCount project={project} tab={tab} />
          </button>
        ))}
      </nav>

      <div className="project-page-content">
        {activeTab === 'Overview' && <OverviewSection project={project} />}
        {activeTab === 'Tasks' && <TasksSection canManageProject={isPrivileged} currentUser={currentUser} project={project} projectId={projectId} onSelectTask={onSelectTask} />}
        {activeTab === 'Milestones' && <MilestonesSection projectId={projectId} project={project} canManageProject={isPrivileged} />}
        {activeTab === 'Timeline' && <TimelineSection project={project} />}
        {activeTab === 'Links' && <LinksSection projectId={projectId} project={project} canManageProject={isPrivileged} />}
        {activeTab === 'Finance' && showFinance && <FinanceSection projectId={projectId} />}
        {activeTab === 'Risks & Issues' && <RisksIssuesSection projectId={projectId} project={project} canManageProject={isPrivileged} currentUser={currentUser} />}
        {activeTab === 'Team' && <TeamSection project={project} canManageProject={isPrivileged} onAdd={() => setCreateType('member')} />}
        {createType && <CreateProjectItemForm type={createType} project={project} onCancel={() => setCreateType('')} onCreated={handleCreated} />}
      </div>
    </div>
  );
}

interface TimelineSectionProps {
  project: Project;
}

function TimelineSection({ project }: TimelineSectionProps) {
  const queryClient = useQueryClient();
  const [isPhaseOpen, setIsPhaseOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<number | null>(null);

  const deletePhaseMutation = useMutation({
    mutationFn: (phaseId: number) => api.deletePhase(project.id, phaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
      setDeletePhaseTarget(null);
    },
  });

  const rows = useMemo(() => {
    const items = [
      ...(project.phases || []).map((phase) => ({ id: `phase-${phase.id}`, rawId: phase.id, type: 'Phase', title: phase.name, start: phase.start_date, end: phase.end_date, status: '' })),
      ...(project.milestones || []).map((milestone) => ({ id: `milestone-${milestone.id}`, rawId: milestone.id, type: 'Milestone', title: milestone.title, start: milestone.target_date, end: milestone.target_date, status: milestone.status })),
      ...(project.tasks || []).map((task) => ({ id: `task-${task.id}`, rawId: task.id, type: 'Task', title: task.title, start: '', end: task.due_date, status: task.status, owner: task.assignee_name })),
    ].sort((first, second) => String(first.end || '').localeCompare(String(second.end || '')));

    return items.filter((item) => {
      if (filterType && item.type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (search && !`${item.title} ${item.type}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [project, filterType, search]);

  return (
    <ProjectSection
      title="Project timeline"
      description="Phases, milestones, and task deadlines in chronological order."
      actionLabel="Add phase"
      onAction={() => setIsPhaseOpen(true)}
    >
      <div className="project-toolbar" style={{ marginBottom: 16 }}>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter timeline…" />
          <SelectField
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label="Filter by type"
            options={[
              { value: 'phase', label: 'Phases' },
              { value: 'milestone', label: 'Milestones' },
              { value: 'task', label: 'Tasks' },
            ]}
            placeholder="All items"
          />
        </div>
      </div>

      {rows.length ? (
        <div className="detail-list" role="table" aria-label="Project timeline">
          {rows.map((row) => (
            <div className="detail-list-row" key={row.id} role="row">
              <span className="role-pill">{row.type}</span>
              <span className="detail-list-copy">
                <strong>{row.title}</strong>
                <small>
                  {(row as { owner?: string }).owner || row.status || 'Scheduled'} · {formatDate(row.start)} — {formatDate(row.end)}
                </small>
              </span>
              {row.type === 'Phase' && (
                <div className="invitation-actions">
                  <button
                    className="text-button text-button-danger"
                    type="button"
                    onClick={() => setDeletePhaseTarget(row.rawId)}
                  >
                    Delete phase
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="calendar" title="No scheduled work" message="Add phases, milestones, or dated tasks to populate the timeline." />
      )}

      {isPhaseOpen && (
        <PhaseModal
          projectId={project.id}
          onClose={() => setIsPhaseOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) })}
        />
      )}

      {deletePhaseTarget && (
        <ConfirmDialog
          title="Delete Phase"
          description="Are you sure you want to delete this timeline phase?"
          confirmLabel="Delete phase"
          variant="danger"
          isPending={deletePhaseMutation.isPending}
          onConfirm={() => deletePhaseMutation.mutate(deletePhaseTarget)}
          onCancel={() => setDeletePhaseTarget(null)}
        />
      )}
    </ProjectSection>
  );
}

interface ProjectBreadcrumbProps {
  onBack: () => void;
  onMenu: () => void;
  project: Project;
}

function ProjectBreadcrumb({ onBack, onMenu, project }: ProjectBreadcrumbProps) {
  return (
    <header className="project-breadcrumb-bar">
      <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Icon name="menu" size={18} /></button>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <button type="button" onClick={onBack}>Projects</button>
        <Icon name="chevron" size={13} />
        <span className={`project-glyph priority-${project.priority}`} />
        <span>{project.name}</span>
      </nav>
      <div className="project-header-links">
        {project.website_url && <a href={project.website_url} target="_blank" rel="noreferrer" aria-label="Open project website"><Icon name="external" /></a>}
        {project.drive_folder_url && <a href={project.drive_folder_url} target="_blank" rel="noreferrer" aria-label="Open project Drive folder"><Icon name="projects" /></a>}
      </div>
    </header>
  );
}

interface ProjectHeroProps {
  project: Project;
}

function ProjectHero({ project }: ProjectHeroProps) {
  const health = getProjectHealth(project);
  const healthLabels: Record<string, string> = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Off Track',
    complete: 'Completed',
    no_update: 'No Schedule',
  };

  return (
    <section className="project-hero">
      <span className={`project-hero-icon priority-${project.priority}`}><Icon name="projects" size={20} /></span>
      <h1>{project.name}</h1>
      <p>{project.description || 'Add a short project summary.'}</p>
      <div className="project-properties" aria-label="Project properties">
        <span className="property-label">Properties</span>
        <StatusBadge status={project.status} />
        <span className={`status-badge status-${health === 'behind' ? 'blocked' : health === 'at_risk' ? 'on_hold' : 'active'}`}>
          <span className="status-dot" />
          {healthLabels[health] || health}
        </span>
        <span className="priority-label"><span className={`priority-mark priority-${project.priority}`} />{project.priority}</span>
        <span className="project-property"><span className="avatar">{getInitials(project.owner || project.owner_name)}</span>{project.owner || project.owner_name || 'Unassigned'}</span>
        {project.start_date && <span className="project-property"><Icon name="calendar" size={14} />Start: {formatDate(project.start_date)}</span>}
        <span className="project-property"><Icon name="calendar" size={14} />Target: {formatDate(project.deadline)}</span>
        <span className="project-property"><span className="progress-ring">{getProgress(project)}</span>{getProgress(project)}% complete</span>
      </div>
      <div className="project-resources">
        <span className="property-label">Resources</span>
        {project.website_url && <a href={project.website_url} target="_blank" rel="noreferrer">Website <Icon name="external" size={13} /></a>}
        {project.drive_folder_url && <a href={project.drive_folder_url} target="_blank" rel="noreferrer">Drive folder <Icon name="external" size={13} /></a>}
        {!project.website_url && !project.drive_folder_url && <span>No resources linked</span>}
      </div>
    </section>
  );
}

interface OverviewSectionProps {
  project: Project;
}

function OverviewSection({ project }: OverviewSectionProps) {
  const completedTasks = project.tasks?.filter((task) => task.status === 'done').length || 0;
  return (
    <>
      <ProjectHero project={project} />
      <div className="project-overview-layout">
        <div className="project-main-column">
          <section className="project-update-card">
            <Icon name="overview" />
            <span>
              <strong>No project update yet</strong>
              <small>Progress is currently calculated from tasks and milestones.</small>
            </span>
          </section>
          <section className="project-section-block">
            <span className="eyebrow">Milestones</span>
            <h2>Delivery roadmap</h2>
            {project.milestones?.length ? <MilestoneRows project={project} /> : <EmptyState icon="calendar" title="No milestones yet" message="Create a milestone to organize work around a target date." />}
          </section>
        </div>
        <aside className="project-side-column">
          <div className="project-stat-grid">
            <ProjectStat value={project.tasks?.length || 0} label="Total tasks" />
            <ProjectStat value={completedTasks} label="Completed" />
            <ProjectStat value={project.milestones?.length || 0} label="Milestones" />
            <ProjectStat value={project.team_members?.length || 0} label="Members" />
          </div>
        </aside>
      </div>
    </>
  );
}

interface TasksSectionProps {
  canManageProject: boolean;
  currentUser: User;
  onSelectTask: (taskId: number) => void;
  project: Project;
  projectId: number;
}

function TasksSection({ canManageProject, currentUser, onSelectTask, project, projectId }: TasksSectionProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const tasks = project.tasks || [];

  const handleStatusChange = async (task: Task, nextStatus: string) => {
    setUpdatingId(task.id);
    try {
      await api.updateTask(task.id, { ...task, status: nextStatus as Task['status'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ProjectSection title="Project tasks" description="Track ownership, due dates, and delivery status." actionLabel={canManageProject ? 'Add task' : null} onAction={() => setIsCreateOpen(true)}>
      <div className="task-view-toolbar" style={{ marginBottom: 16 }}>
        <div className="segmented-control" aria-label="Task view">
          <button className={view === 'list' ? 'is-active' : ''} type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button className={view === 'kanban' ? 'is-active' : ''} type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')}>Kanban</button>
        </div>
      </div>
      {tasks.length ? (
        view === 'list' ? (
          <div className="detail-list">
            {tasks.map((task) => (
              <div className="detail-list-row" key={task.id}>
                <span className={`task-check status-${task.status}`} />
                <button className="detail-list-copy detail-list-link" type="button" onClick={() => onSelectTask(task.id)}>
                  <strong>{task.title}</strong>
                  <small>{task.owner || task.assignee_name || 'Unassigned'} · {formatDate(task.due_date)}</small>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <TaskKanbanBoard
            currentUser={currentUser}
            tasks={tasks}
            updatingId={updatingId}
            onSelectTask={onSelectTask}
            onStatusChange={handleStatusChange}
          />
        )
      ) : (
        <EmptyState icon="check" title="No tasks yet" message="No tasks are visible for this project." />
      )}
      {isCreateOpen && <TaskDialog project={project} projectId={projectId} onClose={() => setIsCreateOpen(false)} />}
    </ProjectSection>
  );
}

interface MilestonesSectionProps {
  canManageProject: boolean;
  project: Project;
  projectId: number;
}

function MilestonesSection({ canManageProject, project, projectId }: MilestonesSectionProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);

  const deleteMilestone = useMutation({
    mutationFn: (id: number) => api.deleteMilestone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      setDeleteTarget(null);
    },
  });

  return (
    <ProjectSection title="Project milestones" description="Organize tasks around significant delivery targets." actionLabel={canManageProject ? 'Add milestone' : null} onAction={() => setIsCreateOpen(true)}>
      {project.milestones?.length ? (
        <div className="detail-list">
          {project.milestones.map((milestone) => {
            const tasks = project.tasks?.filter((task) => task.milestone_id === milestone.id) || [];
            const done = tasks.filter((task) => task.status === 'done').length;
            const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            return (
              <div className="detail-list-row" key={milestone.id}>
                <span className="milestone-mark" />
                <span className="detail-list-copy">
                  <strong>{milestone.title}</strong>
                  <small>{formatDate(milestone.target_date)} · {milestone.status?.replaceAll('_', ' ') || 'Not started'}</small>
                </span>
                <span className="mini-progress"><span style={{ width: `${progress}%` }} /></span>
                <strong className="progress-number">{progress}%</strong>
                {canManageProject && (
                  <div className="milestone-actions">
                    <button className="text-button" type="button" onClick={() => setEditTarget(milestone)}>Edit</button>
                    <button className="text-button text-button-danger" type="button" onClick={() => setDeleteTarget(milestone)}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="calendar" title="No milestones yet" message="Milestone management is enabled through the secured API." />
      )}
      {isCreateOpen && <MilestoneDialog projectId={projectId} onClose={() => setIsCreateOpen(false)} />}
      {editTarget && <MilestoneDialog projectId={projectId} milestone={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete milestone"
          description={`Are you sure you want to delete "${deleteTarget.title}"? Tasks linked to it will be unlinked.`}
          confirmLabel="Delete"
          isPending={deleteMilestone.isPending}
          onConfirm={() => deleteMilestone.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </ProjectSection>
  );
}

interface LinksSectionProps {
  canManageProject: boolean;
  projectId: number;
  project: Project;
}

function LinksSection({ canManageProject, projectId }: LinksSectionProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectLink | null>(null);

  const linksQuery = useQuery({
    queryKey: queryKeys.projectLinks(projectId),
    queryFn: ({ signal }) => api.listLinks(projectId, signal),
  });

  const deleteLink = useMutation({
    mutationFn: ({ linkId }: { linkId: number }) => api.deleteLink(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectLinks(projectId) });
      setDeleteTarget(null);
    },
  });

  const links = linksQuery.data || [];

  return (
    <ProjectSection title="Project links" description="External resources and documentation." actionLabel={canManageProject ? 'Add link' : null} onAction={() => setIsCreateOpen(true)}>
      {linksQuery.isLoading ? (
        <div className="loading-state"><span className="spinner" />Loading links…</div>
      ) : links.length ? (
        <div className="detail-list">
          {links.map((link) => (
            <div className="detail-list-row" key={link.id}>
              <Icon name="external" size={16} />
              <span className="detail-list-copy">
                <a href={link.url} target="_blank" rel="noopener noreferrer"><strong>{link.label || link.title || link.url}</strong></a>
                <small>{link.link_type || 'External link'}</small>
              </span>
              {canManageProject && (
                <div className="milestone-actions">
                  <button className="text-button" type="button" onClick={() => setEditTarget(link)}>Edit</button>
                  <button className="text-button text-button-danger" type="button" onClick={() => setDeleteTarget(link)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="external" title="No links" message="Add external resources for quick access." />
      )}
      {isCreateOpen && <LinkDialog projectId={projectId} onClose={() => setIsCreateOpen(false)} />}
      {editTarget && <LinkDialog projectId={projectId} link={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete link"
          description={`Are you sure you want to remove "${deleteTarget.label || deleteTarget.url}"?`}
          confirmLabel="Delete"
          isPending={deleteLink.isPending}
          onConfirm={() => deleteLink.mutate({ linkId: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </ProjectSection>
  );
}

interface RisksIssuesSectionProps {
  canManageProject: boolean;
  currentUser: User;
  project: Project;
  projectId: number;
}

interface RiskOrIssue extends Risk {
  _type: 'risk' | 'issue';
}

function RisksIssuesSection({ canManageProject, currentUser, project, projectId }: RisksIssuesSectionProps) {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('risks');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RiskOrIssue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RiskOrIssue | null>(null);

  const risksQuery = useQuery({
    queryKey: queryKeys.projectRisks(projectId),
    queryFn: ({ signal }) => api.listRisks(projectId, signal),
  });

  const issuesQuery = useQuery({
    queryKey: queryKeys.projectIssues(projectId),
    queryFn: ({ signal }) => api.listIssues(projectId, signal),
  });

  const deleteRisk = useMutation({
    mutationFn: (id: number) => api.deleteRisk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectRisks(projectId) });
      setDeleteTarget(null);
    },
  });

  const deleteIssue = useMutation({
    mutationFn: (id: number) => api.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectIssues(projectId) });
      setDeleteTarget(null);
    },
  });

  const risks = risksQuery.data || [];
  const issues = issuesQuery.data || [];
  const canManage = canManageProject || canManageRisk(currentUser, project) || canManageIssue(currentUser, project);

  return (
    <>
      <div className="project-tabs" aria-label="Risk and issue sections" style={{ padding: '4px 0' }}>
        <button className={activeSubTab === 'risks' ? 'is-active' : ''} type="button" onClick={() => setActiveSubTab('risks')}>Risks <span>{risks.length}</span></button>
        <button className={activeSubTab === 'issues' ? 'is-active' : ''} type="button" onClick={() => setActiveSubTab('issues')}>Issues <span>{issues.length}</span></button>
      </div>
      <ProjectSection
        title={activeSubTab === 'risks' ? 'Project risks' : 'Project issues'}
        description={activeSubTab === 'risks' ? 'Identified risks and their mitigation status.' : 'Active issues requiring resolution.'}
        actionLabel={canManage ? `Add ${activeSubTab === 'risks' ? 'risk' : 'issue'}` : null}
        onAction={() => setIsCreateOpen(true)}
      >
        {activeSubTab === 'risks' ? (
          risksQuery.isLoading ? (
            <div className="loading-state"><span className="spinner" />Loading risks…</div>
          ) : risks.length ? (
            <div className="detail-list">
              {risks.map((risk) => (
                <div className="detail-list-row" key={risk.id}>
                  <span className={`priority-mark priority-${risk.severity || 'medium'}`} />
                  <span className="detail-list-copy">
                    <strong>{risk.title}</strong>
                    <small>{risk.severity || 'Medium'} severity · {risk.probability || 'Medium'} probability · {risk.status || 'open'}</small>
                  </span>
                  {canManage && (
                    <div className="milestone-actions">
                      <button className="text-button" type="button" onClick={() => setEditTarget({ ...risk, _type: 'risk' })}>Edit</button>
                      <button className="text-button text-button-danger" type="button" onClick={() => setDeleteTarget({ ...risk, _type: 'risk' })}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="alert" title="No risks identified" message="Risks will appear here when they are logged against this project." />
          )
        ) : (
          issuesQuery.isLoading ? (
            <div className="loading-state"><span className="spinner" />Loading issues…</div>
          ) : issues.length ? (
            <div className="detail-list">
              {issues.map((issue) => (
                <div className="detail-list-row" key={issue.id}>
                  <span className={`priority-mark priority-${issue.severity || 'medium'}`} />
                  <span className="detail-list-copy">
                    <strong>{issue.title}</strong>
                    <small>{issue.severity || 'Medium'} severity · {issue.status || 'open'}</small>
                  </span>
                  {canManage && (
                    <div className="milestone-actions">
                      <button className="text-button" type="button" onClick={() => setEditTarget({ ...issue, _type: 'issue' })}>Edit</button>
                      <button className="text-button text-button-danger" type="button" onClick={() => setDeleteTarget({ ...issue, _type: 'issue' })}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="alert" title="No issues reported" message="Issues will appear here when they are logged against this project." />
          )
        )}
      </ProjectSection>

      {isCreateOpen && activeSubTab === 'risks' && <RiskDialog projectId={projectId} project={project} onClose={() => setIsCreateOpen(false)} />}
      {isCreateOpen && activeSubTab === 'issues' && <IssueDialog projectId={projectId} project={project} onClose={() => setIsCreateOpen(false)} />}
      {editTarget?._type === 'risk' && <RiskDialog projectId={projectId} project={project} risk={editTarget} onClose={() => setEditTarget(null)} />}
      {editTarget?._type === 'issue' && <IssueDialog projectId={projectId} project={project} issue={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget?._type === 'risk' && (
        <ConfirmDialog
          title="Delete risk"
          description={`Are you sure you want to delete "${deleteTarget.title}"?`}
          confirmLabel="Delete"
          isPending={deleteRisk.isPending}
          onConfirm={() => deleteRisk.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
      {deleteTarget?._type === 'issue' && (
        <ConfirmDialog
          title="Delete issue"
          description={`Are you sure you want to delete "${deleteTarget.title}"?`}
          confirmLabel="Delete"
          isPending={deleteIssue.isPending}
          onConfirm={() => deleteIssue.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </>
  );
}

interface TeamSectionProps {
  project: Project;
  canManageProject: boolean;
  onAdd: () => void;
}

function TeamSection({ project, canManageProject, onAdd }: TeamSectionProps) {
  return (
    <ProjectSection title="Project team" description="The people who can access and contribute to this project." actionLabel={canManageProject ? 'Add member' : null} onAction={onAdd}>
      {project.team_members?.length ? (
        <div className="detail-list">
          {project.team_members.map((member) => (
            <div className="detail-list-row" key={member.id}>
              <span className="avatar">{getInitials(member.name)}</span>
              <span className="detail-list-copy">
                <strong>{member.name}</strong>
                <small>{member.email || 'No email added'}</small>
              </span>
              <span className="role-pill">{member.project_role === 'project_lead' ? 'Project lead' : 'Member'}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="users" title="No team members yet" message="No project members are visible." />
      )}
    </ProjectSection>
  );
}

interface MilestoneRowsProps {
  project: Project;
}

function MilestoneRows({ project }: MilestoneRowsProps) {
  return (
    <div className="detail-list">
      {project.milestones!.map((milestone) => {
        const tasks = project.tasks?.filter((task) => task.milestone_id === milestone.id) || [];
        const done = tasks.filter((task) => task.status === 'done').length;
        const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
        return (
          <div className="detail-list-row" key={milestone.id}>
            <span className="milestone-mark" />
            <span className="detail-list-copy">
              <strong>{milestone.title}</strong>
              <small>{formatDate(milestone.target_date)} · {milestone.status?.replaceAll('_', ' ') || 'Not started'}</small>
            </span>
            <span className="mini-progress"><span style={{ width: `${progress}%` }} /></span>
            <strong className="progress-number">{progress}%</strong>
          </div>
        );
      })}
    </div>
  );
}

interface FinanceSectionProps {
  projectId: number;
}

function FinanceSection({ projectId }: FinanceSectionProps) {
  const queryClient = useQueryClient();
  const [isBudgetLineOpen, setIsBudgetLineOpen] = useState(false);
  const [isSpendOpen, setIsSpendOpen] = useState(false);
  const [editBudgetLine, setEditBudgetLine] = useState<BudgetLine | null>(null);
  const [editSpend, setEditSpend] = useState<SpendRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ _type: string; id: number; category?: string; name?: string; amount: number } | null>(null);

  const summaryQuery = useQuery({
    queryKey: queryKeys.projectFinancialSummary(projectId),
    queryFn: ({ signal }) => api.getFinancialSummary(projectId, signal),
  });

  const budgetLinesQuery = useQuery({
    queryKey: queryKeys.projectBudgetLines(projectId),
    queryFn: ({ signal }) => api.listBudgetLines(projectId, signal),
  });

  const spendRecordsQuery = useQuery({
    queryKey: queryKeys.projectSpendRecords(projectId),
    queryFn: ({ signal }) => api.listSpendRecords(projectId, signal),
  });

  const deleteBudgetLine = useMutation({
    mutationFn: (id: number) => api.deleteBudgetLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectBudgetLines(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectFinancialSummary(projectId) });
      setDeleteTarget(null);
    },
  });

  const deleteSpendRecord = useMutation({
    mutationFn: (id: number) => api.deleteSpendRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSpendRecords(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectFinancialSummary(projectId) });
      setDeleteTarget(null);
    },
  });

  const summary = summaryQuery.data;
  const budgetLines = budgetLinesQuery.data || [];
  const spendRecords = spendRecordsQuery.data || [];
  const allocated = summary?.budget_allocated_amount ?? budgetLines.reduce((sum, line) => sum + line.planned_amount, 0);
  const spent = summary?.total_spent ?? spendRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const remaining = allocated - spent;
  const variance = allocated > 0 ? Math.round(((remaining / allocated) * 100)) : 0;

  return (
    <div className="finance-section">
      <div className="finance-summary-grid">
        <div className="project-stat"><strong>{formatCurrency(allocated)}</strong><span>Allocated budget</span></div>
        <div className="project-stat"><strong>{formatCurrency(spent)}</strong><span>Total spent</span></div>
        <div className="project-stat"><strong>{formatCurrency(remaining)}</strong><span>Remaining</span></div>
        <div className="project-stat"><strong>{variance}%</strong><span>Variance</span></div>
      </div>

      <div className="project-section-card">
        <div className="section-header">
          <div><span className="eyebrow">Financial tracking</span><h2>Budget lines</h2><p>Allocated funds by category.</p></div>
          <button className="button button-secondary button-small" type="button" onClick={() => setIsBudgetLineOpen(true)}><Icon name="plus" size={14} />Add budget line</button>
        </div>
        {budgetLinesQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />Loading…</div>
        ) : budgetLines.length ? (
          <div className="detail-list">
            {budgetLines.map((line) => (
              <div className="detail-list-row" key={line.id}>
                <span className="detail-list-copy">
                  <strong>{line.category}</strong>
                  <small>{formatCurrency(line.planned_amount, line.currency)} · {line.note || 'No note'}</small>
                </span>
                <div className="milestone-actions">
                  <button className="text-button" type="button" onClick={() => setEditBudgetLine(line)}>Edit</button>
                  <button className="text-button text-button-danger" type="button" onClick={() => setDeleteTarget({ _type: 'budgetLine', id: line.id, category: line.category, amount: line.planned_amount })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="projects" title="No budget lines" message="Create budget lines to track allocated funds by category." />
        )}
      </div>

      <div className="project-section-card" style={{ marginTop: '12px' }}>
        <div className="section-header">
          <div><span className="eyebrow">Financial tracking</span><h2>Spend records</h2><p>Actual expenditures against budget lines.</p></div>
          <button className="button button-secondary button-small" type="button" onClick={() => setIsSpendOpen(true)}><Icon name="plus" size={14} />Record spend</button>
        </div>
        {spendRecordsQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />Loading…</div>
        ) : spendRecords.length ? (
          <div className="detail-list">
            {spendRecords.map((record) => (
              <div className="detail-list-row" key={record.id}>
                <span className="detail-list-copy">
                  <strong>{record.description || record.category || 'Spend record'}</strong>
                  <small>{formatCurrency(record.amount)} · {record.spend_date || record.effective_date || 'No date'}</small>
                </span>
                <div className="milestone-actions">
                  <button className="text-button" type="button" onClick={() => setEditSpend(record)}>Edit</button>
                  <button className="text-button text-button-danger" type="button" onClick={() => setDeleteTarget({ _type: 'spend', ...record })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="projects" title="No spend records" message="Record expenditures to track actual spending against your budget." />
        )}
      </div>

      {isBudgetLineOpen && <BudgetLineDialog projectId={projectId} onClose={() => setIsBudgetLineOpen(false)} />}
      {editBudgetLine && <BudgetLineDialog projectId={projectId} budgetLine={editBudgetLine} onClose={() => setEditBudgetLine(null)} />}
      {isSpendOpen && <SpendRecordDialog projectId={projectId} onClose={() => setIsSpendOpen(false)} />}
      {editSpend && <SpendRecordDialog projectId={projectId} record={editSpend} onClose={() => setEditSpend(null)} />}
      {deleteTarget?._type === 'budgetLine' && (
        <ConfirmDialog title="Delete budget line" description={`Delete "${deleteTarget.category}"?`} confirmLabel="Delete" isPending={deleteBudgetLine.isPending} onConfirm={() => deleteBudgetLine.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} variant="danger" />
      )}
      {deleteTarget?._type === 'spend' && (
        <ConfirmDialog title="Delete spend record" description={`Delete this spend record of ${formatCurrency(deleteTarget.amount)}?`} confirmLabel="Delete" isPending={deleteSpendRecord.isPending} onConfirm={() => deleteSpendRecord.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} variant="danger" />
      )}
    </div>
  );
}

interface BudgetLineDialogProps {
  budgetLine?: BudgetLine;
  projectId: number;
  onClose: () => void;
}

function BudgetLineDialog({ budgetLine, projectId, onClose }: BudgetLineDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(budgetLine);
  const [form, setForm] = useState({
    category: budgetLine?.category || '',
    planned_amount: budgetLine?.planned_amount || '',
    currency: budgetLine?.currency || 'USD',
    effective_date: budgetLine?.effective_date || new Date().toISOString().slice(0, 10),
    note: budgetLine?.note || '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: import('../types/api.js').CreateBudgetLinePayload) => isEditing ? api.updateBudgetLine(budgetLine!.id, data) : api.createBudgetLine(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectBudgetLines(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectFinancialSummary(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.category.trim() || !form.planned_amount || !form.effective_date) { setError('Category, amount, and effective date are required.'); return; }
    saveMutation.mutate({ ...form, planned_amount: Number(form.planned_amount) });
  };

  return (
    <DialogShell title={isEditing ? 'Edit budget line' : 'Add budget line'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="bl-category">Category</label><input id="bl-category" required value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} placeholder="e.g. Infrastructure" /></div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="bl-amount">Amount</label><input id="bl-amount" type="number" min="0" step="0.01" required value={form.planned_amount} onChange={(e) => setForm((current) => ({ ...current, planned_amount: e.target.value }))} /></div>
          <div className="field-group"><label htmlFor="bl-currency">Currency</label><input id="bl-currency" required maxLength={3} value={form.currency} onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))} placeholder="USD" /></div>
        </div>
        <div className="field-group"><label htmlFor="bl-date">Effective date</label><input id="bl-date" type="date" required value={form.effective_date} onChange={(e) => setForm((current) => ({ ...current, effective_date: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="bl-note">Note</label><textarea id="bl-note" value={form.note} onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))} placeholder="What is this budget allocated for?" /></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

interface SpendRecordDialogProps {
  projectId: number;
  record?: SpendRecord;
  onClose: () => void;
}

function SpendRecordDialog({ projectId, record, onClose }: SpendRecordDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(record);
  const [form, setForm] = useState({
    amount: record?.amount || '',
    category: record?.category || '',
    description: record?.description || '',
    spend_date: record?.spend_date || record?.effective_date || '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: { amount: number; category: string; description: string; spend_date: string; project_id: number }) => isEditing ? api.updateSpendRecord(record!.id, data) : api.createSpendRecord(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSpendRecords(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectFinancialSummary(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.amount) { setError('Amount is required.'); return; }
    saveMutation.mutate({ ...form, project_id: projectId, amount: Number(form.amount) });
  };

  return (
    <DialogShell title={isEditing ? 'Edit spend record' : 'Record spend'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-row">
          <div className="field-group"><label htmlFor="sp-amount">Amount ($)</label><input id="sp-amount" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} /></div>
          <div className="field-group"><label htmlFor="sp-date">Date</label><input id="sp-date" type="date" value={form.spend_date} onChange={(e) => setForm((c) => ({ ...c, spend_date: e.target.value }))} /></div>
        </div>
        <div className="field-group"><label htmlFor="sp-category">Category</label><input id="sp-category" value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} placeholder="e.g. Cloud services" /></div>
        <div className="field-group"><label htmlFor="sp-desc">Description</label><textarea id="sp-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="What was this spend for?" /></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

function formatCurrency(amount: number, currency = 'USD') {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

interface ProjectSectionProps {
  actionLabel: string | null;
  children: React.ReactNode;
  description: string;
  onAction?: () => void;
  title: string;
}

function ProjectSection({ actionLabel, children, description, onAction, title }: ProjectSectionProps) {
  return (
    <section className="project-section-card">
      <div className="section-header">
        <div>
          <span className="eyebrow">Project workspace</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {actionLabel && <button className="button button-secondary button-small" type="button" onClick={onAction}><Icon name="plus" size={14} />{actionLabel}</button>}
      </div>
      {children}
    </section>
  );
}

interface ProjectStatProps {
  label: string;
  value: number;
}

function ProjectStat({ label, value }: ProjectStatProps) { return <div className="project-stat"><strong>{value}</strong><span>{label}</span></div>; }

interface TabCountProps {
  project: Project;
  tab: string;
}

function TabCount({ project, tab }: TabCountProps) {
  const count = tab === 'Tasks' ? project.tasks?.length : tab === 'Milestones' ? project.milestones?.length : tab === 'Team' ? project.team_members?.length : null;
  return count == null ? null : <span>{count}</span>;
}

interface ProjectErrorProps {
  error: Error | null;
  onBack: () => void;
  onMenu: () => void;
}

function ProjectError({ error, onBack, onMenu }: ProjectErrorProps) {
  return (
    <>
      <header className="project-breadcrumb-bar">
        <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={onMenu}><Icon name="menu" /></button>
        <button className="text-button" type="button" onClick={onBack}>Projects</button>
      </header>
      <div className="project-error">
        <EmptyState icon="alert" title="Project unavailable" message={error?.message || 'This project could not be loaded.'} action={<button className="button button-secondary" type="button" onClick={onBack}>Back to all projects</button>} />
      </div>
    </>
  );
}

interface CreateProjectItemFormProps {
  onCancel: () => void;
  onCreated: () => void;
  project: Project;
  type: string;
}

function CreateProjectItemForm({ onCancel, onCreated, project, type }: CreateProjectItemFormProps) {
  const initialValues = useMemo(() => getInitialValues(type), [type]);
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateField = (key: string) => (eventOrValue: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | string | number | null) => {
    const value = eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue ? eventOrValue.target.value : eventOrValue;
    setForm((current) => ({ ...current, [key]: value }));
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try { await createProjectItem(type, project.id, form); await onCreated(); } catch (submissionError) { setError((submissionError as Error).message); } finally { setIsSubmitting(false); }
  };

  return (
    <form className="inline-create-form project-inline-form" onSubmit={handleSubmit}>
      <div className="section-header compact">
        <div><span className="eyebrow">Quick add</span><h3>{getCreateTitle(type)}</h3></div>
        <button className="icon-button" type="button" aria-label="Close form" onClick={onCancel}><Icon name="close" size={14} /></button>
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {type === 'milestone' && <MilestoneFields form={form} updateField={updateField} />}
      {type === 'member' && <MemberFields form={form} updateField={updateField} />}
      <div className="dialog-actions">
        <button className="button button-secondary button-small" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button-primary button-small" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

interface MilestoneFieldsProps {
  form: InitialValues;
  updateField: (key: string) => (eventOrValue: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | string | number | null) => void;
}

function MilestoneFields({ form, updateField }: MilestoneFieldsProps) {
  return (
    <>
      <div className="field-group"><label htmlFor="milestone-title">Milestone title</label><input id="milestone-title" required value={form.title as string} onChange={updateField('title')} /></div>
      <div className="field-group"><label htmlFor="milestone-date">Target date</label><input id="milestone-date" type="date" value={form.target_date as string} onChange={updateField('target_date')} /></div>
    </>
  );
}

interface MemberFieldsProps {
  form: InitialValues;
  updateField: (key: string) => (eventOrValue: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | string | number | null) => void;
}

function MemberFields({ form, updateField }: MemberFieldsProps) {
  const usersQuery = useQuery({ queryKey: queryKeys.users(), queryFn: ({ signal }) => api.listUsers({ signal }) });
  return (
    <>
      <div className="field-group"><label htmlFor="member-user">Team member</label><select id="member-user" required value={form.user_id as string} onChange={(event) => updateField('user_id')(Number(event.target.value))}><option value="">Select a user</option>{(usersQuery.data || []).filter((user) => user.status === 'active').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div>
      <div className="field-group"><label htmlFor="member-role">Project role</label><select id="member-role" value={form.project_role as string} onChange={updateField('project_role')}><option value="member">Member</option><option value="project_lead">Project lead</option></select></div>
    </>
  );
}

interface InitialValues {
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  milestone_id?: number | null;
  assignee_user_id?: number | null;
  target_date?: string;
  status?: string;
  user_id?: string;
  project_role?: string;
}

function getInitialValues(type: string): InitialValues {
  if (type === 'milestone') return { title: '', target_date: '', status: 'not_started' };
  return { user_id: '', project_role: 'member' };
}

function getCreateTitle(type: string) {
  return type === 'milestone' ? 'Create milestone' : 'Add team member';
}

function createProjectItem(type: string, projectId: number, form: InitialValues) {
  if (type === 'milestone') return api.createMilestone(projectId, { ...form, project_id: projectId, status: (form.status || 'not_started') as MilestoneStatus } as CreateMilestonePayload);
  return api.addProjectMember(projectId, { user_id: Number(form.user_id), project_role: (form.project_role || 'member') as ProjectRole });
}

interface TaskDialogProps {
  onClose: () => void;
  project: Project;
  projectId: number;
}

function TaskDialog({ onClose, project, projectId }: TaskDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    due_date: '',
    milestone_id: null as number | null,
    assignee_user_id: null as number | null,
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title="Create task" description="Add the details for this task." onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="task-title">Task title</label><input id="task-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="task-description">Description</label><textarea id="task-description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Add context, expected outcome, or links…" /></div>
        <div className="field-group"><label htmlFor="task-priority">Priority</label><select id="task-priority" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value as Priority }))}>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field-row"><div className="field-group"><label htmlFor="task-date">Due date</label><input id="task-date" type="date" value={form.due_date} onChange={(e) => setForm((c) => ({ ...c, due_date: e.target.value }))} /></div><div className="field-group"><label htmlFor="task-milestone">Milestone</label><select id="task-milestone" value={form.milestone_id || ''} onChange={(e) => setForm((c) => ({ ...c, milestone_id: e.target.value ? Number(e.target.value) : null }))}><option value="">No milestone</option>{(project.milestones || []).map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></div></div>
        <div className="field-group"><label htmlFor="task-assignee">Assignee</label><select id="task-assignee" value={form.assignee_user_id || ''} onChange={(e) => setForm((c) => ({ ...c, assignee_user_id: e.target.value ? Number(e.target.value) : null }))}><option value="">Unassigned</option>{(project.team_members || []).map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

interface MilestoneDialogProps {
  milestone?: Milestone;
  projectId: number;
  onClose: () => void;
}

function MilestoneDialog({ milestone, projectId, onClose }: MilestoneDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(milestone);
  const [form, setForm] = useState({
    title: milestone?.title || '',
    target_date: milestone?.target_date || '',
    status: milestone?.status || 'not_started',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: { title: string; target_date: string; status: MilestoneStatus; project_id: number }) => isEditing ? api.updateMilestone(milestone!.id, data) : api.createMilestone(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? 'Edit milestone' : 'Create milestone'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="ms-title">Title</label><input id="ms-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="ms-date">Target date</label><input id="ms-date" type="date" value={form.target_date} onChange={(e) => setForm((c) => ({ ...c, target_date: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="ms-status">Status</label><select id="ms-status" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as MilestoneStatus }))}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

interface LinkDialogProps {
  link?: ProjectLink;
  projectId: number;
  onClose: () => void;
}

function LinkDialog({ link, projectId, onClose }: LinkDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(link);
  const [form, setForm] = useState({
    label: link?.label || link?.title || '',
    url: link?.url || '',
    link_type: link?.link_type || '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: { label: string; url: string; link_type: string; project_id: number }) => isEditing ? api.updateLink(projectId, link!.id, data) : api.createLink(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectLinks(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.url.trim()) { setError('URL is required.'); return; }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? 'Edit link' : 'Add link'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="link-label">Label</label><input id="link-label" value={form.label} onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))} placeholder="e.g. GitHub repo" /></div>
        <div className="field-group"><label htmlFor="link-url">URL</label><input id="link-url" type="url" required value={form.url} onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))} placeholder="https://..." /></div>
        <div className="field-group"><label htmlFor="link-type">Type</label><input id="link-type" value={form.link_type} onChange={(e) => setForm((c) => ({ ...c, link_type: e.target.value }))} placeholder="e.g. Documentation" /></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

interface RiskDialogProps {
  onClose: () => void;
  project: Project;
  projectId: number;
  risk?: Risk;
}

function RiskDialog({ onClose, project, projectId, risk }: RiskDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(risk);
  const [form, setForm] = useState({
    title: risk?.title || '',
    description: risk?.description || '',
    severity: risk?.severity || 'medium',
    probability: risk?.probability || 'medium',
    status: risk?.status || 'open',
    mitigation_note: risk?.mitigation_note || '',
    mitigation_progress: risk?.mitigation_progress ?? 0,
    owner_user_id: risk?.owner_user_id || '',
    due_date: risk?.due_date || '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => isEditing ? api.updateRisk(risk!.id, data as Partial<Risk>) : api.createRisk(projectId, data as Omit<Risk, 'id' | 'project_id'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectRisks(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? 'Edit risk' : 'Log risk'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="risk-title">Title</label><input id="risk-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="risk-desc">Description</label><textarea id="risk-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Describe the risk…" /></div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="risk-severity">Severity</label><select id="risk-severity" value={form.severity} onChange={(e) => setForm((c) => ({ ...c, severity: e.target.value as RiskSeverity }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          <div className="field-group"><label htmlFor="risk-prob">Probability</label><select id="risk-prob" value={form.probability} onChange={(e) => setForm((c) => ({ ...c, probability: e.target.value as RiskProbability }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very high</option></select></div>
        </div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="risk-status">Status</label><select id="risk-status" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as RiskStatus }))}><option value="open">Open</option><option value="mitigating">Mitigating</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option></select></div>
          <div className="field-group"><label htmlFor="risk-date">Due date</label><input id="risk-date" type="date" value={form.due_date} onChange={(e) => setForm((c) => ({ ...c, due_date: e.target.value }))} /></div>
        </div>
        <div className="field-group"><label htmlFor="risk-owner">Owner</label><select id="risk-owner" value={form.owner_user_id} onChange={(e) => setForm((c) => ({ ...c, owner_user_id: e.target.value ? Number(e.target.value) : '' }))}><option value="">Unassigned</option>{(project?.team_members || []).map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></div>
        <div className="field-group"><label htmlFor="risk-mitigation">Mitigation plan</label><textarea id="risk-mitigation" value={form.mitigation_note} onChange={(e) => setForm((c) => ({ ...c, mitigation_note: e.target.value }))} placeholder="How will this risk be addressed?" /></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}

interface IssueDialogProps {
  issue?: Issue;
  onClose: () => void;
  project: Project;
  projectId: number;
}

function IssueDialog({ issue, onClose, project, projectId }: IssueDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(issue);
  const [form, setForm] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    priority: issue?.severity || 'medium',
    status: issue?.status || 'open',
    resolution_note: '',
    resolution_progress: 0,
    owner_user_id: '',
    target_resolution_date: '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => isEditing ? api.updateIssue(issue!.id, data as Partial<Issue>) : api.createIssue(projectId, data as Omit<Issue, 'id' | 'project_id'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectIssues(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? 'Edit issue' : 'Report issue'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="issue-title">Title</label><input id="issue-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="issue-desc">Description</label><textarea id="issue-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Describe the issue…" /></div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="issue-priority">Priority</label><select id="issue-priority" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value as RiskSeverity }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          <div className="field-group"><label htmlFor="issue-status">Status</label><select id="issue-status" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as IssueStatus }))}><option value="open">Open</option><option value="mitigating">Mitigating</option><option value="escalated">Escalated</option><option value="resolved">Resolved</option></select></div>
        </div>
        <div className="field-group"><label htmlFor="issue-owner">Owner</label><select id="issue-owner" value={form.owner_user_id} onChange={(e) => setForm((c) => ({ ...c, owner_user_id: e.target.value }))}><option value="">Unassigned</option>{(project?.team_members || []).map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></div>
        <div className="field-group"><label htmlFor="issue-date">Target resolution date</label><input id="issue-date" type="date" value={form.target_resolution_date} onChange={(e) => setForm((c) => ({ ...c, target_resolution_date: e.target.value }))} /></div>
        <div className="field-group"><label htmlFor="issue-resolution">Resolution notes</label><textarea id="issue-resolution" value={form.resolution_note} onChange={(e) => setForm((c) => ({ ...c, resolution_note: e.target.value }))} placeholder="How was this issue resolved?" /></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save'}</button></footer>
      </form>
    </DialogShell>
  );
}
