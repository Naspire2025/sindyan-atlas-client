import { useIntl } from 'react-intl';
import { PRIORITIES, getLabel } from '../constants.js';
import type { Project } from '../types/api.js';
import { formatDate, getInitials, getProgress, getProjectHealth, getTaskSummary } from '../utils/project.js';
import { ChevronDown } from 'lucide-react';
import type { MessageId } from '../i18n/messages/en.js';

const HEALTH_LABEL_IDS: Record<string, MessageId> = { complete: 'health.complete', behind: 'health.behind', at_risk: 'health.atRisk', on_track: 'health.onTrack' };

function formatHealthLabel(intl: ReturnType<typeof useIntl>, health: string): string {
  return health === 'no_update'
    ? intl.formatMessage({ id: 'health.noForecast' })
    : intl.formatMessage({ id: HEALTH_LABEL_IDS[health] });
}

interface ProjectTableProps {
  projects: Project[];
  onSelect: (projectId: string) => void;
}

export default function ProjectTable({ projects, onSelect }: ProjectTableProps) {
  const intl = useIntl();
  return (
    <div className="table-shell">
      <div className="project-table table-head" aria-hidden="true">
        <span>{intl.formatMessage({ id: 'project.projectName' })}</span><span>{intl.formatMessage({ id: 'project.health' })}</span><span>{intl.formatMessage({ id: 'project.priority' })}</span><span>{intl.formatMessage({ id: 'project.projectLead' })}</span><span>{intl.formatMessage({ id: 'project.dueDate' })}</span><span>{intl.formatMessage({ id: 'project.issues' })}</span><span>{intl.formatMessage({ id: 'project.progress' })}</span><span />
      </div>
      <div className="table-body">
        {projects.map((project) => <ProjectRow key={project.id} project={project} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

interface ProjectRowProps {
  project: Project;
  onSelect: (projectId: string) => void;
}

function ProjectRow({ project, onSelect }: ProjectRowProps) {
  const intl = useIntl();
  const health = getProjectHealth(project);
  const progress = getProgress(project);
  const tasks = getTaskSummary(project);

  return (
    <button className="project-table table-row" type="button" onClick={() => onSelect(project.id)}>
      <span className="project-name-cell">
        <span className={`project-glyph priority-${project.priority}`} />
        <span><strong>{project.name}</strong><small>{project.description || intl.formatMessage({ id: 'project.noDescription' })}</small></span>
      </span>
      <span className={`health health-${health}`}><span />{formatHealthLabel(intl, health)}</span>
      <span className="priority-label"><span className={`priority-mark priority-${project.priority}`} />{intl.formatMessage({ id: getLabel(PRIORITIES, project.priority) })}</span>
      <span className="lead-cell"><span className="avatar">{getInitials(project.owner_name)}</span>{project.owner_name || intl.formatMessage({ id: 'common.unassigned' })}</span>
      <span className="date-cell">{formatDate(project.deadline, intl)}</span>
      <span className="issue-count">{tasks.total}{tasks.blocked > 0 && <small>{tasks.blocked} {intl.formatMessage({ id: 'status.task.blocked' })}</small>}</span>
      <span className="progress-cell"><span>{progress}%</span><span className="progress-track"><span style={{ width: `${progress}%` }} /></span></span>
      <span className="row-chevron"><ChevronDown size={15} /></span>
    </button>
  );
}
