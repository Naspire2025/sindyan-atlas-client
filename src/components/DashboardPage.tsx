import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { DashboardOverview, DashboardAttentionItem, Project, Task } from '../types/api.js';
import { formatDate, getProjectHealth, isPastDate, isProjectOverdue } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import type { MessageId } from '../i18n/messages/en.js';


import PageHeader from './PageHeader.js';
import ProjectTable from './ProjectTable.js';
import SummaryBar from './SummaryBar.js';
import { ChevronDown, CircleCheck, Layers, Search, TriangleAlert } from 'lucide-react';

const HEALTH_MESSAGE_IDS: Record<string, MessageId> = {
  on_track: 'health.onTrack',
  at_risk: 'health.atRisk',
  behind: 'health.behind',
  complete: 'health.complete',
  no_update: 'health.noUpdate',
};

function formatHealthLabel(intl: ReturnType<typeof useIntl>, health: string): string {
  return intl.formatMessage({ id: HEALTH_MESSAGE_IDS[health] });
}

interface DashboardPageProps {
  projects: Project[];
  tasks: Task[];
  onMenu: () => void;
  onNavigate: (page: string, filter?: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectRisk?: (riskId: string) => void;
  onSelectIssue?: (issueId: string) => void;
}

interface AttentionItem {
  key: string | number;
  projectId?: string;
  taskId?: string;
  riskId?: string;
  issueId?: string;
  milestoneId?: string;
  title: string;
  detail: string;
  tone: 'danger' | 'warning';
}

export default function DashboardPage({ projects, tasks, onMenu, onNavigate, onSelectProject, onSelectTask, onSelectRisk, onSelectIssue }: DashboardPageProps) {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const overviewQuery = useQuery({
    queryKey: queryKeys.dashboardOverview,
    queryFn: ({ signal }) => api.getDashboardOverview(signal),
  });
  const attentionQuery = useQuery({
    queryKey: queryKeys.dashboardAttention,
    queryFn: ({ signal }) => api.getDashboardAttention(signal),
  });

  const overview = overviewQuery.data || ({} as DashboardOverview);
  const serverAttention = attentionQuery.data || ([] as DashboardAttentionItem[]);
  const clientAttention = buildAttentionItems(projects, tasks, intl);
  const attentionItems = serverAttention.length > 0
    ? serverAttention.map((item, index) => ({
        key: item.id || `attention-${index}`,
        projectId: item.project_id,
        taskId: item.item_type === 'task' ? item.id : undefined,
        riskId: item.item_type === 'risk' ? item.id : undefined,
        issueId: item.item_type === 'issue' ? item.id : undefined,
        milestoneId: item.item_type === 'milestone' ? item.id : undefined,
        title: item.title || item.name || intl.formatMessage({ id: 'dashboard.attentionRequired' }),
        detail: item.reason || item.description || item.detail || intl.formatMessage({ id: 'dashboard.requiresReview' }),
        tone: (item.severity === 'high' || item.severity === 'critical' ? 'danger' : 'warning') as 'danger' | 'warning',
      }))
    : clientAttention;

  const handleSummarySelect = (filter: string) => onNavigate('projects', filter);

  const highlightedProject = projects
    .filter((project) => project.status === 'active' && project.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

  const filteredProjects = projects.filter((project) => {
    if (statusFilter && project.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return `${project.name} ${project.description || ''} ${project.owner_name || ''}`.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow={intl.formatMessage({ id: 'dashboard.workspaceOverview' })}
        title={intl.formatMessage({ id: 'dashboard.greeting' }, { name: 'Admin' })}
        description={intl.formatMessage({ id: 'dashboard.attentionOverview' })}
        onMenu={onMenu}
        action={
          <button className="button button-secondary" type="button" onClick={() => onNavigate('projects')}>
            <Layers />
            {intl.formatMessage({ id: 'project.viewAll' })}
          </button>
        }
      />

      <div className="dashboard-toolbar">
        <label className="search-field">
          <Search />
          <span className="sr-only">{intl.formatMessage({ id: 'common.search' })}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={intl.formatMessage({ id: 'common.search' })} />
        </label>
        <label className="select-field">
          <span className="sr-only">{intl.formatMessage({ id: 'project.filterByStatus' })}</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{intl.formatMessage({ id: 'project.filterAll' })}</option>
            <option value="active">{intl.formatMessage({ id: 'status.project.active' })}</option>
            <option value="completed">{intl.formatMessage({ id: 'status.project.completed' })}</option>
            <option value="blocked">{intl.formatMessage({ id: 'status.project.blocked' })}</option>
            <option value="on_hold">{intl.formatMessage({ id: 'status.project.onHold' })}</option>
          </select>
        </label>
      </div>

      <SummaryBar
        projects={projects}
        overview={overview}
        onSelect={handleSummarySelect}
      />

      <section className="content-grid">
        <div className="panel attention-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">{intl.formatMessage({ id: 'dashboard.priorityQueue' })}</span>
              <h2>{intl.formatMessage({ id: 'dashboard.attentionRequired' })}</h2>
            </div>
            <span className="count-pill">{attentionItems.length}</span>
          </div>
          {attentionItems.length > 0 ? (
            <div className="attention-list">
              {attentionItems.slice(0, 5).map((item) => (
                <button
                  key={item.key}
                  className="attention-item"
                  type="button"
                  onClick={() => {
                    if (item.taskId) { onSelectTask(item.taskId); return; }
                    if (item.riskId && onSelectRisk) { onSelectRisk(item.riskId); return; }
                    if (item.issueId && onSelectIssue) { onSelectIssue(item.issueId); return; }
                    if (item.projectId) onSelectProject(item.projectId);
                  }}
                >
                  <span className={`attention-icon attention-${item.tone}`}>
                    <TriangleAlert size={15} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ChevronDown size={15} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CircleCheck}
              title={intl.formatMessage({ id: 'dashboard.everythingClear' })}
              message={intl.formatMessage({ id: 'dashboard.noAttentionDetail' })}
            />
          )}
        </div>

        <div className="panel health-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">{intl.formatMessage({ id: 'dashboard.portfolioSignal' })}</span>
              <h2>{intl.formatMessage({ id: 'dashboard.projectHealth' })}</h2>
            </div>
          </div>
          <HealthBreakdown projects={projects} />
        </div>
      </section>

      {highlightedProject && (
        <section className="panel highlighted-project-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">{intl.formatMessage({ id: 'dashboard.upcomingDeadline' })}</span>
              <h2>{intl.formatMessage({ id: 'dashboard.needsFocus' })}</h2>
            </div>
          </div>
          <button
            className="highlighted-project-card"
            type="button"
            onClick={() => onSelectProject(highlightedProject.id)}
          >
            <span className={`project-glyph priority-${highlightedProject.priority}`} />
            <span className="highlighted-project-info">
              <strong>{highlightedProject.name}</strong>
              <small>{intl.formatMessage({ id: 'dashboard.target' }, { date: formatDate(highlightedProject.deadline, intl) })} · {formatHealthLabel(intl, getProjectHealth(highlightedProject))}</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </section>
      )}

      <section className="panel portfolio-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">{intl.formatMessage({ id: 'dashboard.recentPortfolio' })}</span>
            <h2>{intl.formatMessage({ id: 'dashboard.projectPerformance' })}</h2>
          </div>
          <button className="text-button" type="button" onClick={() => onNavigate('projects')}>
            {intl.formatMessage({ id: 'project.viewAll' })} <ChevronDown size={14} />
          </button>
        </div>
        {filteredProjects.length > 0 ? (
          <ProjectTable projects={filteredProjects.slice(0, 6)} onSelect={onSelectProject} />
        ) : (
          <EmptyState
            title={intl.formatMessage({ id: 'state.noProjects' })}
            message={search || statusFilter ? intl.formatMessage({ id: 'common.adjustSearchFilters' }) : intl.formatMessage({ id: 'state.noProjectsMessage' })}
          />
        )}
      </section>
    </>
  );
}

interface HealthBreakdownProps {
  projects: Project[];
}

function HealthBreakdown({ projects }: HealthBreakdownProps) {
  const intl = useIntl();
  const totals = projects.reduce<Record<string, number>>((result, project) => {
    const health = getProjectHealth(project);
    result[health] = (result[health] ?? 0) + 1;
    return result;
  }, {});
  const rows: { key: string; label: MessageId | null }[] = [
    { key: 'on_track', label: 'health.onTrack' },
    { key: 'at_risk', label: 'health.atRisk' },
    { key: 'behind', label: 'health.behind' },
    { key: 'complete', label: 'health.complete' },
    { key: 'no_update', label: null },
  ];

  return (
    <div className="health-breakdown">
      {rows.map((row) => {
        const count = totals[row.key] ?? 0;
        const width = projects.length
          ? Math.max((count / projects.length) * 100, count ? 8 : 0)
          : 0;
        return (
          <div className="health-row" key={row.key}>
            <span className={`health health-${row.key}`}>
              <span />
              {row.label ? intl.formatMessage({ id: row.label }) : intl.formatMessage({ id: 'health.noForecast' })}
            </span>
            <span className="health-bar">
              <span
                className={`health-fill health-fill-${row.key}`}
                style={{ width: `${width}%` }}
              />
            </span>
            <strong>{count}</strong>
          </div>
        );
      })}
    </div>
  );
}

function buildAttentionItems(projects: Project[], tasks: Task[], intl: ReturnType<typeof useIntl>): AttentionItem[] {
  const overdueProjects = projects
    .filter(isProjectOverdue)
    .map((project) => ({
      key: `project-${project.id}`,
      projectId: project.id,
      title: intl.formatMessage({ id: 'dashboard.projectPastDeadline' }, { name: project.name }),
      detail: intl.formatMessage({ id: 'dashboard.reviewProjectPlan' }),
      tone: 'danger' as const,
    }));
  const blockedTasks = tasks
    .filter((task) => task.status === 'blocked')
    .map((task) => ({
      key: `task-${task.id}`,
      projectId: task.project_id,
      title: task.title,
      detail: `${task.project_name} · ${task.blocker_note || intl.formatMessage({ id: 'status.task.blocked' })}`,
      tone: 'warning' as const,
    }));
  const blockedTaskIds = new Set(blockedTasks.map((item) => item.key));
  const overdueTasks = tasks
    .filter((task) => task.status !== 'done' && isPastDate(task.due_date) && !blockedTaskIds.has(`task-${task.id}`))
    .map((task) => ({
      key: `task-${task.id}`,
      projectId: task.project_id,
      taskId: task.id,
      title: task.title,
      detail: intl.formatMessage({ id: 'dashboard.taskOverdueSince' }, { task: task.project_name, date: task.due_date }),
      tone: 'danger' as const,
    }));
  return [...overdueProjects, ...blockedTasks, ...overdueTasks];
}
