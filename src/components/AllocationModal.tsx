import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { MemberAllocation, CapacityProfile } from '../types/api.js';
import { getPeakAllocationPercentage } from '../utils/allocation.js';
import DialogShell from './DialogShell.js';

const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;
const FULL_CAPACITY_PERCENTAGE = 100;

function getWeeklyCapacityHours(profiles: CapacityProfile[], startsOn: string): number {
  const activeProfile = profiles
    .filter((profile) => profile.effective_from <= startsOn)
    .sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0];
  return activeProfile ? Number(activeProfile.weekly_capacity_hours) : DEFAULT_WEEKLY_CAPACITY_HOURS;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

interface MemberCapacitySummaryProps {
  currentPercentage: number;
  hasCustomCapacity: boolean;
  isError: boolean;
  isLoading: boolean;
  memberName: string;
  peakAllocatedPercentage: number;
  weeklyCapacityHours: number;
}

function MemberCapacitySummary({
  currentPercentage,
  hasCustomCapacity,
  isError,
  isLoading,
  memberName,
  peakAllocatedPercentage,
  weeklyCapacityHours,
}: MemberCapacitySummaryProps) {
  const totalPercentage = peakAllocatedPercentage + currentPercentage;
  const isOverCapacity = totalPercentage > FULL_CAPACITY_PERCENTAGE;
  const remainingPercentage = Math.max(0, FULL_CAPACITY_PERCENTAGE - totalPercentage);
  const percentageToHours = (value: number) => weeklyCapacityHours * value / FULL_CAPACITY_PERCENTAGE;

  if (isLoading) {
    return <div className="mb-3 rounded-control border border-graphite bg-obsidian p-3 text-[11px] text-fog">Loading capacity details…</div>;
  }

  if (isError) {
    return (
      <div className="mb-3 rounded-control border border-graphite bg-obsidian p-3 text-[11px] text-fog" role="status">
        Capacity details could not be loaded. Atlas will still validate this allocation when you save.
      </div>
    );
  }

  return (
    <section
      className={`mb-3 rounded-control border p-3 ${isOverCapacity ? 'border-coral-red/40 bg-coral-red/10' : 'border-graphite bg-obsidian'}`}
      aria-label={`${memberName} capacity summary`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-xs font-[510] text-mist">Capacity for selected dates</h3>
          <p className="mt-1 text-[11px] leading-4 text-fog">
            100% equals {formatNumber(weeklyCapacityHours)} hours per week for {memberName}.
          </p>
        </div>
        <span className={`shrink-0 rounded-badge px-1.5 py-0.5 text-[10px] ${isOverCapacity ? 'bg-coral-red/15 text-[#f09a9a]' : 'bg-white/5 text-fog'}`}>
          {isOverCapacity ? `${formatNumber(totalPercentage - FULL_CAPACITY_PERCENTAGE)}% over` : `${formatNumber(remainingPercentage)}% available`}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-[10px] text-ash">Weekly capacity</dt>
          <dd className="mt-0.5 text-xs text-mist">
            {formatNumber(weeklyCapacityHours)}h <span className="text-ash">({hasCustomCapacity ? 'profile' : 'default'})</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-ash">Already allocated (peak)</dt>
          <dd className="mt-0.5 text-xs text-mist">
            {formatNumber(peakAllocatedPercentage)}% <span className="text-ash">· {formatNumber(percentageToHours(peakAllocatedPercentage))}h/week</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-ash">This allocation</dt>
          <dd className="mt-0.5 text-xs text-mist">
            {formatNumber(currentPercentage)}% <span className="text-ash">· {formatNumber(percentageToHours(currentPercentage))}h/week</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-ash">After allocation</dt>
          <dd className={`mt-0.5 text-xs ${isOverCapacity ? 'text-[#f09a9a]' : 'text-mist'}`}>
            {formatNumber(totalPercentage)}% <span className={isOverCapacity ? 'text-[#f09a9a]' : 'text-ash'}>
              · {formatNumber(percentageToHours(totalPercentage))}h/week
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

interface AllocationModalProps {
  editMemberTarget?: MemberAllocation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AllocationModal({
  editMemberTarget,
  onClose,
  onSuccess,
}: AllocationModalProps) {
  const [userId, setUserId] = useState<string>(
    editMemberTarget?.user_id ? String(editMemberTarget.user_id) : ''
  );
  const [projectId, setProjectId] = useState<string>(
    String(editMemberTarget?.project_id || '')
  );
  const [percentage, setPercentage] = useState<number>(
    editMemberTarget?.allocation_percentage ??
      editMemberTarget?.allocation_percent ??
      editMemberTarget?.percentage ??
      100
  );
  const [startsOn, setStartsOn] = useState<string>(
    () => editMemberTarget?.starts_on || new Date().toISOString().slice(0, 10)
  );
  const [endsOn, setEndsOn] = useState<string>(
    () => editMemberTarget?.ends_on || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
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

  const memberAllocationsQuery = useQuery({
    queryKey: queryKeys.memberAllocations({ user_id: userId }),
    queryFn: ({ signal }) => api.listMemberAllocations({ user_id: userId, signal }),
    enabled: Boolean(userId),
  });

  const capacityProfilesQuery = useQuery({
    queryKey: queryKeys.capacityProfiles(userId),
    queryFn: ({ signal }) => api.listCapacityProfiles(userId, signal),
    enabled: Boolean(userId),
  });

  const selectedUser = usersQuery.data?.find((user) => String(user.id) === userId);
  const capacityProfiles = capacityProfilesQuery.data || [];
  const weeklyCapacityHours = getWeeklyCapacityHours(capacityProfiles, startsOn);
  const hasCustomCapacity = capacityProfiles.some((profile) => profile.effective_from <= startsOn);
  const peakAllocatedPercentage = getPeakAllocationPercentage(
    memberAllocationsQuery.data || [],
    { startsOn, endsOn, excludedAllocationId: editMemberTarget?.id },
  );
  const currentPercentage = Number.isFinite(percentage) ? percentage : 0;
  const isCapacityDataReady = memberAllocationsQuery.isSuccess && capacityProfilesQuery.isSuccess;
  const isOverMemberCapacity = isCapacityDataReady &&
    peakAllocatedPercentage + currentPercentage > FULL_CAPACITY_PERCENTAGE;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!projectId) {
      setError('Please select a project.');
      return;
    }

    if (!userId) {
      setError('Please select a team member.');
      return;
    }

    if (endsOn && startsOn && endsOn < startsOn) {
      setError('End date must not be earlier than start date.');
      return;
    }

    if (isOverMemberCapacity) {
      const totalPercentage = peakAllocatedPercentage + currentPercentage;
      setError(
        `${selectedUser?.name || 'This team member'} is already allocated up to ${formatNumber(peakAllocatedPercentage)}% ` +
        `during these dates. This allocation would bring the total to ${formatNumber(totalPercentage)}%.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: userId,
        project_id: projectId,
        allocation_percentage: Number(percentage),
        starts_on: startsOn,
        ends_on: endsOn,
      };
      if (editMemberTarget) {
        await api.updateMemberAllocation(editMemberTarget.id, payload);
      } else {
        await api.createMemberAllocation(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editMemberTarget);

  return (
    <DialogShell
      title={isEditing ? 'Edit Allocation' : 'Create Member Allocation'}
      description="Assign a team member to a project workload and track planned capacity."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

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

        {userId && (
          <MemberCapacitySummary
            currentPercentage={currentPercentage}
            hasCustomCapacity={hasCustomCapacity}
            isError={memberAllocationsQuery.isError || capacityProfilesQuery.isError}
            isLoading={memberAllocationsQuery.isLoading || capacityProfilesQuery.isLoading}
            memberName={selectedUser?.name || editMemberTarget?.user_name || 'this member'}
            peakAllocatedPercentage={peakAllocatedPercentage}
            weeklyCapacityHours={weeklyCapacityHours}
          />
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
          <label htmlFor="alloc-percentage">Weekly capacity allocated (%)</label>
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

        <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
          <div className="field-group">
            <label htmlFor="alloc-start">Start date</label>
            <input
              id="alloc-start"
              type="date"
              required
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="alloc-end">End date</label>
            <input
              id="alloc-end"
              type="date"
              required
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </div>
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
