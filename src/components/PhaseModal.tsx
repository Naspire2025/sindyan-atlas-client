import { useState } from 'react';
import { api } from '../api/client.js';
import DialogShell from './DialogShell.js';

interface PhaseModalProps {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhaseModal({ projectId, onClose, onSuccess }: PhaseModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Phase name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPhase(projectId, {
        name: name.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
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
      title="Add Project Phase"
      description="Define a major stage or phase in the project timeline."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="field-group">
          <label htmlFor="phase-name">Phase name</label>
          <input
            id="phase-name"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Discovery & Design, Sprint 1, Q3 Release"
          />
        </div>

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="phase-start">Start date</label>
            <input
              id="phase-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="phase-end">End date</label>
            <input
              id="phase-end"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Create phase'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
