import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
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
  const intl = useIntl();
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
    <DialogShell size="large" title={intl.formatMessage({ id: 'project.createTitle' })} description={intl.formatMessage({ id: 'project.createDescription' })} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="project-name">{intl.formatMessage({ id: 'project.name' })}</label><input id="project-name" autoFocus required value={form.name} onChange={updateField('name')} placeholder={intl.formatMessage({ id: 'project.namePlaceholder' })} /></div>
        <div className="field-group"><label htmlFor="project-description">{intl.formatMessage({ id: 'project.descriptionLabel' })}</label><textarea id="project-description" value={form.description} onChange={updateField('description')} placeholder={intl.formatMessage({ id: 'project.descriptionPlaceholder' })} /></div>
        <div className="field-group"><label htmlFor="project-owner">{intl.formatMessage({ id: 'project.owner' })}</label><select id="project-owner" value={form.owner_user_id} onChange={updateField('owner_user_id')} disabled={usersQuery.isLoading}><option value="">{intl.formatMessage({ id: 'common.unassigned' })}</option>{(usersQuery.data || []).filter((user) => user.status === 'active').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="project-status">{intl.formatMessage({ id: 'project.status' })}</label><select id="project-status" value={form.status} onChange={updateField('status')}>{PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label })}</option>)}</select></div>
          <div className="field-group"><label htmlFor="project-priority">{intl.formatMessage({ id: 'project.priority' })}</label><select id="project-priority" value={form.priority} onChange={updateField('priority')}>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{intl.formatMessage({ id: item.label })}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field-group"><label htmlFor="project-start">{intl.formatMessage({ id: 'project.startDate' })}</label><input id="project-start" type="date" value={form.start_date} onChange={updateField('start_date')} /></div>
          <div className="field-group"><label htmlFor="project-deadline">{intl.formatMessage({ id: 'project.deadline' })}</label><input id="project-deadline" type="date" min={form.start_date || undefined} value={form.deadline} onChange={updateField('deadline')} /></div>
        </div>
        <div className="field-group"><label htmlFor="project-website">{intl.formatMessage({ id: 'project.projectWebsite' })}</label><input id="project-website" type="url" value={form.website_url} onChange={updateField('website_url')} placeholder="https://example.com" /></div>
        <div className="field-group"><label htmlFor="project-drive">{intl.formatMessage({ id: 'project.driveFolder' })}</label><input id="project-drive" type="url" value={form.drive_folder_url} onChange={updateField('drive_folder_url')} placeholder="https://drive.google.com/..." /></div>
        <section className="project-links-editor" aria-labelledby="project-links-heading">
          <div className="project-links-heading">
            <div><h3 id="project-links-heading">{intl.formatMessage({ id: 'project.links' })}</h3><p>{intl.formatMessage({ id: 'project.linksHint' })}</p></div>
            <button className="button button-secondary button-small" type="button" onClick={() => setForm((current) => ({ ...current, links: [...current.links, createLinkDraft()] }))}>{intl.formatMessage({ id: 'project.addLink' })}</button>
          </div>
          {form.links.length === 0 && <p className="project-links-empty">{intl.formatMessage({ id: 'project.linksEmpty' })}</p>}
          {form.links.map((link, index) => <div className="project-link-fields" key={link.id}>
            <div className="field-group"><label htmlFor={`project-link-label-${link.id}`}>{intl.formatMessage({ id: 'project.linkLabel' })}</label><input id={`project-link-label-${link.id}`} required value={link.label} onChange={updateLink(link.id, 'label')} placeholder={intl.formatMessage({ id: 'project.linkLabelPlaceholder' })} /></div>
            <div className="field-group"><label htmlFor={`project-link-type-${link.id}`}>{intl.formatMessage({ id: 'project.linkType' })}</label><select id={`project-link-type-${link.id}`} required value={link.link_type} onChange={updateLink(link.id, 'link_type')}><option value="">{intl.formatMessage({ id: 'project.selectType' })}</option><option value="github">GitHub</option><option value="figma">Figma</option><option value="google_drive">Google Drive</option><option value="documentation">{intl.formatMessage({ id: 'linkType.documentation' })}</option><option value="project_directory">{intl.formatMessage({ id: 'linkType.projectDirectory' })}</option><option value="other">{intl.formatMessage({ id: 'linkType.other' })}</option></select></div>
            <div className="field-group project-link-url"><label htmlFor={`project-link-url-${link.id}`}>{intl.formatMessage({ id: 'project.linkUrl' })}</label><input id={`project-link-url-${link.id}`} type="url" pattern="https://.*" required value={link.url} onChange={updateLink(link.id, 'url')} placeholder="https://..." /></div>
            <button className="icon-button project-link-remove" type="button" aria-label={intl.formatMessage({ id: 'project.removeExternalLink', values: { index: index + 1 } })} onClick={() => setForm((current) => ({ ...current, links: current.links.filter((item) => item.id !== link.id) }))}>×</button>
          </div>)}
        </section>
        <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>{intl.formatMessage({ id: 'common.cancel' })}</button><button className="button button-primary" type="submit" disabled={isSubmitting || isMutationPending}>{isSubmitting || isMutationPending ? intl.formatMessage({ id: 'common.creating' }) : intl.formatMessage({ id: 'project.newProject' })}</button></footer>
      </form>
    </DialogShell>
  );
}
