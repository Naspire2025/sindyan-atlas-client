import Icon from './Icon.jsx';
import { getTaskSummary, isProjectOverdue } from '../utils/project.js';

export default function SummaryBar({ projects, overview, onSelect }) {
  const activeCount = overview.active_projects ?? projects.filter((project) => project.status === 'active').length;
  const blockedCount = overview.blocked_projects ?? projects.filter((project) => project.status === 'blocked' || getTaskSummary(project).blocked > 0).length;
  const overdueCount = overview.overdue_projects ?? projects.filter(isProjectOverdue).length;
  const cards = [
    { id: 'all', label: 'Total projects', value: overview.total_projects ?? projects.length, detail: 'Across the workspace', icon: 'projects' },
    { id: 'active', label: 'Active', value: activeCount, detail: 'Currently in motion', icon: 'overview' },
    { id: 'blocked', label: 'Need attention', value: blockedCount, detail: 'Blocked or flagged', icon: 'alert' },
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
    </section>
  );
}
