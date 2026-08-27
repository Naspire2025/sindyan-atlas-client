import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { PRIORITIES, PROJECT_STATUSES } from '../constants.js';
import DialogShell from './DialogShell.jsx';

const EMPTY_PROJECT = { name: '', description: '', owner_user_id: '', status: 'planning', priority: 'medium', start_date: '', deadline: '', website_url: '', drive_folder_url: '' };

export default function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usersQuery = useQuery({ queryKey: queryKeys.users(), queryFn: ({ signal }) => api.listUsers({ signal }) });
  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onCreate({ ...form, owner_user_id: form.owner_user_id ? Number(form.owner_user_id) : null });
    } catch (submissionError) { setError(submissionError.message); } finally { setIsSubmitting(false); }
  };

  return (
    <DialogShell title="Create a new project" description="Add the core details now. Tasks, milestones, and members can be added from the project view." onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus required value={form.name} onChange={updateField('name')} placeholder="e.g. Customer onboarding" /></div>
        <div className="field-group"><label htmlFor="project-description">Description</label><textarea id="project-description" value={form.description} onChange={updateField('description')} placeholder="What does this project need to achieve?" /></div>
        <div className="field-group"><label htmlFor="project-owner">Project owner</label><select id="project-owner" value={form.owner_user_id} onChange={updateField('owner_user_id')} disabled={usersQuery.isLoading}><option value="">Unassigned</option>{(usersQuery.data || []).filter((user) => user.status === 'active').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="project-status">Status</label><select id="project-status" value={form.status} onChange={updateField('status')}>{PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="field-group"><label htmlFor="project-priority">Priority</label><select id="project-priority" value={form.priority} onChange={updateField('priority')}>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="project-start">Start date</label><input id="project-start" type="date" value={form.start_date} onChange={updateField('start_date')} /></div>
          <div className="field-group"><label htmlFor="project-deadline">Deadline</label><input id="project-deadline" type="date" min={form.start_date || undefined} value={form.deadline} onChange={updateField('deadline')} /></div>
        </div>
        <div className="field-group"><label htmlFor="project-website">Project website</label><input id="project-website" type="url" value={form.website_url} onChange={updateField('website_url')} placeholder="https://example.com" /></div>
        <div className="field-group"><label htmlFor="project-drive">Google Drive folder</label><input id="project-drive" type="url" value={form.drive_folder_url} onChange={updateField('drive_folder_url')} placeholder="https://drive.google.com/..." /></div>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create project'}</button></footer>
      </form>
    </DialogShell>
  );
}
