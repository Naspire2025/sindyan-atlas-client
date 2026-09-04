import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { Issue, Risk } from '../types/api.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface RisksIssuesPageProps {
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
}

type TabKey = 'risks' | 'issues';

export default function RisksIssuesPage({ onMenu, onSelectProject }: RisksIssuesPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('risks');
  const [search, setSearch] = useState('');

  const risksQuery = useQuery({
    queryKey: queryKeys.allRisks,
    queryFn: ({ signal }) => api.listAllRisks(signal),
  });

  const issuesQuery = useQuery({
    queryKey: queryKeys.allIssues,
    queryFn: ({ signal }) => api.listAllIssues(signal),
  });

  const risks = risksQuery.data || [];
  const issues = issuesQuery.data || [];

  const filteredRisks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return risks.filter((risk) => !q || `${risk.title} ${risk.description || ''} ${risk.project_name || ''}`.toLowerCase().includes(q));
  }, [risks, search]);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((issue) => !q || `${issue.title} ${issue.description || ''} ${issue.project_name || ''}`.toLowerCase().includes(q));
  }, [issues, search]);

  const isLoading = risksQuery.isLoading || issuesQuery.isLoading;
  const error = risksQuery.error || issuesQuery.error;

  return (
    <>
      <PageHeader
        eyebrow="Cross-project"
        title="Risks &amp; issues"
        description="Active risks and issues across all projects."
        onMenu={onMenu}
      />

      <section className="panel vault-panel">
        <div className="project-toolbar">
          <div className="tab-strip" role="tablist">
            <button
              className={`tab-button${activeTab === 'risks' ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === 'risks'}
              onClick={() => setActiveTab('risks')}
            >
              Risks ({filteredRisks.length})
            </button>
            <button
              className={`tab-button${activeTab === 'issues' ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === 'issues'}
              onClick={() => setActiveTab('issues')}
            >
              Issues ({filteredIssues.length})
            </button>
          </div>
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search risks &amp; issues" />
          </label>
        </div>

        {isLoading ? (
          <div className="loading-state"><span className="spinner" />Loading…</div>
        ) : error ? (
          <EmptyState icon="alert" title="Failed to load" message={(error as Error).message} />
        ) : activeTab === 'risks' ? (
          filteredRisks.length === 0 ? (
            <EmptyState icon="check" title="No risks" message={search ? 'Adjust your search.' : 'No active risks across any project.'} />
          ) : (
            <DetailList>
              {filteredRisks.map((risk) => (
                <RiskRow key={risk.id} risk={risk} onSelectProject={onSelectProject} />
              ))}
            </DetailList>
          )
        ) : (
          filteredIssues.length === 0 ? (
            <EmptyState icon="check" title="No issues" message={search ? 'Adjust your search.' : 'No active issues across any project.'} />
          ) : (
            <DetailList>
              {filteredIssues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} onSelectProject={onSelectProject} />
              ))}
            </DetailList>
          )
        )}
      </section>
    </>
  );
}

interface RiskRowProps {
  risk: Risk & { project_name?: string };
  onSelectProject: (projectId: string) => void;
}

function RiskRow({ risk, onSelectProject }: RiskRowProps) {
  return (
    <DetailRow>
      <span className={`priority-mark priority-${risk.severity || 'medium'}`} />
      <span className="detail-list-copy">
        <strong>{risk.title}</strong>
        <small>
          {risk.severity || 'Medium'} severity · {risk.status || 'open'} ·{' '}
          <button className="text-button text-button-inline" type="button" onClick={() => onSelectProject(risk.project_id)}>
            {risk.project_name || 'View project'}
          </button>
        </small>
      </span>
    </DetailRow>
  );
}

interface IssueRowProps {
  issue: Issue & { project_name?: string };
  onSelectProject: (projectId: string) => void;
}

function IssueRow({ issue, onSelectProject }: IssueRowProps) {
  return (
    <DetailRow>
      <span className={`priority-mark priority-${issue.priority || 'medium'}`} />
      <span className="detail-list-copy">
        <strong>{issue.title}</strong>
        <small>
          {issue.priority || 'Medium'} priority · {issue.status || 'open'} ·{' '}
          <button className="text-button text-button-inline" type="button" onClick={() => onSelectProject(issue.project_id)}>
            {issue.project_name || 'View project'}
          </button>
        </small>
      </span>
    </DetailRow>
  );
}
