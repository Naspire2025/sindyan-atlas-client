import { useMemo, useState } from 'react';
import { PRIORITIES, PROJECT_STATUSES } from '../constants.js';
import { getTaskSummary, isProjectOverdue } from '../utils/project.js';
import EmptyState from './EmptyState.jsx';
import Icon from './Icon.jsx';
import PageHeader from './PageHeader.jsx';
import ProjectTable from './ProjectTable.jsx';

const EMPTY_FILTERS = { search: '', status: '', priority: '', summary: 'all' };

export default function ProjectsPage({ canCreate, initialFilter, projects, onCreate, onMenu, onSelectProject }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, summary: initialFilter || 'all' });
  const visibleProjects = useMemo(() => filterProjects(projects, filters), [filters, projects]);
  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Projects" description="Track ownership, progress, deadlines, and risk in one place." onMenu={onMenu} action={canCreate ? <button className="button button-primary" type="button" onClick={onCreate}><Icon name="plus" />New project</button> : null} />
      <div className="panel projects-panel">
        <div className="project-toolbar">
          <div className="segmented-control" aria-label="Project view">
            {['all', 'active', 'blocked', 'overdue'].map((value) => <button className={filters.summary === value ? 'is-active' : ''} key={value} type="button" onClick={() => setFilters((current) => ({ ...current, summary: value }))}>{value === 'all' ? 'All projects' : value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
          <div className="toolbar-fields">
            <label className="search-field"><Icon name="search" /><span className="sr-only">Search projects</span><input value={filters.search} onChange={setFilter('search')} placeholder="Search projects" /></label>
            <label className="select-field"><span className="sr-only">Filter by status</span><select value={filters.status} onChange={setFilter('status')}><option value="">Status</option>{PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="select-field"><span className="sr-only">Filter by priority</span><select value={filters.priority} onChange={setFilter('priority')}><option value="">Priority</option>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
        </div>
        {visibleProjects.length > 0 ? <ProjectTable projects={visibleProjects} onSelect={onSelectProject} /> : <EmptyState title="No matching projects" message="Adjust the filters or create a new project." action={<button className="button button-secondary" type="button" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>} />}
      </div>
    </>
  );
}

function filterProjects(projects, filters) {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((project) => {
    if (search && !`${project.name} ${project.owner || ''}`.toLowerCase().includes(search)) return false;
    if (filters.status && project.status !== filters.status) return false;
    if (filters.priority && project.priority !== filters.priority) return false;
    if (filters.summary === 'active' && project.status !== 'active') return false;
    if (filters.summary === 'blocked' && project.status !== 'blocked' && getTaskSummary(project).blocked === 0) return false;
    if (filters.summary === 'overdue' && !isProjectOverdue(project)) return false;
    return true;
  });
}
