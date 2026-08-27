import { PRIORITIES, getLabel } from '../constants.js';
import type { Project } from '../types/api.js';
import { formatDate, getInitials, getProgress, getProjectHealth, getTaskSummary } from '../utils/project.js';
import Icon from './Icon.js';

const HEALTH_LABELS: Record<string, string> = { complete: 'Complete', behind: 'Behind', at_risk: 'At risk', on_track: 'On track', no_update: 'No forecast' };

interface ProjectTableProps {
  projects: Project[];
  onSelect: (projectId: number) => void;
}

export default function ProjectTable({ projects, onSelect }: ProjectTableProps) {
  return (
    <div className="table-shell">
      <div className="project-table table-head" aria-hidden="true">
        <span>Project</span><span>Health</span><span>Priority</span><span>Lead</span><span>Target date</span><span>Issues</span><span>Progress</span><span />
      </div>
      <div className="table-body">
        {projects.map((project) => <ProjectRow key={project.id} project={project} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

interface ProjectRowProps {
  project: Project;
  onSelect: (projectId: number) => void;
}

function ProjectRow({ project, onSelect }: ProjectRowProps) {
  const health = getProjectHealth(project);
  const progress = getProgress(project);
  const tasks = getTaskSummary(project);

  return (
    <button className="project-table table-row" type="button" onClick={() => onSelect(project.id)}>
      <span className="project-name-cell">
        <span className={`project-glyph priority-${project.priority}`} />
        <span><strong>{project.name}</strong><small>{project.description || 'No description added'}</small></span>
      </span>
      <span className={`health health-${health}`}><span />{HEALTH_LABELS[health]}</span>
      <span className="priority-label"><span className={`priority-mark priority-${project.priority}`} />{getLabel(PRIORITIES, project.priority)}</span>
      <span className="lead-cell"><span className="avatar">{getInitials(project.owner)}</span>{project.owner || 'Unassigned'}</span>
      <span className="date-cell">{formatDate(project.deadline)}</span>
      <span className="issue-count">{tasks.total}{tasks.blocked > 0 && <small>{tasks.blocked} blocked</small>}</span>
      <span className="progress-cell"><span>{progress}%</span><span className="progress-track"><span style={{ width: `${progress}%` }} /></span></span>
      <span className="row-chevron"><Icon name="chevron" size={15} /></span>
    </button>
  );
}
