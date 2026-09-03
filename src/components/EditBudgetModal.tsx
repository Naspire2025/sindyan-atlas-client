import { useState } from 'react';
import { api } from '../api/client.js';
import DialogShell from './DialogShell.js';

interface EditBudgetModalProps {
  projectId: string;
  currentBudget: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBudgetModal({
  projectId,
  currentBudget,
  onClose,
  onSuccess,
}: EditBudgetModalProps) {
  const [budget, setBudget] = useState<number>(currentBudget || 0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (budget < 0) {
      setError('Budget cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateProject(projectId, {
        budget_allocated_amount: budget,
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
      title="Edit Total Project Budget"
      description="Update total allocated budget capital for this project."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="field-group">
          <label htmlFor="total-budget">Total Allocated Budget ($)</label>
          <input
            id="total-budget"
            type="number"
            min="0"
            step="100"
            autoFocus
            required
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Update budget'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
