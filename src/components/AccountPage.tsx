import { useState } from 'react';
import { useIntl } from 'react-intl';
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
  const intl = useIntl();
  const { user } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow={intl.formatMessage({ id: 'account.settings' })}
        title={intl.formatMessage({ id: 'account.title' })}
        description={intl.formatMessage({ id: 'account.description' })}
        onMenu={onMenu}
      />
      <section className="panel vault-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">{intl.formatMessage({ id: 'account.profile' })}</span>
            <h2>{intl.formatMessage({ id: 'account.details' })}</h2>
          </div>
        </div>
        <div className="account-detail-grid">
          <div className="account-field">
            <span className="property-label">{intl.formatMessage({ id: 'account.name' })}</span>
            <span className="account-value">{user?.name || intl.formatMessage({ id: 'account.notSet' })}</span>
          </div>
          <div className="account-field">
            <span className="property-label">{intl.formatMessage({ id: 'account.email' })}</span>
            <span className="account-value">{user?.email || intl.formatMessage({ id: 'account.notSet' })}</span>
          </div>
          <div className="account-field">
            <span className="property-label">{intl.formatMessage({ id: 'account.role' })}</span>
            <span className="role-pill">{user?.role === 'admin' ? intl.formatMessage({ id: 'account.administrator' }) : intl.formatMessage({ id: 'account.teamMember' })}</span>
          </div>
        </div>
        <div className="account-actions">
          <button className="button button-secondary" type="button" onClick={() => setIsChangePasswordOpen(true)}>
            <Lock size={14} />
            {intl.formatMessage({ id: 'account.changePassword' })}
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
  const intl = useIntl();
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
      setError(intl.formatMessage({ id: 'account.passwordsMismatch' }));
      return;
    }
    if (form.newPassword.length < 12) {
      setError(intl.formatMessage({ id: 'account.passwordTooShort' }));
      return;
    }
    changePassword.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  const updateField = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  if (success) {
    return (
      <DialogShell title={intl.formatMessage({ id: 'account.passwordUpdated' })} onClose={onClose}>
        <div className="dialog-body">
          <EmptyState
            icon={ShieldCheck}
            title={intl.formatMessage({ id: 'account.passwordChangedSuccess' })}
            message={intl.formatMessage({ id: 'account.passwordChangedMessage' })}
          />
          <footer className="dialog-actions">
            <button className="button button-primary" type="button" onClick={onClose}>{intl.formatMessage({ id: 'common.done' })}</button>
          </footer>
        </div>
      </DialogShell>
    );
  }

  return (
    <DialogShell title={intl.formatMessage({ id: 'account.changePassword' })} description={intl.formatMessage({ id: 'account.updatePasswordDescription' })} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="field-group">
          <label htmlFor="current-password">{intl.formatMessage({ id: 'account.currentPassword' })}</label>
          <input id="current-password" autoComplete="current-password" required type="password" value={form.currentPassword} onChange={updateField('currentPassword')} />
        </div>
        <div className="field-group">
          <label htmlFor="new-password">{intl.formatMessage({ id: 'account.newPassword' })}</label>
          <input id="new-password" autoComplete="new-password" minLength={12} required type="password" value={form.newPassword} onChange={updateField('newPassword')} />
        </div>
        <div className="field-group">
          <label htmlFor="confirm-password">{intl.formatMessage({ id: 'account.confirmNewPassword' })}</label>
          <input id="confirm-password" autoComplete="new-password" minLength={12} required type="password" value={form.confirmPassword} onChange={updateField('confirmPassword')} />
        </div>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>{intl.formatMessage({ id: 'common.cancel' })}</button>
          <button className="button button-primary" type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? intl.formatMessage({ id: 'common.saving' }) : intl.formatMessage({ id: 'account.updatePassword' })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
