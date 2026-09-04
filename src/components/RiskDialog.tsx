import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { Project, Risk, RiskProbability, RiskSeverity, RiskStatus } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface RiskDialogProps {
  onClose: () => void;
  project: Project;
  projectId: string;
  risk?: Risk;
}

export default function RiskDialog({ onClose, project, projectId, risk }: RiskDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(risk);
  const [form, setForm] = useState({
    title: risk?.title || '',
    description: risk?.description || '',
    severity: risk?.severity || 'medium',
    probability: risk?.probability || 'medium',
    status: risk?.status || 'open',
    mitigation_note: risk?.mitigation_note || '',
    mitigation_progress: risk?.mitigation_progress ?? 0,
    owner_user_id: risk?.owner_user_id || '',
    due_date: risk?.due_date || '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEditing
        ? api.updateRisk(risk!.id, data as Partial<Risk>)
        : api.createRisk(projectId, data as Omit<Risk, 'id' | 'project_id'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectRisks(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allRisks });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? 'Edit risk' : 'Log risk'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="risk-title">Title</label>
          <input id="risk-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
        </div>
        <div className="field-group">
          <label htmlFor="risk-desc">Description</label>
          <textarea id="risk-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Describe the risk…" />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="risk-severity">Severity</label>
            <select id="risk-severity" value={form.severity} onChange={(e) => setForm((c) => ({ ...c, severity: e.target.value as RiskSeverity }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="risk-prob">Probability</label>
            <select id="risk-prob" value={form.probability} onChange={(e) => setForm((c) => ({ ...c, probability: e.target.value as RiskProbability }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="very_high">Very high</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="risk-status">Status</label>
            <select id="risk-status" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as RiskStatus }))}>
              <option value="open">Open</option>
              <option value="mitigating">Mitigating</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="risk-date">Due date</label>
            <input id="risk-date" type="date" value={form.due_date} onChange={(e) => setForm((c) => ({ ...c, due_date: e.target.value }))} />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="risk-owner">Owner</label>
          <select id="risk-owner" value={form.owner_user_id} onChange={(e) => setForm((c) => ({ ...c, owner_user_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {(project?.team_members || []).map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="risk-mitigation">Mitigation plan</label>
          <textarea id="risk-mitigation" value={form.mitigation_note} onChange={(e) => setForm((c) => ({ ...c, mitigation_note: e.target.value }))} placeholder="How will this risk be addressed?" />
        </div>
        <div className="field-group">
          <label htmlFor="risk-progress">Mitigation progress: {form.mitigation_progress}%</label>
          <input id="risk-progress" type="range" min={0} max={100} step={5} value={form.mitigation_progress} onChange={(e) => setForm((c) => ({ ...c, mitigation_progress: Number(e.target.value) }))} />
        </div>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
