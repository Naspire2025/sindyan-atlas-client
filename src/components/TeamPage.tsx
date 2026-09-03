import { useMemo, useState } from 'react';
import type { Project, ProjectMember } from '../types/api.js';
import { aggregateMembers, getInitials } from '../utils/project.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface TeamPageProps {
  members: ProjectMember[];
  onMenu: () => void;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export default function TeamPage({ members, onMenu, projects, onSelectProject }: TeamPageProps) {
  const [search, setSearch] = useState('');
  const directory = useMemo(() => aggregateMembers(members, projects).filter((member) => `${member.name} ${member.email || ''} ${(member as unknown as Record<string, string>).role || ''}`.toLowerCase().includes(search.toLowerCase())), [members, projects, search]);

  return (
    <>
      <PageHeader eyebrow="Access and ownership" title="Team" description="See who is working on each project and how they contribute." onMenu={onMenu} />
      <div className="context-banner"><Icon name="shield" /><span>Email invitations and account roles require the authentication service. Current records represent project membership.</span></div>
      <section className="panel team-panel">
        <div className="project-toolbar"><div><span className="eyebrow">Directory</span><h2>{directory.length} member{directory.length === 1 ? '' : 's'}</h2></div><label className="search-field"><Icon name="search" /><span className="sr-only">Search team</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" /></label></div>
        {directory.length > 0 ? <div className="member-grid">{directory.map((member) => <article className="member-card" key={member.email || member.name}><span className="avatar avatar-large">{getInitials(member.name)}</span><div className="member-copy"><strong>{member.name}</strong><span>{member.email || 'No email added'}</span></div><span className="role-pill">{((member as unknown as Record<string, string>).role) || 'Team member'}</span><div className="member-projects"><span>Projects</span>{member.projects.map((projectName) => { const project = projects.find((item) => item.name === projectName); return <button key={projectName} type="button" onClick={() => project && onSelectProject(project.id)}>{projectName}</button>; })}</div></article>)}</div> : <EmptyState icon="users" title="No team members found" message="Add members from a project to build the workspace directory." />}
      </section>
    </>
  );
}
