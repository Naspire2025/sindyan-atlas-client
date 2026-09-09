import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { Issue, Risk } from '../types/api.js';
import { ISSUE_STATUSES, PRIORITIES, RISK_SEVERITIES, RISK_STATUSES, getLabel } from '../constants.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import { CircleCheck, Search, TriangleAlert } from 'lucide-react';

interface RisksIssuesPageProps {
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
}

type TabKey = 'risks' | 'issues';

export default function RisksIssuesPage({ onMenu, onSelectProject }: RisksIssuesPageProps) {
  const intl = useIntl();
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
        eyebrow={intl.formatMessage({ id: 'riskIssue.crossProject' })}
        title={intl.formatMessage({ id: 'riskIssue.title' })}
        description={intl.formatMessage({ id: 'riskIssue.description' })}
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
              {intl.formatMessage({ id: 'riskIssue.risks' })} ({filteredRisks.length})
            </button>
            <button
              className={`tab-button${activeTab === 'issues' ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === 'issues'}
              onClick={() => setActiveTab('issues')}
            >
              {intl.formatMessage({ id: 'riskIssue.issues' })} ({filteredIssues.length})
            </button>
          </div>
          <label className="search-field">
            <Search />
            <span className="sr-only">{intl.formatMessage({ id: 'common.search' })}</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={intl.formatMessage({ id: 'common.search' })} />
          </label>
        </div>

        {isLoading ? (
          <div className="loading-state"><span className="spinner" />{intl.formatMessage({ id: 'common.loading' })}</div>
        ) : error ? (
          <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'state.somethingWrong' })} message={(error as Error).message} />
        ) : activeTab === 'risks' ? (
          filteredRisks.length === 0 ? (
            <EmptyState icon={CircleCheck} title={intl.formatMessage({ id: 'riskIssue.noRisks' })} message={search ? intl.formatMessage({ id: 'riskIssue.noRisksMessage' }) : intl.formatMessage({ id: 'riskIssue.noRisksMessage' })} />
          ) : (
            <DetailList>
              {filteredRisks.map((risk) => (
                <RiskRow key={risk.id} risk={risk} onSelectProject={onSelectProject} />
              ))}
            </DetailList>
          )
        ) : (
          filteredIssues.length === 0 ? (
            <EmptyState icon={CircleCheck} title={intl.formatMessage({ id: 'riskIssue.noIssues' })} message={search ? intl.formatMessage({ id: 'riskIssue.noIssuesMessage' }) : intl.formatMessage({ id: 'riskIssue.noIssuesMessage' })} />
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
  const intl = useIntl();
  return (
    <DetailRow>
      <span className={`priority-mark priority-${risk.severity || 'medium'}`} />
      <span className="detail-list-copy">
        <strong>{risk.title}</strong>
        <small>
          {risk.severity ? intl.formatMessage({ id: getLabel(RISK_SEVERITIES, risk.severity) }) : intl.formatMessage({ id: 'priority.medium' })} {intl.formatMessage({ id: 'common.severity' })} · {risk.status ? intl.formatMessage({ id: getLabel(RISK_STATUSES, risk.status) }) : intl.formatMessage({ id: 'status.risk.open' })} ·{' '}
          <button className="text-button text-button-inline" type="button" onClick={() => onSelectProject(risk.project_id)}>
            {risk.project_name || intl.formatMessage({ id: 'common.viewProject' })}
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
  const intl = useIntl();
  return (
    <DetailRow>
      <span className={`priority-mark priority-${issue.priority || 'medium'}`} />
      <span className="detail-list-copy">
        <strong>{issue.title}</strong>
        <small>
          {issue.priority ? intl.formatMessage({ id: getLabel(PRIORITIES, issue.priority) }) : intl.formatMessage({ id: 'priority.medium' })} {intl.formatMessage({ id: 'common.priority' })} · {issue.status ? intl.formatMessage({ id: getLabel(ISSUE_STATUSES, issue.status) }) : intl.formatMessage({ id: 'status.issue.open' })} ·{' '}
          <button className="text-button text-button-inline" type="button" onClick={() => onSelectProject(issue.project_id)}>
            {issue.project_name || intl.formatMessage({ id: 'common.viewProject' })}
          </button>
        </small>
      </span>
    </DetailRow>
  );
}
