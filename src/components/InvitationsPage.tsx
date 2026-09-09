import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { CreateInvitationPayload, Invitation, UserRole } from '../types/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import DialogShell from './DialogShell.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';


import PageHeader from './PageHeader.js';
import { Plus, TriangleAlert } from 'lucide-react';

interface InvitationsPageProps {
  onMenu: () => void;
}

export default function InvitationsPage({ onMenu }: InvitationsPageProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [resendTarget, setResendTarget] = useState<Invitation | null>(null);

  const invitationsQuery = useQuery({
    queryKey: queryKeys.invitations,
    queryFn: ({ signal }) => api.listInvitations(signal),
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => api.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
      setRevokeTarget(null);
    },
  });

  const resendInvitation = useMutation({
    mutationFn: (id: string) => api.resendInvitation(id),
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
        title={intl.formatMessage({ id: 'invitation.title' })}
        description={intl.formatMessage({ id: 'invitation.pageDescription' })}
        onMenu={onMenu}
        action={
          <button className="button button-primary" type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus />
            {intl.formatMessage({ id: 'invitation.newInvitation' })}
          </button>
        }
      />

      <section className="panel vault-panel">
        {invitationsQuery.isLoading ? (
          <div className="loading-state"><span className="spinner" />{intl.formatMessage({ id: 'common.loading' })}</div>
        ) : invitationsQuery.error ? (
          <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'invitation.failedToLoad' })} message={invitationsQuery.error.message} />
        ) : (
          <>
            <InvitationSection title={intl.formatMessage({ id: 'invitation.pending' })} count={pending.length} items={pending} onResend={setResendTarget} onRevoke={setRevokeTarget} />
            <InvitationSection title={intl.formatMessage({ id: 'invitation.accepted' })} count={accepted.length} items={accepted} />
            <InvitationSection title={intl.formatMessage({ id: 'invitation.revoked' })} count={revoked.length} items={revoked} />
          </>
        )}
      </section>

      {isCreateOpen && <CreateInvitationDialog onClose={() => setIsCreateOpen(false)} />}
      {revokeTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'invitation.revoke' })}
          description={`Are you sure you want to revoke the invitation for ${revokeTarget.email}? This cannot be undone.`}
          confirmLabel={intl.formatMessage({ id: 'invitation.revoke' })}
          isPending={revokeInvitation.isPending}
          onConfirm={() => revokeInvitation.mutate(revokeTarget.id)}
          onCancel={() => setRevokeTarget(null)}
          variant="danger"
        />
      )}
      {resendTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'invitation.resend' })}
          description={`Send a new invitation email to ${resendTarget.email}?`}
          confirmLabel={intl.formatMessage({ id: 'invitation.resend' })}
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
  const intl = useIntl();
  return (
    <div className="invitation-section">
      <div className="section-header compact">
        <h3>{title}</h3>
        <span className="count-pill">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="invitation-empty">{intl.formatMessage({ id: 'invitation.noneForStatus', values: { status: title.toLowerCase() } })}</p>
      ) : (
        <DetailList>
          {items.map((inv) => (
            <DetailRow key={inv.id}>
              <span className="avatar">{inv.email?.slice(0, 2).toUpperCase() || '\u2014'}</span>
              <span className="detail-list-copy">
                <strong>{inv.email}</strong>
                <small>{inv.role || 'team_member'} · {intl.formatMessage({ id: 'invitation.invited' })} {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : intl.formatMessage({ id: 'invitation.recently' })}</small>
              </span>
              <div className="invitation-actions">
                {inv.status === 'pending' && (
                  <>
                    {onResend && <button className="text-button" type="button" onClick={() => onResend(inv)}>{intl.formatMessage({ id: 'invitation.resendAction' })}</button>}
                    {onRevoke && <button className="text-button text-button-danger" type="button" onClick={() => onRevoke(inv)}>{intl.formatMessage({ id: 'invitation.revokeAction' })}</button>}
                  </>
                )}
                <span className={`status-badge status-${inv.status === 'accepted' ? 'done' : inv.status === 'pending' ? 'on_hold' : 'cancelled'}`}>
                  <span className="status-dot" />
                  {inv.status}
                </span>
              </div>
            </DetailRow>
          ))}
        </DetailList>
      )}
    </div>
  );
}

interface CreateInvitationDialogProps {
  onClose: () => void;
}

function CreateInvitationDialog({ onClose }: CreateInvitationDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(), queryFn: ({ signal }) => api.listProjects({ signal }) });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'team_member'>('team_member');
  const [projectAssignments, setProjectAssignments] = useState<{ project_id: string; project_role: string }[]>([]);
  const [error, setError] = useState('');

  const createInvitation = useMutation({
    mutationFn: (data: { name: string; email: string; role: UserRole; project_assignments: { project_id: string; project_role: string }[] }) => api.createInvitation(data as CreateInvitationPayload),
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
      setError(intl.formatMessage({ id: 'invitation.nameAndEmailRequired' }));
      return;
    }
    createInvitation.mutate({ name: name.trim(), email: email.trim(), role, project_assignments: projectAssignments });
  };

  const toggleProjectAssignment = (projectId: string) => {
    setProjectAssignments((assignments) => assignments.some((item) => item.project_id === projectId)
      ? assignments.filter((item) => item.project_id !== projectId)
      : [...assignments, { project_id: projectId, project_role: 'member' }]);
  };

  return (
    <DialogShell title={intl.formatMessage({ id: 'invitation.createTitle' })} description={intl.formatMessage({ id: 'invitation.createDescription' })} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group"><label htmlFor="invite-name">{intl.formatMessage({ id: 'invitation.createName' })}</label><input id="invite-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder={intl.formatMessage({ id: 'invitation.colleagueNamePlaceholder' })} /></div>
        <div className="field-group">
          <label htmlFor="invite-email">{intl.formatMessage({ id: 'invitation.createEmail' })}</label>
          <input id="invite-email" autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@company.com" />
        </div>
        <div className="field-group"><label htmlFor="invite-role">{intl.formatMessage({ id: 'invitation.createRole' })}</label><select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="team_member">{intl.formatMessage({ id: 'team.teamMember' })}</option><option value="admin">{intl.formatMessage({ id: 'team.admin' })}</option></select></div>
        <fieldset className="project-select-fieldset">
          <legend>{intl.formatMessage({ id: 'invitation.initialProjectAccess' })}</legend>
          {projectsQuery.isLoading ? (
            <span className="loading-projects">{intl.formatMessage({ id: 'common.loading' })}</span>
          ) : (
            <div className="project-checklist-grid">
              {(projectsQuery.data || []).map((project) => {
                const isSelected = projectAssignments.some((item) => item.project_id === project.id);
                return (
                  <label key={project.id} className={`project-checkbox-item ${isSelected ? 'is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProjectAssignment(project.id)}
                    />
                    <span className="project-name">{project.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>{intl.formatMessage({ id: 'common.cancel' })}</button>
          <button className="button button-primary" type="submit" disabled={createInvitation.isPending}>
            {createInvitation.isPending ? intl.formatMessage({ id: 'invitation.sending' }) : intl.formatMessage({ id: 'invitation.createSend' })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
