import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, setSessionToken } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import { useAuth } from '../auth/useAuth.js';
import DialogShell from './DialogShell.js';
import EmptyState from './EmptyState.js';
import { Lock, ShieldCheck } from 'lucide-react';

import PageHeader from './PageHeader.js';

interface AccountPageProps {
  onMenu: () => void;
}

export default function AccountPage({ onMenu }: AccountPageProps) {
  const { user } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Account"
        description="Manage your account settings and password."
        onMenu={onMenu}
      />
      <section className="panel vault-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Profile</span>
            <h2>Account details</h2>
          </div>
        </div>
        <div className="account-detail-grid">
          <div className="account-field">
            <span className="property-label">Name</span>
            <span className="account-value">{user?.name || 'Not set'}</span>
          </div>
          <div className="account-field">
            <span className="property-label">Email</span>
            <span className="account-value">{user?.email || 'Not set'}</span>
          </div>
          <div className="account-field">
            <span className="property-label">Role</span>
            <span className="role-pill">{user?.role === 'admin' ? 'Administrator' : 'Team member'}</span>
          </div>
        </div>
        <div className="account-actions">
          <button className="button button-secondary" type="button" onClick={() => setIsChangePasswordOpen(true)}>
            <Lock size={14} />
            Change password
          </button>
        </div>
      </section>

      {isChangePasswordOpen && (
        <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </>
  );
}

interface ChangePasswordDialogProps {
  onClose: () => void;
}

function ChangePasswordDialog({ onClose }: ChangePasswordDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => api.changePassword(data),
    onSuccess: async (result: { token: string }) => {
      setSessionToken(result.token);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      setSuccess(true);
      setError('');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (form.newPassword.length < 12) {
      setError('New password must be at least 12 characters.');
      return;
    }
    changePassword.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  const updateField = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  if (success) {
    return (
      <DialogShell title="Password updated" onClose={onClose}>
        <div className="dialog-body">
          <EmptyState
            icon={ShieldCheck}
            title="Password changed successfully"
            message="Your password has been updated. You may need to sign in again on other devices."
          />
          <footer className="dialog-actions">
            <button className="button button-primary" type="button" onClick={onClose}>Done</button>
          </footer>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell title="Change password" description="Update your account password. The new password must be at least 12 characters." onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="current-password">Current password</label>
          <input id="current-password" autoComplete="current-password" required type="password" value={form.currentPassword} onChange={updateField('currentPassword')} />
        </div>
        <div className="field-group">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" autoComplete="new-password" minLength={12} required type="password" value={form.newPassword} onChange={updateField('newPassword')} />
        </div>
        <div className="field-group">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" autoComplete="new-password" minLength={12} required type="password" value={form.confirmPassword} onChange={updateField('confirmPassword')} />
        </div>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Saving…' : 'Update password'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
