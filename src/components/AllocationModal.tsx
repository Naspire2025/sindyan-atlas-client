import { useState } from 'react';
import { useIntl } from 'react-intl';
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
  const intl = useIntl();
  const formatNumber = (value: number) => intl.formatNumber(value, { maximumFractionDigits: 1 });
  const totalPercentage = peakAllocatedPercentage + currentPercentage;
  const isOverCapacity = totalPercentage > FULL_CAPACITY_PERCENTAGE;
  const remainingPercentage = Math.max(0, FULL_CAPACITY_PERCENTAGE - totalPercentage);
  const percentageToHours = (value: number) => weeklyCapacityHours * value / FULL_CAPACITY_PERCENTAGE;

  if (isLoading) {
    return <div className="mb-3 rounded-control border border-graphite bg-obsidian p-3 text-[11px] text-fog">{intl.formatMessage({ id: 'common.loading' })}</div>;
  }

  if (isError) {
    return (
      <div className="mb-3 rounded-control border border-graphite bg-obsidian p-3 text-[11px] text-fog" role="status">
        {intl.formatMessage({ id: 'allocation.capacityLoadError' })}
      </div>
    );
  }

  return (
    <section
      className={`mb-3 rounded-control border p-3 ${isOverCapacity ? 'border-coral-red/40 bg-coral-red/10' : 'border-graphite bg-obsidian'}`}
      aria-label={intl.formatMessage({ id: 'allocation.capacitySummaryLabel' }, { name: memberName })}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-xs font-[510] text-mist">{intl.formatMessage({ id: 'allocation.capacityForDates' })}</h3>
          <p className="mt-1 text-[11px] leading-4 text-fog">
            {intl.formatMessage({ id: 'allocation.fullCapacityExplanation' }, { hours: formatNumber(weeklyCapacityHours), name: memberName })}
          </p>
        </div>
        <span className={`shrink-0 rounded-badge px-1.5 py-0.5 text-[10px] ${isOverCapacity ? 'bg-coral-red/15 text-[#f09a9a]' : 'bg-white/5 text-fog'}`}>
          {isOverCapacity
            ? intl.formatMessage({ id: 'allocation.percentOver' }, { percent: formatNumber(totalPercentage - FULL_CAPACITY_PERCENTAGE) })
            : intl.formatMessage({ id: 'allocation.percentAvailable' }, { percent: formatNumber(remainingPercentage) })}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-[10px] text-ash">{intl.formatMessage({ id: 'resource.weeklyCapacity' })}</dt>
          <dd className="mt-0.5 text-xs text-mist">
            {intl.formatMessage({ id: 'allocation.hoursShort' }, { hours: formatNumber(weeklyCapacityHours) })}{' '}
            <span className="text-ash">({intl.formatMessage({ id: hasCustomCapacity ? 'allocation.profileCapacity' : 'allocation.defaultCapacity' })})</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-ash">{intl.formatMessage({ id: 'allocation.alreadyAllocatedPeak' })}</dt>
          <dd className="mt-0.5 text-xs text-mist">
            {intl.formatNumber(peakAllocatedPercentage / 100, { style: 'percent', maximumFractionDigits: 1 })}{' '}
            <span className="text-ash">· {intl.formatMessage({ id: 'allocation.hoursPerWeek' }, { hours: formatNumber(percentageToHours(peakAllocatedPercentage)) })}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-ash">{intl.formatMessage({ id: 'allocation.thisAllocation' })}</dt>
          <dd className="mt-0.5 text-xs text-mist">
            {intl.formatNumber(currentPercentage / 100, { style: 'percent', maximumFractionDigits: 1 })}{' '}
            <span className="text-ash">· {intl.formatMessage({ id: 'allocation.hoursPerWeek' }, { hours: formatNumber(percentageToHours(currentPercentage)) })}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-ash">{intl.formatMessage({ id: 'allocation.afterAllocation' })}</dt>
          <dd className={`mt-0.5 text-xs ${isOverCapacity ? 'text-[#f09a9a]' : 'text-mist'}`}>
            {intl.formatNumber(totalPercentage / 100, { style: 'percent', maximumFractionDigits: 1 })}{' '}
            <span className={isOverCapacity ? 'text-[#f09a9a]' : 'text-ash'}>
              · {intl.formatMessage({ id: 'allocation.hoursPerWeek' }, { hours: formatNumber(percentageToHours(totalPercentage)) })}
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
  const intl = useIntl();
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
      setError(intl.formatMessage({ id: 'allocation.selectProjectError' }));
      return;
    }

    if (!userId) {
      setError(intl.formatMessage({ id: 'allocation.selectMemberError' }));
      return;
    }

    if (endsOn && startsOn && endsOn < startsOn) {
      setError(intl.formatMessage({ id: 'allocation.dateRangeError' }));
      return;
    }

    if (isOverMemberCapacity) {
      const totalPercentage = peakAllocatedPercentage + currentPercentage;
      setError(intl.formatMessage(
        { id: 'allocation.capacityExceededError' },
        {
          name: selectedUser?.name || intl.formatMessage({ id: 'allocation.thisMember' }),
          peak: intl.formatNumber(peakAllocatedPercentage, { maximumFractionDigits: 1 }),
          total: intl.formatNumber(totalPercentage, { maximumFractionDigits: 1 }),
        },
      ));
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
      title={isEditing ? intl.formatMessage({ id: 'allocation.edit' }) : intl.formatMessage({ id: 'allocation.add' })}
      description={intl.formatMessage({ id: 'allocation.description' })}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="field-group">
          <label htmlFor="alloc-user">{intl.formatMessage({ id: 'resource.member' })}</label>
          <select
            id="alloc-user"
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={usersQuery.isLoading}
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

        {userId && (
          <MemberCapacitySummary
            currentPercentage={currentPercentage}
            hasCustomCapacity={hasCustomCapacity}
            isError={memberAllocationsQuery.isError || capacityProfilesQuery.isError}
            isLoading={memberAllocationsQuery.isLoading || capacityProfilesQuery.isLoading}
            memberName={selectedUser?.name || editMemberTarget?.user_name || intl.formatMessage({ id: 'allocation.thisMember' })}
            peakAllocatedPercentage={peakAllocatedPercentage}
            weeklyCapacityHours={weeklyCapacityHours}
          />
        )}

        <div className="field-group">
          <label htmlFor="alloc-project">{intl.formatMessage({ id: 'allocation.project' })}</label>
          <select
            id="alloc-project"
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projectsQuery.isLoading}
          >
            <option value="">{intl.formatMessage({ id: 'common.search' })}</option>
            {(projectsQuery.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="alloc-percentage">{intl.formatMessage({ id: 'allocation.percent' })}</label>
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
            <label htmlFor="alloc-start">{intl.formatMessage({ id: 'allocation.startDate' })}</label>
            <input
              id="alloc-start"
              type="date"
              required
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="alloc-end">{intl.formatMessage({ id: 'allocation.endDate' })}</label>
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
            {intl.formatMessage({ id: 'common.cancel' })}
          </button>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? intl.formatMessage({ id: 'common.saving' }) : isEditing ? 'Update allocation' : 'Create allocation'}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
