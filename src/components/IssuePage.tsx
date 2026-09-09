import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { ISSUE_STATUSES, PRIORITIES, getLabel } from '../constants.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';


import IssueDialog from './IssueDialog.js';
import PageHeader from './PageHeader.js';
import { Layers, Pencil, TriangleAlert } from 'lucide-react';

interface IssuePageProps {
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  issueId: string;
}

export default function IssuePage({ onMenu, onSelectProject, issueId }: IssuePageProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issueQuery = useQuery({
    queryKey: queryKeys.allIssues,
    queryFn: () => api.listAllIssues(),
    select: (issues) => issues.find((issue) => issue.id === issueId),
  });

  const issue = issueQuery.data;

  const projectQuery = useQuery({
    queryKey: queryKeys.project(issue?.project_id || ''),
    queryFn: () => api.getProject(issue!.project_id),
    enabled: Boolean(issue),
  });

  const deleteIssue = useMutation({
    mutationFn: (id: string) => api.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allIssues });
      onSelectProject(issue?.project_id || '');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (issueQuery.isLoading) {
    return (
      <>
        <PageHeader eyebrow={intl.formatMessage({ id: 'issue.title' })} title={intl.formatMessage({ id: 'common.loading' })} onMenu={onMenu} />
        <div className="panel"><div className="loading-state"><span className="spinner" />{intl.formatMessage({ id: 'common.loading' })}</div></div>
      </>
    );
  }

  if (!issue) {
    return (
      <>
        <PageHeader eyebrow={intl.formatMessage({ id: 'issue.title' })} title={intl.formatMessage({ id: 'state.notFound' })} onMenu={onMenu} />
        <div className="panel">
          <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'state.notFound' })} message="This issue may have been deleted or you no longer have access." />
        </div>
      </>
    );
  }

  const { title, description, priority, status } = issue;

  return (
    <>
      <PageHeader
        eyebrow={`${intl.formatMessage({ id: 'issue.title' })} · ${intl.formatMessage({ id: getLabel(PRIORITIES, priority || 'medium') })} ${intl.formatMessage({ id: 'common.priority' })}`}
        title={title}
        description={description || intl.formatMessage({ id: 'project.noDescription' })}
        onMenu={onMenu}
        action={
          <div className="page-actions">
            <button className="button button-secondary button-small" type="button" onClick={() => onSelectProject(issue.project_id)}>
              <Layers size={14} />
              {intl.formatMessage({ id: 'common.openProject' })}
            </button>
            <button className="button button-primary button-small" type="button" onClick={() => setIsEditOpen(true)}>
              <Pencil size={14} />
              {intl.formatMessage({ id: 'common.edit' })}
            </button>
          </div>
        }
      />

      <section className="panel">
        <DetailList>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>{intl.formatMessage({ id: 'task.priority' })}</strong>
              <small>{intl.formatMessage({ id: getLabel(PRIORITIES, priority || 'medium') })}</small>
            </span>
          </DetailRow>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>{intl.formatMessage({ id: 'riskIssue.status' })}</strong>
              <small>{intl.formatMessage({ id: getLabel(ISSUE_STATUSES, status || 'open') })}</small>
            </span>
          </DetailRow>
          {issue.owner_name && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.owner' })}</strong>
                <small>{issue.owner_name}</small>
              </span>
            </DetailRow>
          )}
          {issue.target_resolution_date && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.targetDate' })}</strong>
                <small>{issue.target_resolution_date}</small>
              </span>
            </DetailRow>
          )}
          {issue.resolution_progress !== undefined && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.resolutionProgress' })}</strong>
                <small>
                  <span className="progress-track"><span style={{ width: `${issue.resolution_progress}%` }} /></span>{' '}
                  {issue.resolution_progress}%
                </small>
              </span>
            </DetailRow>
          )}
          {issue.resolution_note && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.resolutionNote' })}</strong>
                <small>{issue.resolution_note}</small>
              </span>
            </DetailRow>
          )}
        </DetailList>
        <div className="section-footer">
          <button
            className="text-button text-button-danger"
            type="button"
            onClick={() => deleteIssue.mutate(issue.id)}
            disabled={deleteIssue.isPending}
          >
            {deleteIssue.isPending ? intl.formatMessage({ id: 'common.processing' }) : intl.formatMessage({ id: 'common.delete' })}
          </button>
          {error && <span className="error-banner" role="alert">{error}</span>}
        </div>
      </section>

      {isEditOpen && issue && projectQuery.data && (
        <IssueDialog issue={issue} onClose={() => setIsEditOpen(false)} project={projectQuery.data} projectId={issue.project_id} />
      )}
    </>
  );
}
