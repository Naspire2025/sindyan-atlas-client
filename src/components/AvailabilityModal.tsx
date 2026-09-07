import { useState } from 'react';
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
      title={isEditing ? 'Edit Availability' : 'Record Unavailability / Leave'}
      description="Schedule planned time-off, vacations, or capacity restrictions for team members."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        {!isEditing && (
          <div className="field-group">
            <label htmlFor="avail-user">Team member</label>
            <select
              id="avail-user"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={usersQuery.isLoading || Boolean(selectedUserId) && !isEditing}
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

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="avail-start">Start date</label>
            <input id="avail-start" type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="avail-end">End date</label>
            <input id="avail-end" type="date" required min={startsOn || undefined} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="avail-status">Availability status</label>
          <select
            id="avail-status"
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value as 'unavailable' | 'reduced_capacity' | 'available')}
          >
            <option value="unavailable">Unavailable (Vacation / Leave)</option>
            <option value="reduced_capacity">Reduced Capacity</option>
            <option value="available">Available</option>
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="avail-capacity">Capacity hours per week</label>
          <input
            id="avail-capacity"
            type="number"
            min="0"
            step="0.5"
            required
            placeholder="e.g. 20 for half-time"
            value={capacityHours}
            onChange={(e) => setCapacityHours(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="avail-notes">Notes / Reason</label>
          <input
            id="avail-notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Annual leave or conference attendance"
          />
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditing ? 'Update availability' : 'Record unavailability'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
