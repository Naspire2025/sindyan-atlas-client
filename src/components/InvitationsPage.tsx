import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { CreateInvitationPayload, Invitation, UserRole } from '../types/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface InvitationsPageProps {
  onMenu: () => void;
}

export default function InvitationsPage({ onMenu }: InvitationsPageProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [resendTarget, setResendTarget] = useState<Invitation | null>(null);

  const invitationsQuery = useQuery({
    queryKey: queryKeys.invitations,
    queryFn: ({ signal }) => api.listInvitations(signal),
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: number) => api.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
      setRevokeTarget(null);
    },
  });

  const resendInvitation = useMutation({
    mutationFn: (id: number) => api.resendInvitation(id),
    onSuccess: () => {
      setResendTarget(null);
    },
  });

  const invitations = invitationsQuery.data || [];
  const pending = invitations.filter((inv) => inv.status === 'pending');
  const accepted = invitations.filter((inv) => inv.status === 'accepted');
  const revoked = invitations.filter((inv) => inv.status === 'revoked' || inv.status === 'expired');

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Invitations"
        description="Manage pending and historical user invitations."
        onMenu={onMenu}
        action={
          <button className="button button-primary" type="button" onClick={() => setIsCreateOpen(true)}>
            <Icon name="plus" />
            New invitation
          </button>
        }
      />

      <section className="panel vault-panel">
        {invitationsQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />Loading invitations…</div>
        ) : invitationsQuery.error ? (
          <EmptyState icon="alert" title="Failed to load invitations" message={invitationsQuery.error.message} />
        ) : (
          <>
            <InvitationSection title="Pending" count={pending.length} items={pending} onResend={setResendTarget} onRevoke={setRevokeTarget} />
            <InvitationSection title="Accepted" count={accepted.length} items={accepted} />
            <InvitationSection title="Revoked" count={revoked.length} items={revoked} />
          </>
        )}
      </section>

      {isCreateOpen && <CreateInvitationDialog onClose={() => setIsCreateOpen(false)} />}
      {revokeTarget && (
        <ConfirmDialog
          title="Revoke invitation"
          description={`Are you sure you want to revoke the invitation for ${revokeTarget.email}? This cannot be undone.`}
          confirmLabel="Revoke"
          isPending={revokeInvitation.isPending}
          onConfirm={() => revokeInvitation.mutate(revokeTarget.id)}
          onCancel={() => setRevokeTarget(null)}
          variant="danger"
        />
      )}
      {resendTarget && (
        <ConfirmDialog
          title="Resend invitation"
          description={`Send a new invitation email to ${resendTarget.email}?`}
          confirmLabel="Resend"
          isPending={resendInvitation.isPending}
          onConfirm={() => resendInvitation.mutate(resendTarget.id)}
          onCancel={() => setResendTarget(null)}
        />
      )}
    </>
  );
}

interface InvitationSectionProps {
  title: string;
  count: number;
  items: Invitation[];
  onResend?: (inv: Invitation) => void;
  onRevoke?: (inv: Invitation) => void;
}

function InvitationSection({ title, count, items, onResend, onRevoke }: InvitationSectionProps) {
  return (
    <div className="invitation-section">
      <div className="section-header compact">
        <h3>{title}</h3>
        <span className="count-pill">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="invitation-empty">No {title.toLowerCase()} invitations.</p>
      ) : (
        <div className="detail-list">
          {items.map((inv) => (
            <div className="detail-list-row" key={inv.id}>
              <span className="avatar">{inv.email?.slice(0, 2).toUpperCase() || '—'}</span>
              <span className="detail-list-copy">
                <strong>{inv.email}</strong>
                <small>{inv.role || 'team_member'} · Invited {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'recently'}</small>
              </span>
              <div className="invitation-actions">
                {inv.status === 'pending' && (
                  <>
                    {onResend && <button className="text-button" type="button" onClick={() => onResend(inv)}>Resend</button>}
                    {onRevoke && <button className="text-button text-button-danger" type="button" onClick={() => onRevoke(inv)}>Revoke</button>}
                  </>
                )}
                <span className={`status-badge status-${inv.status === 'accepted' ? 'done' : inv.status === 'pending' ? 'on_hold' : 'cancelled'}`}>
                  <span className="status-dot" />
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateInvitationDialogProps {
  onClose: () => void;
}

function CreateInvitationDialog({ onClose }: CreateInvitationDialogProps) {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(), queryFn: ({ signal }) => api.listProjects({ signal }) });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'team_member'>('team_member');
  const [projectAssignments, setProjectAssignments] = useState<{ project_id: number; project_role: string }[]>([]);
  const [error, setError] = useState('');

  const createInvitation = useMutation({
    mutationFn: (data: { name: string; email: string; role: UserRole; project_assignments: { project_id: number; project_role: string }[] }) => api.createInvitation(data as CreateInvitationPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    createInvitation.mutate({ name: name.trim(), email: email.trim(), role, project_assignments: projectAssignments });
  };

  const toggleProjectAssignment = (projectId: number) => {
    setProjectAssignments((assignments) => assignments.some((item) => item.project_id === projectId)
      ? assignments.filter((item) => item.project_id !== projectId)
      : [...assignments, { project_id: projectId, project_role: 'member' }]);
  };

  return (
    <DialogShell title="Send invitation" description="Invite a new team member by email. They will receive a link to set up their account." onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="invite-name">Name</label><input id="invite-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Colleague name" /></div>
        <div className="field-group">
          <label htmlFor="invite-email">Email address</label>
          <input id="invite-email" autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@company.com" />
        </div>
        <div className="field-group"><label htmlFor="invite-role">Organization role</label><select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="team_member">Team member</option><option value="admin">Administrator</option></select></div>
        <fieldset className="field-group"><legend>Initial project access</legend>{projectsQuery.isLoading ? <span>Loading projects…</span> : (projectsQuery.data || []).map((project) => <label key={project.id}><input type="checkbox" checked={projectAssignments.some((item) => item.project_id === project.id)} onChange={() => toggleProjectAssignment(project.id)} /> {project.name}</label>)}</fieldset>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={createInvitation.isPending}>
            {createInvitation.isPending ? 'Sending…' : 'Send invitation'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
