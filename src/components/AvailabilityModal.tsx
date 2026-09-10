import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { Availability } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface AvailabilityModalProps {
  editTarget?: Availability | null;
  selectedUserId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AvailabilityModal({ editTarget, selectedUserId, onClose, onSuccess }: AvailabilityModalProps) {
  const intl = useIntl();
  const [userId, setUserId] = useState(editTarget?.user_id || selectedUserId || '');
  const [startsOn, setStartsOn] = useState(editTarget?.starts_on || '');
  const [endsOn, setEndsOn] = useState(editTarget?.ends_on || '');
  const [availabilityStatus, setAvailabilityStatus] = useState<'unavailable' | 'reduced_capacity' | 'available'>(
    (editTarget?.availability_status as 'unavailable' | 'reduced_capacity' | 'available') || 'unavailable'
  );
  const [capacityHours, setCapacityHours] = useState<string>(
    editTarget?.capacity_hours !== undefined ? String(editTarget.capacity_hours) : ''
  );
  const [note, setNote] = useState(editTarget?.note || '');
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
    if (!startsOn || !endsOn) {
      setError('Start date and end date are required.');
      return;
    }
    if (startsOn > endsOn) {
      setError('Start date cannot be after end date.');
      return;
    }
    if (!capacityHours || Number(capacityHours) < 0) {
      setError('Capacity hours must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        starts_on: startsOn,
        ends_on: endsOn,
        availability_status: availabilityStatus,
        capacity_hours: Number(capacityHours),
        note: note.trim() || undefined,
      };

      if (isEditing && editTarget) {
        await api.updateAvailability(editTarget.user_id, editTarget.id, payload);
      } else {
        await api.createAvailability(userId, payload);
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
      title={isEditing ? intl.formatMessage({ id: 'availability.edit' }) : intl.formatMessage({ id: 'availability.add' })}
      description="Schedule planned time-off, vacations, or capacity restrictions for team members."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        {!isEditing && (
          <div className="field-group">
            <label htmlFor="avail-user">{intl.formatMessage({ id: 'resource.member' })}</label>
            <select
              id="avail-user"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={usersQuery.isLoading || Boolean(selectedUserId) && !isEditing}
            >
              <option value="">{intl.formatMessage({ id: 'common.search' })}</option>
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

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="avail-start">{intl.formatMessage({ id: 'availability.startsOn' })}</label>
            <input id="avail-start" type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="avail-end">{intl.formatMessage({ id: 'availability.endsOn' })}</label>
            <input id="avail-end" type="date" required min={startsOn || undefined} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="avail-status">{intl.formatMessage({ id: 'availability.status' })}</label>
          <select
            id="avail-status"
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value as 'unavailable' | 'reduced_capacity' | 'available')}
          >
            <option value="unavailable">{intl.formatMessage({ id: 'availability.unavailableLeave' })}</option>
            <option value="reduced_capacity">{intl.formatMessage({ id: 'resource.reducedCapacity' })}</option>
            <option value="available">{intl.formatMessage({ id: 'resource.available' })}</option>
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="avail-capacity">{intl.formatMessage({ id: 'availability.hours' })}</label>
          <input
            id="avail-capacity"
            type="number"
            min="0"
            step="0.5"
            required
            placeholder={intl.formatMessage({ id: 'availability.hoursPlaceholder' })}
            value={capacityHours}
            onChange={(e) => setCapacityHours(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="avail-notes">{intl.formatMessage({ id: 'availability.note' })}</label>
          <input
            id="avail-notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={intl.formatMessage({ id: 'availability.notePlaceholder' })}
          />
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? intl.formatMessage({ id: 'common.saving' })
              : intl.formatMessage({ id: isEditing ? 'availability.update' : 'availability.record' })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
