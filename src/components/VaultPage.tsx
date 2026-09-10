import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { VAULT_ENTRY_TYPES } from '../constants.js';
import type { Project, User, VaultEntry, VaultEntryType, VaultFile } from '../types/api.js';
import { canRevealSecret, isAdmin } from '../auth/permissions.js';
import ConfirmDialog from './ConfirmDialog.js';
import { DetailList, DetailRow } from './DetailList.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';
import type { MessageId } from '../i18n/messages/en.js';


import PageHeader from './PageHeader.js';
import { SearchField, SelectField } from './FilterBar.js';
import VaultFileViewer from './VaultFileViewer.js';
import { CircleCheck, Download, ExternalLink, Eye, FileText, Lock, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';

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
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VaultEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);
  const [revealTarget, setRevealTarget] = useState<VaultEntry | null>(null);
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const entriesQuery = useQuery({
    queryKey: queryKeys.vaultEntries({ project_id: projectFilter, owner_user_id: ownerFilter }),
    queryFn: ({ signal }) => api.listVaultEntries({ signal, project_id: projectFilter, owner_user_id: ownerFilter }),
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => api.deleteVaultEntry(id),
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
  const usersQuery = useQuery({ queryKey: queryKeys.users(), queryFn: ({ signal }) => api.listUsers({ signal }) });
  const categories = [...new Set(entries.map((entry) => entry.category).filter(Boolean))];

  return (
    <>
      <PageHeader
        eyebrow={intl.formatMessage({ id: 'vault.eyebrow' })}
        title={intl.formatMessage({ id: 'vault.title' })}
        description={intl.formatMessage({ id: 'vault.description' })}
        onMenu={onMenu}
        action={
          <button className="button button-primary" type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus />
            {intl.formatMessage({ id: 'vault.newEntry' })}
          </button>
        }
      />

      <section className="panel vault-panel">
        <div className="project-toolbar">
          <div>
            <span className="eyebrow">{intl.formatMessage({ id: 'vault.eyebrow' })}</span>
            <h2>{intl.formatMessage({ id: 'vault.entryCount' }, { n: entries.length })}</h2>
          </div>
          <div className="toolbar-fields">
            <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder={intl.formatMessage({ id: 'vault.search' })} />
            <SelectField
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              label={intl.formatMessage({ id: 'vault.entryType' })}
              options={VAULT_ENTRY_TYPES}
              placeholder={intl.formatMessage({ id: 'vault.filterAll' })}
            />
            <SelectField value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} label={intl.formatMessage({ id: 'vault.entryCategory' })} options={categories.filter((category): category is string => Boolean(category)).map((category) => ({ value: category, label: category }))} placeholder={intl.formatMessage({ id: 'vault.filterAll' })} translateOptionLabels={false} />
            <SelectField value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} label={intl.formatMessage({ id: 'vault.entryProject' })} options={(projectsQuery.data || []).map((project) => ({ value: String(project.id), label: project.name }))} placeholder={intl.formatMessage({ id: 'vault.filterAll' })} translateOptionLabels={false} />
            <SelectField value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} label={intl.formatMessage({ id: 'vault.entryOwner' })} options={(usersQuery.data || []).map((user) => ({ value: user.id, label: user.name }))} placeholder={intl.formatMessage({ id: 'vault.filterAll' })} translateOptionLabels={false} />
          </div>
        </div>

        {entriesQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />{intl.formatMessage({ id: 'common.loading' })}</div>
        ) : entriesQuery.error ? (
          <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'error.global' })} message={entriesQuery.error.message} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Lock}
            title={search || typeFilter ? intl.formatMessage({ id: 'vault.noMatchingEntries' }) : intl.formatMessage({ id: 'vault.noEntries' })}
            message={search || typeFilter ? intl.formatMessage({ id: 'common.adjustSearchFilters' }) : intl.formatMessage({ id: 'vault.noEntriesMessage' })}
            action={!search && !typeFilter ? <button className="button button-secondary" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={14} />{intl.formatMessage({ id: 'vault.newEntry' })}</button> : null}
          />
        ) : (
          <DetailList>
            {filtered.map((entry) => (
              <VaultEntryRow
                key={entry.id}
                entry={entry}
                currentUser={currentUser}
                projects={projectsQuery.data || []}
                onEdit={() => setEditTarget(entry)}
                onDelete={() => setDeleteTarget(entry)}
                onReveal={() => setRevealTarget(entry)}
                onPreview={setPreviewFile}
              />
            ))}
          </DetailList>
        )}
      </section>

      {isCreateOpen && <VaultEntryDialog onClose={() => setIsCreateOpen(false)} />}
      {editTarget && <VaultEntryDialog entry={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'vault.deleteEntry' })}
          description={intl.formatMessage({ id: 'vault.deleteEntryConfirm' }, { title: deleteTarget.title })}
          confirmLabel={intl.formatMessage({ id: 'common.delete' })}
          isPending={deleteEntry.isPending}
          onConfirm={() => deleteEntry.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
      {revealTarget && <SecretRevealDialog entry={revealTarget} onClose={() => setRevealTarget(null)} />}
      {previewFile && <VaultFileViewer key={previewFile.id} file={previewFile} onClose={() => setPreviewFile(null)} />}
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
  onPreview: (file: VaultFile) => void;
}

function VaultEntryRow({ currentUser, entry, projects, onEdit, onDelete, onReveal, onPreview }: VaultEntryRowProps) {
  const intl = useIntl();
  const hasSecret = entry.entry_type === 'credential' || entry.entry_type === 'secret_key';
  const projectName = entry.project_id ? projects.find((project) => project.id === entry.project_id)?.name || intl.formatMessage({ id: 'vault.projectNumber' }, { id: entry.project_id }) : intl.formatMessage({ id: 'vault.organizationWide' });
  const files = (entry.files || []).filter(isPresentVaultFile);

  return (
    <DetailRow className="vault-entry-row">
      <span className="vault-entry-icon">
        {hasSecret ? <Lock size={16} /> : entry.entry_type === 'external_link' ? <ExternalLink size={16} /> : <CircleCheck size={16} />}
      </span>
      <span className="detail-list-copy">
        <strong>{entry.title}</strong>
        <small>{intl.formatMessage({ id: VAULT_ENTRY_TYPES.find((t) => t.value === entry.entry_type)?.label as string })} · {entry.category || 'General'} · {projectName}</small>
        {files.length > 0 && (
          <span className="vault-file-list">
            {files.map((file) => <VaultFileActions key={file.id} currentUser={currentUser} file={file} onPreview={() => onPreview(file)} />)}
          </span>
        )}
      </span>
      <div className="vault-entry-actions">
        {hasSecret && canRevealSecret(currentUser) && (
          <button className="text-button" type="button" onClick={onReveal}>
            <Lock size={13} />
            {intl.formatMessage({ id: 'vault.revealSecret' })}
          </button>
        )}
        {entry.external_url && (
          <a className="text-button" href={entry.external_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} />
            {intl.formatMessage({ id: 'vault.visitLink' })}
          </a>
        )}
        <button className="text-button" type="button" onClick={onEdit}>
          <Pencil size={13} />
          {intl.formatMessage({ id: 'vault.editEntry' })}
        </button>
        <button className="text-button text-button-danger" type="button" onClick={onDelete}>
          <Trash2 size={13} />
          {intl.formatMessage({ id: 'vault.deleteEntry' })}
        </button>
      </div>
    </DetailRow>
  );
}

interface VaultFileActionsProps {
  currentUser: User;
  file: VaultFile;
  onPreview: () => void;
}

function VaultFileActions({ currentUser, file, onPreview }: VaultFileActionsProps) {
  const intl = useIntl();
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
      <small>{formatFileSize(file.size_bytes)} · {formatFileStatus(file.storage_status, (id) => intl.formatMessage({ id }))}</small>
      {file.storage_status === 'available' && (
        <button className="text-button" type="button" onClick={onPreview}>
          <Eye size={11} />
          {intl.formatMessage({ id: 'vault.viewEntry' })}
        </button>
      )}
      {file.storage_status === 'available' && (
        <button className="text-button" type="button" onClick={handleDownload}>
          <Download size={11} />
          {intl.formatMessage({ id: 'common.download' })}
        </button>
      )}
      {canReview && <button className="text-button" type="button" disabled={reviewFile.isPending} onClick={() => reviewFile.mutate('available')}>{intl.formatMessage({ id: 'vault.approve' })}</button>}      {canReview && <button className="text-button text-button-danger" type="button" disabled={reviewFile.isPending} onClick={() => reviewFile.mutate('rejected')}>{intl.formatMessage({ id: 'vault.reject' })}</button>}
      {canDelete && (
        <button className="text-button text-button-danger" type="button" disabled={deleteFile.isPending} onClick={() => deleteFile.mutate()}>
          <Trash2 size={11} />
          {intl.formatMessage({ id: 'common.delete' })}
        </button>
      )}
      {error && <em role="alert">{error}</em>}
    </span>
  );
}

interface VaultEntryDialogProps {
  entry?: VaultEntry;
  onClose: () => void;
}

function VaultEntryDialog({ entry, onClose }: VaultEntryDialogProps) {
  const intl = useIntl();
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
  const [preparedFileId, setPreparedFileId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(), queryFn: ({ signal }) => api.listProjects({ signal }) });
  const uploadedFiles = (entry?.files || []).filter(isPresentVaultFile);
  const hasUploadedFile = uploadedFiles.length > 0;

  const uploadFile = async (entryId: string, file: File) => {
    let pendingFileId: string | null = null;
    try {
      setUploadStep(intl.formatMessage({ id: 'vault.uploadPreparing' }));
      const intent = await api.createUploadIntent(entryId, { filename: file.name, content_type: file.type, size_bytes: file.size });
      pendingFileId = intent.file_id;
      setPreparedFileId(intent.file_id);
      if (!intent.upload_url) throw new Error('Upload could not be prepared.');
      setUploadStep(intl.formatMessage({ id: 'vault.uploadUploading' }));
      await api.uploadToSignedUrl(intent.upload_url, file);
      setUploadStep(intl.formatMessage({ id: 'vault.uploadVerifying' }));
      await api.finalizeUpload(intent.file_id, {});
      setPreparedFileId(null);
    } catch (uploadError) {
      if (!pendingFileId) throw uploadError;
      setUploadStep(intl.formatMessage({ id: 'vault.uploadCleaningUp' }));      try {
        await api.deleteVaultFile(pendingFileId);
        setPreparedFileId(null);
      } catch (cleanupError) {
        throw new Error(`${errorMessage(uploadError)} Pending upload cleanup also failed: ${errorMessage(cleanupError)}`);
      }
      throw uploadError;
    }
  };

  const createEntry = useMutation({
    mutationFn: async (data: { title: string; entry_type: VaultEntryType; category?: string; markdown_content?: string; external_url?: string; project_id?: string | null; secret_value?: string }) => {
      setUploadStep(isEditing ? intl.formatMessage({ id: 'vault.savingChanges' }) : intl.formatMessage({ id: 'vault.creatingResource' }));
      const savedEntry = isEditing ? await api.updateVaultEntry(entry!.id, data) : await api.createVaultEntry(data);
      if (selectedFile) {
        await uploadFile(savedEntry.id, selectedFile);
      }
      return savedEntry;
    },
    onSuccess: () => {
      setUploadStep('');
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
      onClose();
    },
    onError: (err: Error) => {
      setUploadStep('');
      setError(err.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const payload: { title: string; entry_type: VaultEntryType; category?: string; markdown_content?: string; external_url?: string; project_id?: string | null; secret_value?: string } = {
      title: form.title,
      entry_type: form.entry_type as VaultEntryType,
      category: form.category || undefined,
      markdown_content: form.markdown_content || undefined,
      external_url: form.external_url || undefined,
      project_id: form.project_id || null,
    };
    if (form.secret_value.trim()) {
      payload.secret_value = form.secret_value;
    }
    if (!form.title.trim()) {
      setError(intl.formatMessage({ id: 'common.titleRequired' }));
      return;
    }
    const isSecretEntry = form.entry_type === 'credential' || form.entry_type === 'secret_key';
    if (!isEditing && isSecretEntry && !form.secret_value.trim()) {
      setError(intl.formatMessage({ id: 'vault.secretValueRequired' }));
      return;
    }
    if (form.entry_type === 'file' && !hasUploadedFile) {
      const validationError = validateSelectedFile(selectedFile);
      if (validationError) {
        setError(intl.formatMessage({ id: validationError as MessageId }));
        return;
      }
    }
    createEntry.mutate(payload);
  };

  const updateField = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const isUploading = createEntry.isPending;
  const cleanupPreparedFile = async () => {
    if (!preparedFileId) return;
    setError('');
    setUploadStep(intl.formatMessage({ id: 'vault.uploadRemoving' }));
    try {
      await api.deleteVaultFile(preparedFileId);
      setPreparedFileId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
    } catch (cleanupError) {
      setError(errorMessage(cleanupError));
    } finally {
      setUploadStep('');
    }
  };

  return (
    <DialogShell title={isEditing ? intl.formatMessage({ id: 'vault.updateEntry' }) : intl.formatMessage({ id: 'vault.createEntry' })} description={isEditing ? intl.formatMessage({ id: 'vault.updateEntryDescription' }) : intl.formatMessage({ id: 'vault.createEntryDescription' })} closeDisabled={isUploading} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            {preparedFileId && <button className="text-button mt-2 block" type="button" onClick={cleanupPreparedFile}>{intl.formatMessage({ id: 'vault.removePendingUpload' })}</button>}
          </div>
        )}
        {uploadStep && <div className="upload-steps" aria-live="polite"><span className="spinner" />{uploadStep}</div>}
        <div className="field-group">
          <label htmlFor="entry-title">{intl.formatMessage({ id: 'vault.entryTitle' })}</label>
          <input id="entry-title" required disabled={isUploading} value={form.title} onChange={updateField('title')} placeholder={intl.formatMessage({ id: 'vault.titlePlaceholder' })} />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="entry-type">{intl.formatMessage({ id: 'vault.entryType' })}</label>
            <select id="entry-type" value={form.entry_type} disabled={isEditing || isUploading} onChange={updateField('entry_type')}>
              {VAULT_ENTRY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{intl.formatMessage({ id: type.label })}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="entry-category">{intl.formatMessage({ id: 'vault.entryCategory' })}</label>
            <input id="entry-category" disabled={isUploading} value={form.category} onChange={updateField('category')} placeholder={intl.formatMessage({ id: 'vault.categoryPlaceholder' })} />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="entry-project">{intl.formatMessage({ id: 'vault.entryProject' })}</label>
          <select id="entry-project" value={form.project_id} disabled={isUploading || projectsQuery.isLoading} onChange={updateField('project_id')}>
            <option value="">{intl.formatMessage({ id: 'vault.organizationWide' })}</option>
            {(projectsQuery.data || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        {form.entry_type === 'external_link' && (
          <div className="field-group">
            <label htmlFor="entry-url">{intl.formatMessage({ id: 'vault.externalUrl' })}</label>
            <input id="entry-url" type="url" required disabled={isUploading} value={form.external_url} onChange={updateField('external_url')} placeholder="https://..." />
          </div>
        )}
        {(form.entry_type === 'credential' || form.entry_type === 'secret_key') && (
          <div className="field-group">
            <label htmlFor="entry-secret">{isEditing ? intl.formatMessage({ id: 'vault.replacementSecretValue' }) : intl.formatMessage({ id: 'vault.entrySecretKey' })}</label>
            <textarea id="entry-secret" required={!isEditing} disabled={isUploading} value={form.secret_value} onChange={updateField('secret_value')} placeholder={isEditing ? intl.formatMessage({ id: 'vault.secretPlaceholderKeep' }) : intl.formatMessage({ id: 'vault.secretValuePlaceholder' })} />
          </div>
        )}
        {form.entry_type === 'markdown_note' && <div className="field-group"><label htmlFor="entry-notes">{intl.formatMessage({ id: 'vault.entryMarkdownNote' })}</label><textarea id="entry-notes" disabled={isUploading} value={form.markdown_content} onChange={updateField('markdown_content')} placeholder={intl.formatMessage({ id: 'vault.markdownPlaceholder' })} /></div>}
        {form.entry_type === 'file' && hasUploadedFile && (
          <div className="field-group">
            <span className="mb-2 block text-[11px] text-fog">{intl.formatMessage({ id: 'vault.uploadedFile' })}</span>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div className="flex min-w-0 items-center gap-3 rounded-control border border-graphite bg-white/[0.02] p-3" key={file.id}>
                  <FileText className="shrink-0 text-fog" size={16} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[12px] font-[510] text-mist">{file.original_filename}</strong>
                    <small className="mt-1 block text-[10px] capitalize text-ash">
                      {formatFileSize(file.size_bytes)} · {formatFileStatus(file.storage_status, (id) => intl.formatMessage({ id }))}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {form.entry_type === 'file' && !hasUploadedFile && (
          <div className="field-group">
            <label htmlFor="entry-file">{intl.formatMessage({ id: 'vault.entryFile' })}</label>
            <input id="entry-file" type="file" required disabled={isUploading} onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
            <small className="field-help">{intl.formatMessage({ id: 'vault.fileHelpText' })}</small>
          </div>
        )}
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" disabled={isUploading} onClick={onClose}>{intl.formatMessage({ id: 'common.cancel' })}</button>
          <button className="button button-primary" type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending ? intl.formatMessage({ id: 'common.saving' }) : isEditing ? intl.formatMessage({ id: 'common.save' }) : intl.formatMessage({ id: 'vault.createEntry' })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

function validateSelectedFile(file: File | null): string {
  if (!file) return 'vault.fileRequired';
  if (!ALLOWED_FILE_TYPES.has(file.type)) return 'vault.fileTypeNotAllowed';
  if (file.size <= 0) return 'vault.fileEmpty';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'vault.fileTooLarge';
  return '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function isPresentVaultFile(file: VaultFile): boolean {
  return file.storage_status !== 'deleted' && file.storage_status !== 'rejected';
}

function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileStatus(status: VaultFile['storage_status'] | undefined, formatMessage: (id: MessageId) => string): string {
  if (status === 'quarantined') return formatMessage('vault.statusAwaitingApproval');
  if (status === 'deletion_pending') return formatMessage('vault.statusRemovalPending');
  return status ? status.replaceAll('_', ' ') : formatMessage('vault.statusPending');
}

interface SecretRevealDialogProps {
  entry: VaultEntry;
  onClose: () => void;
}

function SecretRevealDialog({ entry, onClose }: SecretRevealDialogProps) {
  const intl = useIntl();
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
    <DialogShell title={intl.formatMessage({ id: 'vault.entrySecretKey' })} description={intl.formatMessage({ id: 'vault.secretAutoClear' })} onClose={() => { setSecret(null); onClose(); }}>
      <div className="dialog-body">
        {isLoading ? (
          <div className="loading-state"><span className="spinner" />{intl.formatMessage({ id: 'common.loading' })}</div>
        ) : error ? (
          <div className="error-banner" role="alert">{error}</div>
        ) : (
          <>
            <div className="secret-reveal">
              <code className="secret-value">{secret || '(empty)'}</code>
            </div>
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={handleCopy}>
                {copied ? intl.formatMessage({ id: 'vault.copied' }) : intl.formatMessage({ id: 'vault.copyToClipboard' })}
              </button>
              <button className="button button-primary" type="button" onClick={() => { setSecret(null); onClose(); }}>{intl.formatMessage({ id: 'common.close' })}</button>
            </div>
          </>
        )}
      </div>
    </DialogShell>
  );
}
