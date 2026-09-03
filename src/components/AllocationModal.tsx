import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { MemberAllocation, AssetAllocation } from '../types/api.js';
import DialogShell from './DialogShell.js';

interface AllocationModalProps {
  initialType?: 'member' | 'asset';
  editMemberTarget?: MemberAllocation | null;
  editAssetTarget?: AssetAllocation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AllocationModal({
  initialType = 'member',
  editMemberTarget,
  editAssetTarget,
  onClose,
  onSuccess,
}: AllocationModalProps) {
  const [allocationType, setAllocationType] = useState<'member' | 'asset'>(
    editAssetTarget ? 'asset' : initialType
  );
  const [userId, setUserId] = useState<string>(
    editMemberTarget?.user_id ? String(editMemberTarget.user_id) : ''
  );
  const [assetId, setAssetId] = useState<string>(
    editAssetTarget?.asset_id ? String(editAssetTarget.asset_id) : ''
  );
  const [projectId, setProjectId] = useState<string>(
    String(editMemberTarget?.project_id || editAssetTarget?.project_id || '')
  );
  const [percentage, setPercentage] = useState<number>(
    editMemberTarget?.allocation_percentage ??
      editMemberTarget?.percentage ??
      editAssetTarget?.allocation_percentage ??
      editAssetTarget?.percentage ??
      100
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: ({ signal }) => api.listProjects({ signal }),
  });

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets,
    queryFn: ({ signal }) => api.listAssets(signal),
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!projectId) {
      setError('Please select a project.');
      return;
    }

    if (allocationType === 'member' && !userId) {
      setError('Please select a team member.');
      return;
    }

    if (allocationType === 'asset' && !assetId) {
      setError('Please select an asset.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (allocationType === 'member') {
        if (editMemberTarget) {
          await api.updateMemberAllocation(editMemberTarget.id, {
            user_id: userId,
            project_id: projectId,
            allocation_percentage: Number(percentage),
          });
        } else {
          await api.createMemberAllocation({
            user_id: userId,
            project_id: projectId,
            allocation_percentage: Number(percentage),
          });
        }
      } else {
        if (editAssetTarget) {
          await api.updateAssetAllocation(editAssetTarget.id, {
            asset_id: assetId,
            project_id: projectId,
            allocation_percentage: Number(percentage),
          });
        } else {
          await api.createAssetAllocation({
            asset_id: assetId,
            project_id: projectId,
            allocation_percentage: Number(percentage),
          });
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editMemberTarget || editAssetTarget);

  return (
    <DialogShell
      title={isEditing ? 'Edit Allocation' : 'Create Project Allocation'}
      description="Assign team members or shared assets to project work loads."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        {!isEditing && (
          <div className="field-group">
            <label htmlFor="allocation-type">Allocation type</label>
            <select
              id="allocation-type"
              value={allocationType}
              onChange={(e) => setAllocationType(e.target.value as 'member' | 'asset')}
            >
              <option value="member">Team member allocation</option>
              <option value="asset">Shared asset allocation</option>
            </select>
          </div>
        )}

        {allocationType === 'member' ? (
          <div className="field-group">
            <label htmlFor="alloc-user">Team member</label>
            <select
              id="alloc-user"
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
        ) : (
          <div className="field-group">
            <label htmlFor="alloc-asset">Shared asset</label>
            <select
              id="alloc-asset"
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={assetsQuery.isLoading}
            >
              <option value="">Select asset…</option>
              {(assetsQuery.data || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.type || a.asset_type ? `(${a.type || a.asset_type})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field-group">
          <label htmlFor="alloc-project">Project</label>
          <select
            id="alloc-project"
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projectsQuery.isLoading}
          >
            <option value="">Select project…</option>
            {(projectsQuery.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="alloc-percentage">Allocation percentage (%)</label>
          <input
            id="alloc-percentage"
            type="number"
            min="1"
            max="100"
            required
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
          />
        </div>

        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditing ? 'Update allocation' : 'Create allocation'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
