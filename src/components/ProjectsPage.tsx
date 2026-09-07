import { useMemo, useState } from 'react';
import { PRIORITIES, PROJECT_STATUSES } from '../constants.js';
import type { Project } from '../types/api.js';
import type { ProjectFilters } from '../types/routing.js';
import { getTaskSummary, isProjectOverdue } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import { Plus, Search } from 'lucide-react';

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

const SUMMARY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All projects' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'overdue', label: 'Overdue' },
];

export default function ProjectsPage({ canCreate, initialFilter, projects, onCreate, onMenu, onSelectProject }: ProjectsPageProps) {
  const [filters, setFilters] = useState<ProjectFilters>({ ...EMPTY_FILTERS, summary: initialFilter || 'all' });
  const visibleProjects = useMemo(() => filterProjects(projects, filters), [filters, projects]);
  const setFilter = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Projects" description="Track ownership, progress, deadlines, and risk in one place." onMenu={onMenu} action={canCreate ? <button className="button button-primary" type="button" onClick={onCreate}><Plus />New project</button> : null} />
      <div className="panel projects-panel">
        <div className="project-toolbar">
          <div className="segmented-control" aria-label="Project view">
            {SUMMARY_OPTIONS.map((option) => <button className={filters.summary === option.value ? 'is-active' : ''} key={option.value} type="button" onClick={() => setFilters((current) => ({ ...current, summary: option.value }))}>{option.label}</button>)}
          </div>
          <div className="toolbar-fields">
            <label className="search-field"><Search /><span className="sr-only">Search projects</span><input value={filters.search} onChange={setFilter('search')} placeholder="Search projects" /></label>
            <label className="select-field"><span className="sr-only">Filter by status</span><select value={filters.status} onChange={setFilter('status')}><option value="">Status</option>{PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="select-field"><span className="sr-only">Filter by priority</span><select value={filters.priority} onChange={setFilter('priority')}><option value="">Priority</option>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
        </div>
        {visibleProjects.length > 0 ? <ProjectTable projects={visibleProjects} onSelect={onSelectProject} /> : <EmptyState title="No matching projects" message="Adjust the filters or create a new project." action={<button className="button button-secondary" type="button" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>} />}
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
