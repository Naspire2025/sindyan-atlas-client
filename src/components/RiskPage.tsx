import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { RISK_SEVERITIES, RISK_PROBABILITIES, RISK_STATUSES, getLabel } from '../constants.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import RiskDialog from './RiskDialog.js';
import { Layers, Pencil, TriangleAlert } from 'lucide-react';

interface RiskPageProps {
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  riskId: string;
}

export default function RiskPage({ onMenu, onSelectProject, riskId }: RiskPageProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const riskQuery = useQuery({
    queryKey: queryKeys.allRisks,
    queryFn: () => api.listAllRisks(),
    select: (risks) => risks.find((risk) => risk.id === riskId),
  });

  const risk = riskQuery.data;

  const projectQuery = useQuery({
    queryKey: queryKeys.project(risk?.project_id || ''),
    queryFn: () => api.getProject(risk!.project_id),
    enabled: Boolean(risk),
  });

  const deleteRisk = useMutation({
    mutationFn: (id: string) => api.deleteRisk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allRisks });
      onSelectProject(risk?.project_id || '');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (riskQuery.isLoading) {
    return (
      <>
        <PageHeader eyebrow={intl.formatMessage({ id: 'risk.title' })} title={intl.formatMessage({ id: 'common.loading' })} onMenu={onMenu} />
        <div className="panel"><div className="loading-state"><span className="spinner" />{intl.formatMessage({ id: 'common.loading' })}</div></div>
      </>
    );
  }

  if (!risk) {
    return (
      <>
        <PageHeader eyebrow={intl.formatMessage({ id: 'risk.title' })} title={intl.formatMessage({ id: 'state.notFound' })} onMenu={onMenu} />
        <div className="panel">
          <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'state.notFound' })} message="This risk may have been deleted or you no longer have access." />
        </div>
      </>
    );
  }

  const { title, description, severity, probability, status } = risk;

  return (
    <>
      <PageHeader
        eyebrow={`${intl.formatMessage({ id: 'risk.title' })} · ${intl.formatMessage({ id: getLabel(RISK_SEVERITIES, severity || 'medium') })} ${intl.formatMessage({ id: 'common.severity' })}`}
        title={title}
        description={description || intl.formatMessage({ id: 'project.noDescription' })}
        onMenu={onMenu}
        action={
          <div className="page-actions">
            <button className="button button-secondary button-small" type="button" onClick={() => onSelectProject(risk.project_id)}>
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
              <strong>{intl.formatMessage({ id: 'riskIssue.severity' })}</strong>
              <small>{intl.formatMessage({ id: getLabel(RISK_SEVERITIES, severity || 'medium') })}</small>
            </span>
          </DetailRow>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>{intl.formatMessage({ id: 'riskIssue.probability' })}</strong>
              <small>{intl.formatMessage({ id: getLabel(RISK_PROBABILITIES, probability || 'medium') })}</small>
            </span>
          </DetailRow>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>{intl.formatMessage({ id: 'riskIssue.status' })}</strong>
              <small>{intl.formatMessage({ id: getLabel(RISK_STATUSES, status || 'open') })}</small>
            </span>
          </DetailRow>
          {risk.owner_name && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.owner' })}</strong>
                <small>{risk.owner_name}</small>
              </span>
            </DetailRow>
          )}
          {risk.due_date && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.dueDate' })}</strong>
                <small>{risk.due_date}</small>
              </span>
            </DetailRow>
          )}
          {risk.mitigation_progress !== undefined && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.mitigationProgress' })}</strong>
                <small>
                  <span className="progress-track"><span style={{ width: `${risk.mitigation_progress}%` }} /></span>{' '}
                  {risk.mitigation_progress}%
                </small>
              </span>
            </DetailRow>
          )}
          {risk.mitigation_note && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>{intl.formatMessage({ id: 'riskIssue.mitigationNote' })}</strong>
                <small>{risk.mitigation_note}</small>
              </span>
            </DetailRow>
          )}
        </DetailList>
        <div className="section-footer">
          <button
            className="text-button text-button-danger"
            type="button"
            onClick={() => deleteRisk.mutate(risk.id)}
            disabled={deleteRisk.isPending}
          >
            {deleteRisk.isPending ? intl.formatMessage({ id: 'common.processing' }) : intl.formatMessage({ id: 'common.delete' })}
          </button>
          {error && <span className="error-banner" role="alert">{error}</span>}
        </div>
      </section>

      {isEditOpen && risk && projectQuery.data && (
        <RiskDialog risk={risk} onClose={() => setIsEditOpen(false)} project={projectQuery.data} projectId={risk.project_id} />
      )}
    </>
  );
}
