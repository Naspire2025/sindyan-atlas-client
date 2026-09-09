import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { PRIORITIES, PROJECT_STATUSES } from '../constants.js';
import type { Project } from '../types/api.js';
import type { ProjectFilters } from '../types/routing.js';
import { getTaskSummary, isProjectOverdue } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import { Plus, Search } from 'lucide-react';
import type { MessageId } from '../i18n/messages/en.js';

import PageHeader from './PageHeader.js';
import ProjectTable from './ProjectTable.js';

interface ProjectsPageProps {
  canCreate: boolean;
  initialFilter: string;
  projects: Project[];
  onCreate: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
}

const EMPTY_FILTERS: ProjectFilters = { search: '', status: '', priority: '', summary: 'all' };

const SUMMARY_OPTIONS: { value: string; label: MessageId | null }[] = [
  { value: 'all', label: 'project.filterAll' },
  { value: 'planning', label: 'project.filterPlanning' },
  { value: 'active', label: 'project.filterActive' },
  { value: 'on_hold', label: 'project.filterOnHold' },
  { value: 'blocked', label: 'status.project.blocked' },
  { value: 'completed', label: 'project.filterCompleted' },
  { value: 'cancelled', label: 'status.project.cancelled' },
  { value: 'overdue', label: null },
];

export default function ProjectsPage({ canCreate, initialFilter, projects, onCreate, onMenu, onSelectProject }: ProjectsPageProps) {
  const intl = useIntl();
  const [filters, setFilters] = useState<ProjectFilters>({ ...EMPTY_FILTERS, summary: initialFilter || 'all' });
  const visibleProjects = useMemo(() => filterProjects(projects, filters), [filters, projects]);
  const setFilter = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <PageHeader eyebrow={intl.formatMessage({ id: 'project.portfolio' })} title={intl.formatMessage({ id: 'project.title' })} description={intl.formatMessage({ id: 'project.description' })} onMenu={onMenu} action={canCreate ? <button className="button button-primary" type="button" onClick={onCreate}><Plus />{intl.formatMessage({ id: 'project.newProject' })}</button> : null} />
      <div className="panel projects-panel">
        <div className="project-toolbar">
          <div className="segmented-control" aria-label={intl.formatMessage({ id: 'project.view' })}>
            {SUMMARY_OPTIONS.map((option) => <button className={filters.summary === option.value ? 'is-active' : ''} key={option.value} type="button" onClick={() => setFilters((current) => ({ ...current, summary: option.value }))}>{option.label ? intl.formatMessage({ id: option.label }) : intl.formatMessage({ id: 'project.filterOverdue' })}</button>)}
          </div>
          <div className="toolbar-fields">
            <label className="search-field"><Search /><span className="sr-only">{intl.formatMessage({ id: 'common.search' })}</span><input value={filters.search} onChange={setFilter('search')} placeholder={intl.formatMessage({ id: 'common.search' })} /></label>
            <label className="select-field"><span className="sr-only">{intl.formatMessage({ id: 'project.filterByStatus' })}</span><select value={filters.status} onChange={setFilter('status')}><option value="">{intl.formatMessage({ id: 'project.status' })}</option>{PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label })}</option>)}</select></label>
            <label className="select-field"><span className="sr-only">{intl.formatMessage({ id: 'project.filterByPriority' })}</span><select value={filters.priority} onChange={setFilter('priority')}><option value="">{intl.formatMessage({ id: 'project.priority' })}</option>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label })}</option>)}</select></label>
          </div>
        </div>
        {visibleProjects.length > 0 ? <ProjectTable projects={visibleProjects} onSelect={onSelectProject} /> : <EmptyState title={intl.formatMessage({ id: 'project.noMatchingProjects' })} message={intl.formatMessage({ id: 'project.adjustFilters' })} action={<button className="button button-secondary" type="button" onClick={() => setFilters(EMPTY_FILTERS)}>{intl.formatMessage({ id: 'common.clearFilters' })}</button>} />}
      </div>
    </>
  );
}

function filterProjects(projects: Project[], filters: ProjectFilters) {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((project) => {
    if (search && !`${project.name} ${project.owner_name || ''}`.toLowerCase().includes(search)) return false;
    if (filters.status && project.status !== filters.status) return false;
    if (filters.priority && project.priority !== filters.priority) return false;
    if (isStatusSummary(filters.summary) && project.status !== filters.summary) return false;
    if (filters.summary === 'blocked' && project.status !== 'blocked' && getTaskSummary(project).blocked === 0) return false;
    if (filters.summary === 'overdue' && !isProjectOverdue(project)) return false;
    return true;
  });
}

function isStatusSummary(value: string) {
  return ['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(value);
}
