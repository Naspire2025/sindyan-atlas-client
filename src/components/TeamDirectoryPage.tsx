import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { User, UserRole } from '../types/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface TeamDirectoryPageProps {
  onMenu: () => void;
  onSelectMember: (userId: number) => void;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'team_member', label: 'Team member' },
];
const EMPTY_USERS: User[] = [];

export default function TeamDirectoryPage({ onMenu, onSelectMember }: TeamDirectoryPageProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      setEditTarget(null);
    },
  });

  const users = usersQuery.data || EMPTY_USERS;
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (!q) return true;
      return `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(q);
    }).filter((user) => {
      return (!roleFilter || user.role === roleFilter) && (!statusFilter || user.status === statusFilter);
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Team directory"
        description="Manage user accounts, roles, and access."
        onMenu={onMenu}
      />

      <section className="panel vault-panel">
        <div className="project-toolbar">
          <div>
            <span className="eyebrow">Directory</span>
            <h2>{users.length} user{users.length === 1 ? '' : 's'}</h2>
          </div>
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search team</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" />
          </label>
          <label className="select-field"><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">All roles</option>{ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
          <label className="select-field"><span className="sr-only">Filter by account status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending</option></select></label>
        </div>

        {usersQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />Loading team…</div>
        ) : usersQuery.error ? (
          <EmptyState icon="alert" title="Failed to load team" message={usersQuery.error.message} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon="users" title="No team members found" message={search ? 'Try adjusting your search.' : 'No team members have been invited yet.'} />
        ) : (
          <div className="member-grid">
            {filteredUsers.map((user) => (
              <article className="member-card" key={user.id}>
                <span className="avatar avatar-large">{user.name?.slice(0, 2).toUpperCase() || '—'}</span>
                <div className="member-copy">
                  <button className="text-button member-name-button" type="button" onClick={() => onSelectMember(user.id)}>{user.name}</button>
                  <span>{user.email}</span>
                </div>
                <span className="role-pill">{user.role === 'admin' ? 'Admin' : 'Member'}</span>
                <span className={`status-badge status-${user.status === 'active' ? 'active' : 'cancelled'}`}><span className="status-dot" />{user.status}</span>
                <div className="member-projects">
                  <span>Actions</span>
                  <button type="button" onClick={() => setEditTarget(user)}>Edit role</button>
                  {user.status === 'active' && user.role !== 'admin' && (
                    <button type="button" onClick={() => setSuspendTarget(user)}>Suspend</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editTarget && (
        <EditRoleDialog user={editTarget} isPending={updateUser.isPending} onSave={(data: { role: UserRole }) => updateUser.mutate({ id: editTarget.id, data })} onClose={() => setEditTarget(null)} />
      )}
      {suspendTarget && (
        <ConfirmDialog
          title="Suspend user"
          description={`Are you sure you want to suspend ${suspendTarget.name}? They will lose access to all projects.`}
          confirmLabel="Suspend"
          isPending={updateUser.isPending}
          onConfirm={() => updateUser.mutate({ id: suspendTarget.id, data: { status: 'suspended' } })}
          onCancel={() => setSuspendTarget(null)}
          variant="danger"
        />
      )}
    </>
  );
}

interface EditRoleDialogProps {
  user: User;
  isPending: boolean;
  onSave: (data: { role: UserRole }) => void;
  onClose: () => void;
}

function EditRoleDialog({ user, isPending, onSave, onClose }: EditRoleDialogProps) {
  const [role, setRole] = useState(user.role || 'team_member');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    onSave({ role });
  };

  return (
    <DialogShell title={`Edit ${user.name}`} description="Change the user's account role." onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="edit-role">Account role</label>
          <select id="edit-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
