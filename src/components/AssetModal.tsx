import { useState } from 'react';
import { api } from '../api/client.js';
import type { Asset } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface AssetModalProps {
  editTarget?: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssetModal({ editTarget, onClose, onSuccess }: AssetModalProps) {
  const [name, setName] = useState(editTarget?.name || '');
  const [type, setType] = useState(editTarget?.type || editTarget?.asset_type || 'Hardware');
  const [status, setStatus] = useState(editTarget?.status || 'available');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Asset name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editTarget) {
        await api.updateAsset(editTarget.id, {
          name: name.trim(),
          type: type.trim(),
          asset_type: type.trim(),
          status,
        });
      } else {
        await api.createAsset({
          name: name.trim(),
          type: type.trim(),
          asset_type: type.trim(),
          status,
        });
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
      title={editTarget ? 'Edit Shared Asset' : 'Add Shared Asset'}
      description="Register physical equipment, cloud resources, or software assets."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="field-group">
          <label htmlFor="asset-name">Asset name</label>
          <input
            id="asset-name"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Build Server Alpha or Design Tablet"
          />
        </div>

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="asset-type">Type / Category</label>
            <select
              id="asset-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Hardware">Hardware / Device</option>
              <option value="Server">Server / Cloud Instance</option>
              <option value="License">Software License</option>
              <option value="Facility">Facility / Studio</option>
              <option value="Other">Other Resource</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="asset-status">Status</label>
            <select
              id="asset-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="available">Available</option>
              <option value="allocated">Allocated</option>
              <option value="maintenance">In Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : editTarget ? 'Update asset' : 'Create asset'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
