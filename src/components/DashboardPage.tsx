import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { DashboardOverview, DashboardAttentionItem, Project, Task } from '../types/api.js';
import { getProjectHealth, isPastDate, isProjectOverdue } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';
import ProjectTable from './ProjectTable.js';
import SummaryBar from './SummaryBar.js';

interface DashboardPageProps {
  projects: Project[];
  tasks: Task[];
  onMenu: () => void;
  onNavigate: (page: string, filter?: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
}

interface AttentionItem {
  key: string | number;
  projectId?: string;
  taskId?: string;
  title: string;
  detail: string;
  tone: 'danger' | 'warning';
}

export default function DashboardPage({ projects, tasks, onMenu, onNavigate, onSelectProject, onSelectTask }: DashboardPageProps) {
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
  const clientAttention = buildAttentionItems(projects, tasks);
  const attentionItems = serverAttention.length > 0
    ? serverAttention.map((item, index) => ({
        key: item.id || `attention-${index}`,
        projectId: item.project_id,
        taskId: item.item_type === 'task' ? item.id : undefined,
        title: item.title || item.name || 'Needs attention',
        detail: item.reason || item.description || item.detail || 'Requires review',
        tone: (item.severity === 'high' || item.severity === 'critical' ? 'danger' : 'warning') as 'danger' | 'warning',
      }))
    : clientAttention;

  const handleSummarySelect = (filter: string) => onNavigate('projects', filter);

  return (
    <>
      <PageHeader
        eyebrow="Workspace overview"
        title="Good morning, Admin"
        description="Here is what needs your attention across every project."
        onMenu={onMenu}
        action={
          <button className="button button-secondary" type="button" onClick={() => onNavigate('projects')}>
            <Icon name="projects" />
            View projects
          </button>
        }
      />

      <SummaryBar
        projects={projects}
        overview={overview}
        onSelect={handleSummarySelect}
      />

      <section className="content-grid">
        <div className="panel attention-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Priority queue</span>
              <h2>Needs attention</h2>
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
                  onClick={() => item.taskId ? onSelectTask(item.taskId) : item.projectId && onSelectProject(item.projectId)}
                >
                  <span className={`attention-icon attention-${item.tone}`}>
                    <Icon name="alert" size={15} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <Icon name="arrow" size={15} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="check"
              title="Everything looks clear"
              message="There are no overdue, blocked, or stalled tasks right now."
            />
          )}
        </div>

        <div className="panel health-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Portfolio signal</span>
              <h2>Project health</h2>
            </div>
          </div>
          <HealthBreakdown projects={projects} />
        </div>
      </section>

      <section className="panel portfolio-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Recent portfolio</span>
            <h2>Project performance</h2>
          </div>
          <button className="text-button" type="button" onClick={() => onNavigate('projects')}>
            See all projects <Icon name="arrow" size={14} />
          </button>
        </div>
        {projects.length > 0 ? (
          <ProjectTable projects={projects.slice(0, 6)} onSelect={onSelectProject} />
        ) : (
          <EmptyState
            title="No projects yet"
            message="Create the first project to begin tracking progress."
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
  const totals = projects.reduce<Record<string, number>>((result, project) => {
    const health = getProjectHealth(project);
    result[health] = (result[health] ?? 0) + 1;
    return result;
  }, {});
  const rows = [
    { key: 'on_track', label: 'On track' },
    { key: 'at_risk', label: 'At risk' },
    { key: 'behind', label: 'Behind' },
    { key: 'complete', label: 'Complete' },
    { key: 'no_update', label: 'No forecast' },
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
              {row.label}
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

function buildAttentionItems(projects: Project[], tasks: Task[]): AttentionItem[] {
  const overdueProjects = projects
    .filter(isProjectOverdue)
    .map((project) => ({
      key: `project-${project.id}`,
      projectId: project.id,
      title: `${project.name} is past its deadline`,
      detail: 'Review the project plan and update its target date.',
      tone: 'danger' as const,
    }));
  const blockedTasks = tasks
    .filter((task) => task.status === 'blocked')
    .map((task) => ({
      key: `task-${task.id}`,
      projectId: task.project_id,
      title: task.title,
      detail: `${task.project_name} · ${task.blocker_note || 'Task is blocked'}`,
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
      detail: `${task.project_name} · overdue since ${task.due_date}`,
      tone: 'danger' as const,
    }));
  return [...overdueProjects, ...blockedTasks, ...overdueTasks];
}
