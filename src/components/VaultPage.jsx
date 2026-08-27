import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { VAULT_ENTRY_TYPES } from '../constants.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import DialogShell from './DialogShell.jsx';
import EmptyState from './EmptyState.jsx';
import Icon from './Icon.jsx';
import PageHeader from './PageHeader.jsx';
import { SearchField, SelectField } from './FilterBar.jsx';

const EMPTY_ENTRIES = [];

export default function VaultPage({ onMenu }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [revealTarget, setRevealTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const entriesQuery = useQuery({
    queryKey: queryKeys.vaultEntries({ project_id: projectFilter }),
    queryFn: ({ signal }) => api.listVaultEntries({ signal, project_id: projectFilter }),
  });

  const deleteEntry = useMutation({
    mutationFn: (id) => api.deleteVaultEntry(id),
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

      <section className="vault-hero">
        <div className="vault-shield"><Icon name="lock" size={24} /></div>
        <div>
          <span className="eyebrow">Security boundary</span>
          <h2>Encrypted vault storage</h2>
          <p>Secret values are never cached in browser state. Files are stored in encrypted cloud storage with audit logging.</p>
        </div>
      </section>

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
            <SelectField value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} label="Filter by category" options={categories.map((category) => ({ value: category, label: category }))} placeholder="All categories" />
            <SelectField value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} label="Filter by project" options={(projectsQuery.data || []).map((project) => ({ value: project.id, label: project.name }))} placeholder="All projects" />
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

function VaultEntryRow({ entry, onEdit, onDelete, onReveal }) {
  const hasSecret = entry.entry_type === 'credential' || entry.entry_type === 'secret_key';

  return (
    <div className="detail-list-row vault-entry-row">
      <span className="vault-entry-icon">
        <Icon name={hasSecret ? 'lock' : entry.entry_type === 'external_link' ? 'external' : 'check'} size={16} />
      </span>
      <span className="detail-list-copy">
        <strong>{entry.title}</strong>
        <small>{VAULT_ENTRY_TYPES.find((t) => t.value === entry.entry_type)?.label || entry.entry_type} · {entry.category || 'General'}</small>
      </span>
      <div className="vault-entry-actions">
        {hasSecret && (
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

function VaultEntryDialog({ entry, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(entry);
  const [form, setForm] = useState({
    title: entry?.title || '',
    entry_type: entry?.entry_type || 'credential',
    category: entry?.category || '',
    markdown_content: entry?.markdown_content || '',
    external_url: entry?.external_url || '',
    secret_value: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  const createEntry = useMutation({
    mutationFn: async (data) => {
      const savedEntry = isEditing ? await api.updateVaultEntry(entry.id, data) : await api.createVaultEntry(data);
      if (selectedFile) {
        const intent = await api.createUploadIntent(savedEntry.id, { filename: selectedFile.name, content_type: selectedFile.type, size_bytes: selectedFile.size });
        await api.uploadToSignedUrl(intent.upload_url, selectedFile);
        await api.finalizeUpload(intent.file_id, {});
      }
      return savedEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vaultEntries() });
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      title: form.title,
      entry_type: form.entry_type,
      category: form.category || undefined,
      markdown_content: form.markdown_content || undefined,
      external_url: form.external_url || undefined,
    };
    if (!isEditing && form.secret_value) {
      payload.secret_value = form.secret_value;
    }
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    createEntry.mutate(payload);
  };

  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <DialogShell title={isEditing ? 'Edit resource' : 'Create resource'} description={isEditing ? 'Update vault resource details.' : 'Add a new resource to the secure vault.'} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="entry-title">Title</label>
          <input id="entry-title" required value={form.title} onChange={updateField('title')} placeholder="e.g. Production API key" />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="entry-type">Type</label>
            <select id="entry-type" value={form.entry_type} onChange={updateField('entry_type')}>
              {VAULT_ENTRY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="entry-category">Category</label>
            <input id="entry-category" value={form.category} onChange={updateField('category')} placeholder="e.g. Infrastructure" />
          </div>
        </div>
        {form.entry_type === 'external_link' && (
          <div className="field-group">
            <label htmlFor="entry-url">External URL</label>
            <input id="entry-url" type="url" value={form.external_url} onChange={updateField('external_url')} placeholder="https://..." />
          </div>
        )}
        {(form.entry_type === 'credential' || form.entry_type === 'secret_key') && (
          <div className="field-group">
            <label htmlFor="entry-secret">Secret value</label>
            <textarea id="entry-secret" value={form.secret_value} onChange={updateField('secret_value')} placeholder="Enter the secret value… This will be stored encrypted." />
          </div>
        )}
        {form.entry_type === 'markdown_note' && <div className="field-group"><label htmlFor="entry-notes">Markdown content</label><textarea id="entry-notes" value={form.markdown_content} onChange={updateField('markdown_content')} placeholder="Write Markdown content…" /></div>}
        {form.entry_type === 'file' && !isEditing && <div className="field-group"><label htmlFor="entry-file">File</label><input id="entry-file" type="file" required onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /></div>}
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create resource'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

function SecretRevealDialog({ entry, onClose }) {
  const [secret, setSecret] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timeoutId;
    api.revealVaultSecret(entry.id)
      .then((data) => {
        setSecret(data.secret_value || data.value || data.secret || '');
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
