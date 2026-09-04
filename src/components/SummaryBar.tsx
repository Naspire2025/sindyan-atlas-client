import type { Project, DashboardOverview } from '../types/api.js';
import Icon from './Icon.js';
import { getTaskSummary, isProjectOverdue } from '../utils/project.js';

interface SummaryBarProps {
  projects: Project[];
  overview: DashboardOverview;
  onSelect: (filter: string) => void;
}

interface SummaryCard {
  id: string;
  label: string;
  value: number;
  detail: string;
  icon: string;
}

export default function SummaryBar({ projects, overview, onSelect }: SummaryBarProps) {
  const kpis = overview.kpis;
  const activeCount = kpis?.active_projects ?? projects.filter((project) => project.status === 'active').length;
  const blockedCount = kpis?.blocked_projects ?? projects.filter((project) => project.status === 'blocked' || getTaskSummary(project).blocked > 0).length;
  const overdueCount = kpis?.overdue_projects ?? projects.filter(isProjectOverdue).length;
  const completedCount = kpis?.completed_projects ?? projects.filter((project) => project.status === 'completed').length;
  const atRiskCount = projects.filter((project) => {
    const summary = getTaskSummary(project);
    return summary.total > 0 && summary.blocked > 0;
  }).length;
  const healthScore = overview.health_score ?? 0;

  const cards: SummaryCard[] = [
    { id: 'all', label: 'Total projects', value: kpis?.total_projects ?? projects.length, detail: 'Across the workspace', icon: 'projects' },
    { id: 'active', label: 'Active', value: activeCount, detail: 'Currently in motion', icon: 'overview' },
    { id: 'completed', label: 'Completed', value: completedCount, detail: 'Successfully delivered', icon: 'check' },
    { id: 'at_risk', label: 'At risk', value: atRiskCount, detail: 'Needs attention', icon: 'alert' },
    { id: 'blocked', label: 'Blocked', value: blockedCount, detail: 'Waiting on resolution', icon: 'alert' },
    { id: 'overdue', label: 'Past deadline', value: overdueCount, detail: 'Open and overdue', icon: 'calendar' },
  ];

  return (
    <section className="summary-grid" aria-label="Portfolio summary">
      {cards.map((card) => (
        <button className="summary-card" key={card.id} type="button" onClick={() => onSelect(card.id)}>
          <span className="summary-icon"><Icon name={card.icon} size={16} /></span>
          <span className="summary-value">{card.value}</span>
          <span className="summary-label">{card.label}</span>
          <span className="summary-detail">{card.detail}</span>
        </button>
      ))}
      <div className="summary-card health-score-card">
        <span className="summary-value">{healthScore}%</span>
        <span className="summary-label">Health score</span>
      </div>
    </section>
  );
}
