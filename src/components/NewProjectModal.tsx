import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { PRIORITIES, PROJECT_STATUSES } from '../constants.js';
import type { CreateProjectPayload, Project } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface NewProjectModalProps {
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (data: CreateProjectPayload) => Promise<Project>;
}

interface NewProjectForm {
  name: string;
  description: string;
  owner_user_id: string;
  status: string;
  priority: string;
  start_date: string;
  deadline: string;
  website_url: string;
  drive_folder_url: string;
  links: ProjectLinkDraft[];
}

interface ProjectLinkDraft {
  id: string;
  label: string;
  link_type: string;
  url: string;
}

const EMPTY_PROJECT: NewProjectForm = { name: '', description: '', owner_user_id: '', status: 'planning', priority: 'medium', start_date: '', deadline: '', website_url: '', drive_folder_url: '', links: [] };

function createLinkDraft(): ProjectLinkDraft {
  return { id: crypto.randomUUID(), label: '', link_type: '', url: '' };
}

export default function NewProjectModal({ isSubmitting: isMutationPending = false, onClose, onCreate }: NewProjectModalProps) {
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usersQuery = useQuery({ queryKey: queryKeys.users(), queryFn: ({ signal }) => api.listUsers({ signal }) });
  const updateField = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateLink = (id: string, key: keyof Omit<ProjectLinkDraft, 'id'>) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, links: current.links.map((link) => link.id === id ? { ...link, [key]: event.target.value } : link) }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onCreate({
        ...form,
        status: form.status as CreateProjectPayload['status'],
        priority: form.priority as CreateProjectPayload['priority'],
        owner_user_id: form.owner_user_id || null,
        links: form.links.map(({ label, link_type, url }) => ({ label, link_type, url })),
      });
    } catch (submissionError) { setError((submissionError as Error).message); } finally { setIsSubmitting(false); }
  };

  return (
    <DialogShell size="large" title="Create a new project" description="Add the core details now. Tasks, milestones, and members can be added from the project view." onClose={onClose}>
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
        <section className="project-links-editor" aria-labelledby="project-links-heading">
          <div className="project-links-heading">
            <div><h3 id="project-links-heading">External links</h3><p>Add repositories, designs, documentation, or project directories.</p></div>
            <button className="button button-secondary button-small" type="button" onClick={() => setForm((current) => ({ ...current, links: [...current.links, createLinkDraft()] }))}>Add link</button>
          </div>
          {form.links.length === 0 && <p className="project-links-empty">No additional links added.</p>}
          {form.links.map((link, index) => <div className="project-link-fields" key={link.id}>
            <div className="field-group"><label htmlFor={`project-link-label-${link.id}`}>Label</label><input id={`project-link-label-${link.id}`} required value={link.label} onChange={updateLink(link.id, 'label')} placeholder="e.g. Product repository" /></div>
            <div className="field-group"><label htmlFor={`project-link-type-${link.id}`}>Type</label><select id={`project-link-type-${link.id}`} required value={link.link_type} onChange={updateLink(link.id, 'link_type')}><option value="">Select type</option><option value="github">GitHub</option><option value="figma">Figma</option><option value="google_drive">Google Drive</option><option value="documentation">Documentation</option><option value="project_directory">Project directory</option><option value="other">Other</option></select></div>
            <div className="field-group project-link-url"><label htmlFor={`project-link-url-${link.id}`}>HTTPS URL</label><input id={`project-link-url-${link.id}`} type="url" pattern="https://.*" required value={link.url} onChange={updateLink(link.id, 'url')} placeholder="https://..." /></div>
            <button className="icon-button project-link-remove" type="button" aria-label={`Remove external link ${index + 1}`} onClick={() => setForm((current) => ({ ...current, links: current.links.filter((item) => item.id !== link.id) }))}>×</button>
          </div>)}
        </section>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={isSubmitting || isMutationPending}>{isSubmitting || isMutationPending ? 'Creating…' : 'Create project'}</button></footer>
      </form>
    </DialogShell>
  );
}
