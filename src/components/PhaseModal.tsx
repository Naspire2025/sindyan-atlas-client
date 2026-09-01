import { useState } from 'react';
import { api } from '../api/client.js';
import type { Phase } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface PhaseModalProps {
  phase?: Phase;
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhaseModal({ phase, projectId, onClose, onSuccess }: PhaseModalProps) {
  const isEditing = Boolean(phase);
  const [name, setName] = useState(phase?.name || '');
  const [startDate, setStartDate] = useState(phase?.start_date || '');
  const [endDate, setEndDate] = useState(phase?.end_date || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Phase name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      if (isEditing) await api.updatePhase(projectId, phase!.id, payload);
      else await api.createPhase(projectId, payload);
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
      title={isEditing ? 'Edit project phase' : 'Add project phase'}
      description="Define a major stage in the project timeline."
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
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="phase-end">End date</label>
            <input
              id="phase-end"
              type="date"
              required
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
            {isSubmitting ? 'Saving…' : isEditing ? 'Save phase' : 'Create phase'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
