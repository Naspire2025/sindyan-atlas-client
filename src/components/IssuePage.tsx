import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { ISSUE_STATUSES, PRIORITIES, getLabel } from '../constants.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import IssueDialog from './IssueDialog.js';
import PageHeader from './PageHeader.js';

interface IssuePageProps {
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  issueId: string;
}

export default function IssuePage({ onMenu, onSelectProject, issueId }: IssuePageProps) {
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
        <PageHeader eyebrow="Issue" title="Loading issue…" onMenu={onMenu} />
        <div className="panel"><div className="loading-state"><span className="spinner" />Loading…</div></div>
      </>
    );
  }

  if (!issue) {
    return (
      <>
        <PageHeader eyebrow="Issue" title="Issue not found" onMenu={onMenu} />
        <div className="panel">
          <EmptyState icon="alert" title="Issue unavailable" message="This issue may have been deleted or you no longer have access." />
        </div>
      </>
    );
  }

  const { title, description, priority, status } = issue;

  return (
    <>
      <PageHeader
        eyebrow={`Issue · ${getLabel(PRIORITIES, priority || 'medium')} priority`}
        title={title}
        description={description || 'No description provided.'}
        onMenu={onMenu}
        action={
          <div className="page-actions">
            <button className="button button-secondary button-small" type="button" onClick={() => onSelectProject(issue.project_id)}>
              <Icon name="projects" size={14} />
              Open project
            </button>
            <button className="button button-primary button-small" type="button" onClick={() => setIsEditOpen(true)}>
              <Icon name="edit" size={14} />
              Edit
            </button>
          </div>
        }
      />

      <section className="panel">
        <DetailList>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>Priority</strong>
              <small>{getLabel(PRIORITIES, priority || 'medium')}</small>
            </span>
          </DetailRow>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>Status</strong>
              <small>{getLabel(ISSUE_STATUSES, status || 'open')}</small>
            </span>
          </DetailRow>
          {issue.owner_name && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>Owner</strong>
                <small>{issue.owner_name}</small>
              </span>
            </DetailRow>
          )}
          {issue.target_resolution_date && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>Target resolution date</strong>
                <small>{issue.target_resolution_date}</small>
              </span>
            </DetailRow>
          )}
          {issue.resolution_progress !== undefined && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>Resolution progress</strong>
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
                <strong>Resolution notes</strong>
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
            {deleteIssue.isPending ? 'Deleting…' : 'Delete issue'}
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
