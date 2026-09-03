import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import DialogShell from './DialogShell.js';

interface AvailabilityModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AvailabilityModal({ onClose, onSuccess }: AvailabilityModalProps) {
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'unavailable' | 'limited' | 'available'>('unavailable');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!userId) {
      setError('Please select a team member.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createAvailability(userId, {
        start_date: startDate,
        end_date: endDate,
        status,
        notes: notes.trim() || undefined,
      });
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
      title="Record Unavailability / Leave"
      description="Schedule planned time-off, vacations, or capacity restrictions for team members."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="field-group">
          <label htmlFor="avail-user">Team member</label>
          <select
            id="avail-user"
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

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="avail-start">Start date</label>
            <input
              id="avail-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="avail-end">End date</label>
            <input
              id="avail-end"
              type="date"
              required
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="avail-status">Availability status</label>
          <select
            id="avail-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'unavailable' | 'limited' | 'available')}
          >
            <option value="unavailable">Unavailable (Vacation / Leave)</option>
            <option value="limited">Limited Capacity</option>
            <option value="available">Available</option>
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="avail-notes">Notes / Reason</label>
          <input
            id="avail-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Annual leave or conference attendance"
          />
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Record unavailability'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
