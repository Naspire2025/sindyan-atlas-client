import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { CapacityProfile } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface CapacityProfileModalProps {
  editTarget?: CapacityProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CapacityProfileModal({ editTarget, onClose, onSuccess }: CapacityProfileModalProps) {
  const [userId, setUserId] = useState(editTarget?.user_id || '');
  const [effectiveFrom, setEffectiveFrom] = useState(editTarget?.effective_from || new Date().toISOString().slice(0, 10));
  const [weeklyCapacityHours, setWeeklyCapacityHours] = useState<string>(
    editTarget?.weekly_capacity_hours !== undefined ? String(editTarget.weekly_capacity_hours) : '40'
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });

  const isEditing = Boolean(editTarget);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!userId && !isEditing) {
      setError('Please select a team member.');
      return;
    }
    if (!effectiveFrom) {
      setError('Effective date is required.');
      return;
    }
    if (!weeklyCapacityHours || Number(weeklyCapacityHours) < 0) {
      setError('Weekly capacity hours must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        effective_from: effectiveFrom,
        weekly_capacity_hours: Number(weeklyCapacityHours),
      };

      if (isEditing && editTarget) {
        await api.updateCapacityProfile(editTarget.user_id, editTarget.id, payload);
      } else {
        await api.createCapacityProfile(userId, payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogShell
      title={isEditing ? 'Edit Capacity Profile' : 'New Capacity Profile'}
      description="Define baseline weekly working hours for a team member. This determines their maximum allocatable capacity."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        {!isEditing && (
          <div className="field-group">
            <label htmlFor="cap-user">Team member</label>
            <select
              id="cap-user"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={usersQuery.isLoading}
            >
              <option value="">Select team member…</option>
              {(usersQuery.data || [])
                .filter((u) => u.status === 'active')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="field-group">
          <label htmlFor="cap-effective">Effective from</label>
          <input
            id="cap-effective"
            type="date"
            required
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cap-hours">Weekly capacity hours</label>
          <input
            id="cap-hours"
            type="number"
            min="0"
            step="0.5"
            required
            placeholder="e.g. 40"
            value={weeklyCapacityHours}
            onChange={(e) => setWeeklyCapacityHours(e.target.value)}
          />
          <small style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
            Standard full-time capacity is 40 hours per week.
          </small>
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditing ? 'Update profile' : 'Create profile'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
