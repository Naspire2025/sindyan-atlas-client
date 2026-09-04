import { useState } from 'react';
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
      setError('Title is required.');
      return;
    }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? 'Edit issue' : 'Report issue'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="issue-title">Title</label>
          <input id="issue-title" required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
        </div>
        <div className="field-group">
          <label htmlFor="issue-desc">Description</label>
          <textarea id="issue-desc" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Describe the issue…" />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="issue-priority">Priority</label>
            <select id="issue-priority" value={form.priority} onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="issue-status">Status</label>
            <select id="issue-status" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as IssueStatus }))}>
              <option value="open">Open</option>
              <option value="mitigating">Mitigating</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="issue-owner">Owner</label>
          <select id="issue-owner" value={form.owner_user_id} onChange={(e) => setForm((c) => ({ ...c, owner_user_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {(project?.team_members || []).map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="issue-date">Target resolution date</label>
          <input id="issue-date" type="date" value={form.target_resolution_date} onChange={(e) => setForm((c) => ({ ...c, target_resolution_date: e.target.value }))} />
        </div>
        <div className="field-group">
          <label htmlFor="issue-resolution">Resolution notes</label>
          <textarea id="issue-resolution" value={form.resolution_note} onChange={(e) => setForm((c) => ({ ...c, resolution_note: e.target.value }))} placeholder="How was this issue resolved?" />
        </div>
        <div className="field-group">
          <label htmlFor="issue-progress">Resolution progress: {form.resolution_progress}%</label>
          <input id="issue-progress" type="range" min={0} max={100} step={5} value={form.resolution_progress} onChange={(e) => setForm((c) => ({ ...c, resolution_progress: Number(e.target.value) }))} />
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
