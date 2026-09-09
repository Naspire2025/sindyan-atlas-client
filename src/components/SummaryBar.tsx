import { useIntl } from 'react-intl';
import type { Project, DashboardOverview } from '../types/api.js';
import { Calendar, CircleCheck, Layers, LayoutGrid, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getTaskSummary, isProjectOverdue } from '../utils/project.js';
import type { MessageId } from '../i18n/messages/en.js';

interface SummaryBarProps {
  projects: Project[];
  overview: DashboardOverview;
  onSelect: (filter: string) => void;
}

interface SummaryCard {
  id: string;
  label: MessageId;
  value: number;
  detail: MessageId;
  icon: LucideIcon;
}

export default function SummaryBar({ projects, overview, onSelect }: SummaryBarProps) {
  const intl = useIntl();
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
    { id: 'all', label: 'dashboard.totalProjects', value: kpis?.total_projects ?? projects.length, detail: 'dashboard.totalProjectsDetail', icon: Layers },
    { id: 'active', label: 'dashboard.active', value: activeCount, detail: 'dashboard.activeDetail', icon: LayoutGrid },
    { id: 'completed', label: 'dashboard.completed', value: completedCount, detail: 'dashboard.completedDetail', icon: CircleCheck },
    { id: 'at_risk', label: 'dashboard.atRisk', value: atRiskCount, detail: 'dashboard.atRiskDetail', icon: TriangleAlert },
    { id: 'blocked', label: 'dashboard.blocked', value: blockedCount, detail: 'dashboard.blockedDetail', icon: TriangleAlert },
    { id: 'overdue', label: 'dashboard.pastDeadline', value: overdueCount, detail: 'dashboard.pastDeadlineDetail', icon: Calendar },
  ];

  return (
    <section className="summary-grid" aria-label={intl.formatMessage({ id: 'dashboard.portfolioSummary' })}>
      {cards.map((card) => (
        <button className="summary-card" key={card.id} type="button" onClick={() => onSelect(card.id)}>
          <span className="summary-icon"><card.icon size={16} /></span>
          <span className="summary-value">{card.value}</span>
          <span className="summary-label">{intl.formatMessage({ id: card.label })}</span>
          <span className="summary-detail">{intl.formatMessage({ id: card.detail })}</span>
        </button>
      ))}
      <div className="summary-card health-score-card">
        <span className="summary-value">{healthScore}%</span>
        <span className="summary-label">{intl.formatMessage({ id: 'dashboard.healthScore' })}</span>
      </div>
    </section>
  );
}