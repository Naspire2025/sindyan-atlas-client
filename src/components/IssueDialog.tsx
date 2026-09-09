import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { Issue, IssueStatus, Project } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface IssueDialogProps {
  issue?: Issue;
  onClose: () => void;
  project: Project;
  projectId: string;
}

export default function IssueDialog({ issue, onClose, project, projectId }: IssueDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const isEditing = Boolean(issue);
  const [form, setForm] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    priority: issue?.priority || 'medium',
    status: issue?.status || 'open',
    resolution_note: issue?.resolution_note || '',
    resolution_progress: issue?.resolution_progress ?? 0,
    owner_user_id: issue?.owner_user_id || '',
    target_resolution_date: issue?.target_resolution_date || '',
  });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEditing
        ? api.updateIssue(issue!.id, data as Partial<Issue>)
        : api.createIssue(projectId, data as Omit<Issue, 'id' | 'project_id'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectIssues(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allIssues });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError(intl.formatMessage({ id: 'common.titleRequired' }));
      return;
    }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? intl.formatMessage({ id: 'riskIssue.updateIssue' }) : intl.formatMessage({ id: 'riskIssue.createIssue' })} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="issue-title">{intl.formatMessage({ id: 'riskIssue.titleField' })}</label>
          <input id="issue-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
        </div>
        <div className="field-group">
          <label htmlFor="issue-desc">{intl.formatMessage({ id: 'riskIssue.descriptionField' })}</label>
          <textarea id="issue-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder={intl.formatMessage({ id: 'issue.describePlaceholder' })} />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="issue-priority">{intl.formatMessage({ id: 'task.priority' })}</label>
            <select id="issue-priority" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value }))}>
              <option value="low">{intl.formatMessage({ id: 'priority.low' })}</option>
              <option value="medium">{intl.formatMessage({ id: 'priority.medium' })}</option>
              <option value="high">{intl.formatMessage({ id: 'priority.high' })}</option>
              <option value="critical">{intl.formatMessage({ id: 'priority.critical' })}</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="issue-status">{intl.formatMessage({ id: 'riskIssue.status' })}</label>
            <select id="issue-status" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as IssueStatus }))}>
              <option value="open">{intl.formatMessage({ id: 'status.issue.open' })}</option>
              <option value="mitigating">{intl.formatMessage({ id: 'status.issue.mitigating' })}</option>
              <option value="escalated">{intl.formatMessage({ id: 'status.issue.escalated' })}</option>
              <option value="resolved">{intl.formatMessage({ id: 'status.issue.resolved' })}</option>
            </select>
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="issue-owner">{intl.formatMessage({ id: 'riskIssue.owner' })}</label>
          <select id="issue-owner" value={form.owner_user_id} onChange={(e) => setForm((c) => ({ ...c, owner_user_id: e.target.value }))}>
            <option value="">{intl.formatMessage({ id: 'account.notSet' })}</option>
            {(project?.team_members || []).map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="issue-date">{intl.formatMessage({ id: 'riskIssue.targetDate' })}</label>
          <input id="issue-date" type="date" value={form.target_resolution_date} onChange={(e) => setForm((c) => ({ ...c, target_resolution_date: e.target.value }))} />
        </div>
        <div className="field-group">
          <label htmlFor="issue-resolution">{intl.formatMessage({ id: 'riskIssue.resolutionNote' })}</label>
          <textarea id="issue-resolution" value={form.resolution_note} onChange={(e) => setForm((c) => ({ ...c, resolution_note: e.target.value }))} placeholder={intl.formatMessage({ id: 'issue.resolutionPlaceholder' })} />
        </div>
        <div className="field-group">
          <label htmlFor="issue-progress">{intl.formatMessage({ id: 'riskIssue.resolutionProgress' })}: {form.resolution_progress}%</label>
          <input id="issue-progress" type="range" min={0} max={100} step={5} value={form.resolution_progress} onChange={(e) => setForm((c) => ({ ...c, resolution_progress: Number(e.target.value) }))} />
        </div>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>{intl.formatMessage({ id: 'common.cancel' })}</button>
          <button className="button button-primary" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? intl.formatMessage({ id: 'common.saving' }) : intl.formatMessage({ id: 'common.save' })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
