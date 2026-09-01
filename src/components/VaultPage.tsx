import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { VAULT_ENTRY_TYPES } from '../constants.js';
import type { Project, User, VaultEntry, VaultEntryType, VaultFile } from '../types/api.js';
import { canRevealSecret, isAdmin } from '../auth/permissions.js';
import ConfirmDialog from './ConfirmDialog.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';
import { SearchField, SelectField } from './FilterBar.js';

interface VaultPageProps {
  currentUser: User;
  onMenu: () => void;
}

const EMPTY_ENTRIES: VaultEntry[] = [];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv',
  'application/json',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export default function VaultPage({ currentUser, onMenu }: VaultPageProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VaultEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);
  const [revealTarget, setRevealTarget] = useState<VaultEntry | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const entriesQuery = useQuery({
    queryKey: queryKeys.vaultEntries({ project_id: projectFilter }),
    queryFn: ({ signal }) => api.listVaultEntries({ signal, project_id: projectFilter }),
  });

  const deleteEntry = useMutation({
    mutationFn: (id: number) => api.deleteVaultEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
      setDeleteTarget(null);
    },
  });

  const entries = entriesQuery.data || EMPTY_ENTRIES;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (q && !`${entry.title} ${entry.category || ''} ${entry.entry_type || ''} ${(entry.tags || []).map((tag) => tag.display_name || tag.name).join(' ')}`.toLowerCase().includes(q)) return false;
      if (typeFilter && entry.entry_type !== typeFilter) return false;
      if (categoryFilter && entry.category !== categoryFilter) return false;
      return true;
    });
  }, [entries, search, typeFilter, categoryFilter]);
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(), queryFn: ({ signal }) => api.listProjects({ signal }) });
  const categories = [...new Set(entries.map((entry) => entry.category).filter(Boolean))];

  return (
    <>
      <PageHeader
        eyebrow="Shared resources"
        title="Secure vault"
        description="A protected home for project links, briefs, credentials, and keys."
        onMenu={onMenu}
        action={
          <button className="button button-primary" type="button" onClick={() => setIsCreateOpen(true)}>
            <Icon name="plus" />
            New resource
          </button>
        }
      />

      <section className="panel vault-panel">
        <div className="project-toolbar">
          <div>
            <span className="eyebrow">Resources</span>
            <h2>{entries.length} resource{entries.length === 1 ? '' : 's'}</h2>
          </div>
          <div className="toolbar-fields">
            <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vault" />
            <SelectField
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              label="Filter by type"
              options={VAULT_ENTRY_TYPES}
              placeholder="All types"
            />
            <SelectField value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} label="Filter by category" options={categories.filter((category): category is string => Boolean(category)).map((category) => ({ value: category, label: category }))} placeholder="All categories" />
            <SelectField value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} label="Filter by project" options={(projectsQuery.data || []).map((project) => ({ value: String(project.id), label: project.name }))} placeholder="All projects" />
          </div>
        </div>

        {entriesQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />Loading vault…</div>
        ) : entriesQuery.error ? (
          <EmptyState icon="alert" title="Failed to load vault" message={entriesQuery.error.message} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="lock"
            title={search || typeFilter ? 'No matching resources' : 'Vault is empty'}
            message={search || typeFilter ? 'Adjust your search filters.' : 'Create the first vault resource to securely store links, credentials, or notes.'}
            action={!search && !typeFilter ? <button className="button button-secondary" type="button" onClick={() => setIsCreateOpen(true)}><Icon name="plus" size={14} />Add resource</button> : null}
          />
        ) : (
          <div className="detail-list">
            {filtered.map((entry) => (
              <VaultEntryRow
                key={entry.id}
                entry={entry}
                currentUser={currentUser}
                projects={projectsQuery.data || []}
                onEdit={() => setEditTarget(entry)}
                onDelete={() => setDeleteTarget(entry)}
                onReveal={() => setRevealTarget(entry)}
              />
            ))}
          </div>
        )}
      </section>

      {isCreateOpen && <VaultEntryDialog onClose={() => setIsCreateOpen(false)} />}
      {editTarget && <VaultEntryDialog entry={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete vault resource"
          description={`Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          isPending={deleteEntry.isPending}
          onConfirm={() => deleteEntry.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
      {revealTarget && <SecretRevealDialog entry={revealTarget} onClose={() => setRevealTarget(null)} />}
    </>
  );
}

interface VaultEntryRowProps {
  currentUser: User;
  entry: VaultEntry;
  projects: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onReveal: () => void;
}

function VaultEntryRow({ currentUser, entry, projects, onEdit, onDelete, onReveal }: VaultEntryRowProps) {
  const hasSecret = entry.entry_type === 'credential' || entry.entry_type === 'secret_key';
  const projectName = entry.project_id ? projects.find((project) => project.id === entry.project_id)?.name || `Project ${entry.project_id}` : 'Organization-wide';
  const files = entry.files || [];

  return (
    <div className="detail-list-row vault-entry-row">
      <span className="vault-entry-icon">
        <Icon name={hasSecret ? 'lock' : entry.entry_type === 'external_link' ? 'external' : 'check'} size={16} />
      </span>
      <span className="detail-list-copy">
        <strong>{entry.title}</strong>
        <small>{VAULT_ENTRY_TYPES.find((t) => t.value === entry.entry_type)?.label || entry.entry_type} · {entry.category || 'General'} · {projectName}</small>
        {files.length > 0 && (
          <span className="vault-file-list">
            {files.map((file) => <VaultFileActions key={file.id} currentUser={currentUser} file={file} />)}
          </span>
        )}
      </span>
      <div className="vault-entry-actions">
        {hasSecret && canRevealSecret(currentUser) && (
          <button className="text-button" type="button" onClick={onReveal}>
            <Icon name="lock" size={13} />
            Reveal
          </button>
        )}
        {entry.external_url && (
          <a className="text-button" href={entry.external_url} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={13} />
            Open
          </a>
        )}
        <button className="text-button" type="button" onClick={onEdit}>Edit</button>
        <button className="text-button text-button-danger" type="button" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

interface VaultFileActionsProps {
  currentUser: User;
  file: VaultFile;
}

function VaultFileActions({ currentUser, file }: VaultFileActionsProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const canReview = isAdmin(currentUser) && file.storage_status === 'quarantined';
  const canDelete = isAdmin(currentUser) || (file.storage_status === 'pending' && file.uploaded_by_user_id === currentUser.id);
  const reviewFile = useMutation({
    mutationFn: (status: 'available' | 'rejected') => api.reviewVaultFile(file.id, status),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
    },
    onError: (err: Error) => setError(err.message),
  });
  const deleteFile = useMutation({
    mutationFn: () => api.deleteVaultFile(file.id),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleDownload = async () => {
    setError('');
    try {
      const result = await api.getFileDownload(file.id);
      window.location.assign(result.download_url);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <span className="vault-file-chip">
      <span>{file.original_filename}</span>
      <small>{formatFileSize(file.size_bytes)} · {formatFileStatus(file.storage_status)}</small>
      {file.storage_status === 'available' && <button className="text-button" type="button" onClick={handleDownload}>Download</button>}
      {canReview && <button className="text-button" type="button" disabled={reviewFile.isPending} onClick={() => reviewFile.mutate('available')}>Approve</button>}
      {canReview && <button className="text-button text-button-danger" type="button" disabled={reviewFile.isPending} onClick={() => reviewFile.mutate('rejected')}>Reject</button>}
      {canDelete && <button className="text-button text-button-danger" type="button" disabled={deleteFile.isPending} onClick={() => deleteFile.mutate()}>Remove</button>}
      {error && <em role="alert">{error}</em>}
    </span>
  );
}

interface VaultEntryDialogProps {
  entry?: VaultEntry;
  onClose: () => void;
}

function VaultEntryDialog({ entry, onClose }: VaultEntryDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(entry);
  const [form, setForm] = useState({
    title: entry?.title || '',
    entry_type: entry?.entry_type || 'credential',
    category: entry?.category || '',
    markdown_content: entry?.markdown_content || '',
    external_url: entry?.external_url || '',
    project_id: entry?.project_id ? String(entry.project_id) : '',
    secret_value: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState('');
  const [preparedFileId, setPreparedFileId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(), queryFn: ({ signal }) => api.listProjects({ signal }) });

  const createEntry = useMutation({
    mutationFn: async (data: { title: string; entry_type: VaultEntryType; category?: string; markdown_content?: string; external_url?: string; project_id?: number | null; secret_value?: string }) => {
      setUploadStep(isEditing ? 'Saving changes' : 'Creating resource');
      const savedEntry = isEditing ? await api.updateVaultEntry(entry!.id, data) : await api.createVaultEntry(data);
      if (selectedFile) {
        setUploadStep('Preparing upload');
        const intent = await api.createUploadIntent(savedEntry.id ?? 0, { filename: selectedFile.name, content_type: selectedFile.type, size_bytes: selectedFile.size });
        setPreparedFileId(intent.file_id);
        if (!intent.upload_url) { throw new Error('Upload could not be prepared.'); }
        setUploadStep('Uploading');
        await api.uploadToSignedUrl(intent.upload_url, selectedFile);
        setUploadStep('Verifying');
        await api.finalizeUpload(intent.file_id ?? 0, {});
        setUploadStep('Awaiting approval');
      }
      return savedEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
      if (form.project_id) queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries({ project_id: form.project_id }) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const payload: { title: string; entry_type: VaultEntryType; category?: string; markdown_content?: string; external_url?: string; project_id?: number | null; secret_value?: string } = {
      title: form.title,
      entry_type: form.entry_type as VaultEntryType,
      category: form.category || undefined,
      markdown_content: form.markdown_content || undefined,
      external_url: form.external_url || undefined,
      project_id: form.project_id ? Number(form.project_id) : null,
    };
    if (!isEditing && form.secret_value) {
      payload.secret_value = form.secret_value;
    }
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!isEditing && form.entry_type === 'file') {
      const validationError = validateSelectedFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    createEntry.mutate(payload);
  };

  const updateField = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const isUploading = createEntry.isPending;
  const cleanupPreparedFile = async () => {
    if (!preparedFileId) return;
    await api.deleteVaultFile(preparedFileId);
    setPreparedFileId(null);
    setUploadStep('');
    queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
  };

  return (
    <DialogShell title={isEditing ? 'Edit resource' : 'Create resource'} description={isEditing ? 'Update vault resource details.' : 'Add a new resource to the secure vault.'} closeDisabled={isUploading} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {uploadStep ? `${uploadStep} failed: ` : ''}{error}
            {preparedFileId && <button className="text-button" type="button" onClick={cleanupPreparedFile}>Remove pending upload</button>}
          </div>
        )}
        {uploadStep && <div className="upload-steps" aria-live="polite"><span className="spinner" />{uploadStep}</div>}
        <div className="field-group">
          <label htmlFor="entry-title">Title</label>
          <input id="entry-title" required disabled={isUploading} value={form.title} onChange={updateField('title')} placeholder="e.g. Production API key" />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="entry-type">Type</label>
            <select id="entry-type" value={form.entry_type} disabled={isEditing || isUploading} onChange={updateField('entry_type')}>
              {VAULT_ENTRY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="entry-category">Category</label>
            <input id="entry-category" disabled={isUploading} value={form.category} onChange={updateField('category')} placeholder="e.g. Infrastructure" />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="entry-project">Project</label>
          <select id="entry-project" value={form.project_id} disabled={isUploading || projectsQuery.isLoading} onChange={updateField('project_id')}>
            <option value="">Organization-wide</option>
            {(projectsQuery.data || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        {form.entry_type === 'external_link' && (
          <div className="field-group">
            <label htmlFor="entry-url">External URL</label>
            <input id="entry-url" type="url" disabled={isUploading} value={form.external_url} onChange={updateField('external_url')} placeholder="https://..." />
          </div>
        )}
        {(form.entry_type === 'credential' || form.entry_type === 'secret_key') && (
          <div className="field-group">
            <label htmlFor="entry-secret">Secret value</label>
            <textarea id="entry-secret" disabled={isUploading} value={form.secret_value} onChange={updateField('secret_value')} placeholder="Enter the secret value… This will be stored encrypted." />
          </div>
        )}
        {form.entry_type === 'markdown_note' && <div className="field-group"><label htmlFor="entry-notes">Markdown content</label><textarea id="entry-notes" disabled={isUploading} value={form.markdown_content} onChange={updateField('markdown_content')} placeholder="Write Markdown content…" /></div>}
        {form.entry_type === 'file' && !isEditing && (
          <div className="field-group">
            <label htmlFor="entry-file">File</label>
            <input id="entry-file" type="file" required disabled={isUploading} onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
            <small className="field-help">Accepted: PDF, images, text, Markdown, CSV, JSON, ZIP, Word, and Excel files up to 50 MB.</small>
          </div>
        )}
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" disabled={isUploading} onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create resource'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

function validateSelectedFile(file: File | null): string {
  if (!file) return 'Choose a file before creating this resource.';
  if (!ALLOWED_FILE_TYPES.has(file.type)) return 'This file type is not allowed.';
  if (file.size <= 0) return 'The selected file is empty.';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'The selected file is larger than 50 MB.';
  return '';
}

function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileStatus(status?: VaultFile['storage_status']): string {
  if (status === 'quarantined') return 'Awaiting approval';
  if (status === 'deletion_pending') return 'Removal pending';
  return status ? status.replaceAll('_', ' ') : 'Pending';
}

interface SecretRevealDialogProps {
  entry: VaultEntry;
  onClose: () => void;
}

function SecretRevealDialog({ entry, onClose }: SecretRevealDialogProps) {
  const [secret, setSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    api.revealVaultSecret(entry.id)
      .then((data) => {
        setSecret(data.secret_value || '');
        setIsLoading(false);
        timeoutId = setTimeout(() => {
          setSecret(null);
          onClose();
        }, 30_000);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
    return () => clearTimeout(timeoutId);
  }, [entry.id, onClose]);

  const handleCopy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <DialogShell title="Secret value" description="This value will be cleared automatically after 30 seconds." onClose={() => { setSecret(null); onClose(); }}>
      <div className="dialog-body">
        {isLoading ? (
          <div className="loading-state"><span className="spinner" />Decrypting…</div>
        ) : error ? (
          <div className="error-banner" role="alert">{error}</div>
        ) : (
          <>
            <div className="secret-reveal">
              <code className="secret-value">{secret || '(empty)'}</code>
            </div>
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <button className="button button-primary" type="button" onClick={() => { setSecret(null); onClose(); }}>Close</button>
            </div>
          </>
        )}
      </div>
    </DialogShell>
  );
}
