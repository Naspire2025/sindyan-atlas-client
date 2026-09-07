import { useState } from 'react';
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
        <PageHeader eyebrow="Risk" title="Loading risk…" onMenu={onMenu} />
        <div className="panel"><div className="loading-state"><span className="spinner" />Loading…</div></div>
      </>
    );
  }

  if (!risk) {
    return (
      <>
        <PageHeader eyebrow="Risk" title="Risk not found" onMenu={onMenu} />
        <div className="panel">
          <EmptyState icon={TriangleAlert} title="Risk unavailable" message="This risk may have been deleted or you no longer have access." />
        </div>
      </>
    );
  }

  const { title, description, severity, probability, status } = risk;

  return (
    <>
      <PageHeader
        eyebrow={`Risk · ${getLabel(RISK_SEVERITIES, severity || 'medium')} severity`}
        title={title}
        description={description || 'No description provided.'}
        onMenu={onMenu}
        action={
          <div className="page-actions">
            <button className="button button-secondary button-small" type="button" onClick={() => onSelectProject(risk.project_id)}>
              <Layers size={14} />
              Open project
            </button>
            <button className="button button-primary button-small" type="button" onClick={() => setIsEditOpen(true)}>
              <Pencil size={14} />
              Edit
            </button>
          </div>
        }
      />

      <section className="panel">
        <DetailList>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>Severity</strong>
              <small>{getLabel(RISK_SEVERITIES, severity || 'medium')}</small>
            </span>
          </DetailRow>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>Probability</strong>
              <small>{getLabel(RISK_PROBABILITIES, probability || 'medium')}</small>
            </span>
          </DetailRow>
          <DetailRow>
            <span className="detail-list-copy">
              <strong>Status</strong>
              <small>{getLabel(RISK_STATUSES, status || 'open')}</small>
            </span>
          </DetailRow>
          {risk.owner_name && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>Owner</strong>
                <small>{risk.owner_name}</small>
              </span>
            </DetailRow>
          )}
          {risk.due_date && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>Due date</strong>
                <small>{risk.due_date}</small>
              </span>
            </DetailRow>
          )}
          {risk.mitigation_progress !== undefined && (
            <DetailRow>
              <span className="detail-list-copy">
                <strong>Mitigation progress</strong>
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
                <strong>Mitigation plan</strong>
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
            {deleteRisk.isPending ? 'Deleting…' : 'Delete risk'}
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
