import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { Project, ProjectMember } from '../types/api.js';
import { aggregateMembers, getInitials } from '../utils/project.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import { Search, ShieldCheck, Users } from 'lucide-react';

interface TeamPageProps {
  members: ProjectMember[];
  onMenu: () => void;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export default function TeamPage({ members, onMenu, projects, onSelectProject }: TeamPageProps) {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const directory = useMemo(() => aggregateMembers(members, projects).filter((member) => `${member.name} ${member.email || ''} ${(member as unknown as Record<string, string>).role || ''}`.toLowerCase().includes(search.toLowerCase())), [members, projects, search]);

  return (
    <>
      <PageHeader eyebrow={intl.formatMessage({ id: 'team.accessAndOwnership' })} title={intl.formatMessage({ id: 'team.title' })} description={intl.formatMessage({ id: 'team.pageDescription' })} onMenu={onMenu} />
      <div className="context-banner"><ShieldCheck /><span>{intl.formatMessage({ id: 'team.contextBanner' })}</span></div>
      <section className="panel team-panel">
        <div className="project-toolbar"><div><span className="eyebrow">{intl.formatMessage({ id: 'team.directory' })}</span><h2>{intl.formatMessage({ id: 'team.memberCount', values: { n: directory.length } })}</h2></div><label className="search-field"><Search /><span className="sr-only">{intl.formatMessage({ id: 'team.searchTeam' })}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={intl.formatMessage({ id: 'common.search' })} /></label></div>
        {directory.length > 0 ? <div className="member-grid">{directory.map((member) => <article className="member-card" key={member.email || member.name}><span className="avatar avatar-large">{getInitials(member.name)}</span><div className="member-copy"><strong>{member.name}</strong><span>{member.email || intl.formatMessage({ id: 'team.noEmailAdded' })}</span></div><span className="role-pill">{((member as unknown as Record<string, string>).role) || intl.formatMessage({ id: 'team.teamMember' })}</span><div className="member-projects"><span>{intl.formatMessage({ id: 'member.projects' })}</span>{member.projects.map((projectName) => { const project = projects.find((item) => item.name === projectName); return <button key={projectName} type="button" onClick={() => project && onSelectProject(project.id)}>{projectName}</button>; })}</div></article>)}</div> : <EmptyState icon={Users} title={intl.formatMessage({ id: 'team.noMembers' })} message={intl.formatMessage({ id: 'team.noMembersMessage' })} />}
      </section>
    </>
  );
}
