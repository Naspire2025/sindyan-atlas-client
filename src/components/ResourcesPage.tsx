import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type {
  Availability,
  CapacityProfile,
  MemberAllocation,
  WorkloadItem,
} from '../types/api.js';
import AllocationModal from './AllocationModal.js';
import AvailabilityModal from './AvailabilityModal.js';
import CapacityProfileModal from './CapacityProfileModal.js';
import ConfirmDialog from './ConfirmDialog.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';
import { SearchField, SelectField } from './FilterBar.js';

import { getAllocationPercentage, getPeakAllocationPercentage } from '../utils/allocation.js';

import PageHeader from './PageHeader.js';
import { Layers, Pencil, Plus, Search, Trash2, TriangleAlert, Users } from 'lucide-react';

interface ResourcesPageProps {
  onMenu: () => void;
}

export default function ResourcesPage({ onMenu }: ResourcesPageProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'Workload' | 'Assignments' | 'Availability' | 'Capacity'>('Workload');

  const TAB_LABEL_IDS: Record<string, string> = {
    Workload: 'resource.workload',
    Assignments: 'resource.allocations',
    Availability: 'resource.availability',
    Capacity: 'resource.capacity',
  };

  const [isAllocationOpen, setIsAllocationOpen] = useState(false);
  const [editMemberAlloc, setEditMemberAlloc] = useState<MemberAllocation | null>(null);
  const [deleteMemberAllocTarget, setDeleteMemberAllocTarget] = useState<MemberAllocation | null>(null);

  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [editAvailabilityTarget, setEditAvailabilityTarget] = useState<Availability | null>(null);
  const [availabilityUserId, setAvailabilityUserId] = useState('');
  const [deleteAvailabilityTarget, setDeleteAvailabilityTarget] = useState<{ userId: string; id: string } | null>(null);

  const [isCapacityProfileOpen, setIsCapacityProfileOpen] = useState(false);
  const [editCapacityProfileTarget, setEditCapacityProfileTarget] = useState<CapacityProfile | null>(null);
  const [deleteCapacityProfileTarget, setDeleteCapacityProfileTarget] = useState<CapacityProfile | null>(null);

  const [workloadDateRange, setWorkloadDateRange] = useState<{ starts_on?: string; ends_on?: string }>({});

  const workloadQuery = useQuery({
    queryKey: queryKeys.workload(workloadDateRange),
    queryFn: ({ signal }) => api.getWorkload(workloadDateRange, signal),
  });

  const memberAllocationsQuery = useQuery({
    queryKey: queryKeys.memberAllocations(),
    queryFn: ({ signal }) => api.listMemberAllocations({ signal }),
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });

  const allCapacityProfilesQuery = useQuery({
    queryKey: queryKeys.allCapacityProfiles,
    queryFn: ({ signal }) => api.listAllCapacityProfiles(signal),
  });

  const workload = workloadQuery.data || [];
  const memberAllocations = memberAllocationsQuery.data || [];
  const users = usersQuery.data || [];
  const allCapacityProfiles = allCapacityProfilesQuery.data || [];

  const invalidateResources = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workload() });
    queryClient.invalidateQueries({ queryKey: queryKeys.memberAllocations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.allCapacityProfiles });
  };

  const deleteMemberAllocationMutation = useMutation({
    mutationFn: (id: string) => api.deleteMemberAllocation(id),
    onSuccess: () => { invalidateResources(); setDeleteMemberAllocTarget(null); },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) => api.deleteAvailability(userId, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['availability'] }); queryClient.invalidateQueries({ queryKey: queryKeys.allAvailability }); setDeleteAvailabilityTarget(null); },
  });

  const deleteCapacityProfileMutation = useMutation({
    mutationFn: ({ userId, profileId }: { userId: string; profileId: string }) =>
      api.updateCapacityProfile(userId, profileId, { weekly_capacity_hours: 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['capacityProfiles'] }); setDeleteCapacityProfileTarget(null); },
  });

  return (
    <>
      <PageHeader
        eyebrow={intl.formatMessage({ id: 'team.administration' })}
        title={intl.formatMessage({ id: 'resource.title' })}
        description={intl.formatMessage({ id: 'resource.description' })}
        onMenu={onMenu}
        action={
          activeTab === 'Assignments' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setEditMemberAlloc(null);
                setIsAllocationOpen(true);
              }}
            >
              <Plus />
              {intl.formatMessage({ id: 'resource.addAllocation' })}
            </button>
          ) : activeTab === 'Availability' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditAvailabilityTarget(null); setAvailabilityUserId(''); setIsAvailabilityOpen(true); }}
            >
              <Plus />
              {intl.formatMessage({ id: 'resource.newAvailability' })}
            </button>
          ) : activeTab === 'Capacity' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditCapacityProfileTarget(null); setIsCapacityProfileOpen(true); }}
            >
              <Plus />
              {intl.formatMessage({ id: 'resource.addCapacityProfile' })}
            </button>
          ) : null
        }
      />

      <nav className="project-tabs" aria-label={intl.formatMessage({ id: 'resource.sections' })}>
        {(['Workload', 'Assignments', 'Availability', 'Capacity'] as const).map((tab) => (
          <button
            className={activeTab === tab ? 'is-active' : ''}
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {intl.formatMessage({ id: TAB_LABEL_IDS[tab] })}
          </button>
        ))}
      </nav>

      <section className="panel vault-panel">
        {activeTab === 'Workload' && (
          <WorkloadTab
            isLoading={workloadQuery.isLoading}
            error={workloadQuery.error}
            data={workload}
            dateRange={workloadDateRange}
            onDateRangeChange={setWorkloadDateRange}
          />
        )}

        {activeTab === 'Assignments' && (
          <AssignmentsTab
            isLoading={memberAllocationsQuery.isLoading}
            memberError={memberAllocationsQuery.error}
            memberAllocations={memberAllocations}
            onEditMemberAlloc={(alloc) => { setEditMemberAlloc(alloc); setIsAllocationOpen(true); }}
            onDeleteMemberAlloc={(alloc) => setDeleteMemberAllocTarget(alloc)}
          />
        )}

        {activeTab === 'Availability' && (
          <AvailabilityTab
            users={users}
            onNewUnavailability={(userId = '') => { setEditAvailabilityTarget(null); setAvailabilityUserId(userId); setIsAvailabilityOpen(true); }}
            onEditAvailability={(rec) => { setEditAvailabilityTarget(rec); setIsAvailabilityOpen(true); }}
            onDeleteAvailability={(userId, id) => setDeleteAvailabilityTarget({ userId, id })}
          />
        )}

        {activeTab === 'Capacity' && (
          <CapacityProfilesTab
            isLoading={allCapacityProfilesQuery.isLoading}
            error={allCapacityProfilesQuery.error}
            profiles={allCapacityProfiles}
            onNewProfile={() => { setEditCapacityProfileTarget(null); setIsCapacityProfileOpen(true); }}
            onEditProfile={(profile) => { setEditCapacityProfileTarget(profile); setIsCapacityProfileOpen(true); }}
            onDeleteProfile={(profile) => setDeleteCapacityProfileTarget(profile)}
          />
        )}
      </section>

      {isAllocationOpen && (
        <AllocationModal
          editMemberTarget={editMemberAlloc}
          onClose={() => { setIsAllocationOpen(false); setEditMemberAlloc(null); }}
          onSuccess={invalidateResources}
        />
      )}

      {isAvailabilityOpen && (
        <AvailabilityModal
          editTarget={editAvailabilityTarget}
          selectedUserId={availabilityUserId}
          onClose={() => { setIsAvailabilityOpen(false); setEditAvailabilityTarget(null); setAvailabilityUserId(''); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['availability'] }); queryClient.invalidateQueries({ queryKey: queryKeys.allAvailability }); }}
        />
      )}

      {isCapacityProfileOpen && (
        <CapacityProfileModal
          editTarget={editCapacityProfileTarget}
          onClose={() => { setIsCapacityProfileOpen(false); setEditCapacityProfileTarget(null); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['capacityProfiles'] }); }}
        />
      )}

      {deleteMemberAllocTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'resource.deleteMemberAllocation' })}
          description={intl.formatMessage({ id: 'resource.deleteMemberAllocationMessage' }, { name: deleteMemberAllocTarget.user_name || 'this member', project: deleteMemberAllocTarget.project_name || 'this project' })}
          confirmLabel={intl.formatMessage({ id: 'allocation.deleteAllocation' })}
          variant="danger"
          isPending={deleteMemberAllocationMutation.isPending}
          onConfirm={() => deleteMemberAllocationMutation.mutate(deleteMemberAllocTarget.id)}
          onCancel={() => setDeleteMemberAllocTarget(null)}
        />
      )}

      {deleteAvailabilityTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'resource.deleteLeaveWindow' })}
          description={intl.formatMessage({ id: 'resource.deleteLeaveWindowMessage' })}
          confirmLabel={intl.formatMessage({ id: 'resource.confirmDeleteWindow' })}
          variant="danger"
          isPending={deleteAvailabilityMutation.isPending}
          onConfirm={() => deleteAvailabilityMutation.mutate(deleteAvailabilityTarget)}
          onCancel={() => setDeleteAvailabilityTarget(null)}
        />
      )}

      {deleteCapacityProfileTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'resource.deleteCapacityProfile' })}
          description={intl.formatMessage({ id: 'resource.deleteCapacityProfileMessage' }, { date: deleteCapacityProfileTarget.effective_from })}
          confirmLabel={intl.formatMessage({ id: 'resource.confirmDeleteProfile' })}
          variant="danger"
          isPending={deleteCapacityProfileMutation.isPending}
          onConfirm={() => deleteCapacityProfileMutation.mutate({ userId: deleteCapacityProfileTarget.user_id, profileId: deleteCapacityProfileTarget.id })}
          onCancel={() => setDeleteCapacityProfileTarget(null)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Workload Tab                                                               */
/* -------------------------------------------------------------------------- */
interface WorkloadTabProps {
  isLoading: boolean;
  error: Error | null;
  data: WorkloadItem[];
  dateRange: { starts_on?: string; ends_on?: string };
  onDateRangeChange: (range: { starts_on?: string; ends_on?: string }) => void;
}

function WorkloadTab({ isLoading, error, data, dateRange, onDateRangeChange }: WorkloadTabProps) {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      const name = item.user_name || item.name || '';
      const email = item.email || '';
      if (q && !`${name} ${email}`.toLowerCase().includes(q)) return false;
      const isOver = (item.allocated_hours ?? 0) > (item.capacity_hours ?? 40);
      if (filterMode === 'overallocated' && !isOver) return false;
      return true;
    });
  }, [data, search, filterMode]);

  const overAllocatedCount = useMemo(() => {
    return data.filter((item) => (item.allocated_hours ?? 0) > (item.capacity_hours ?? 40)).length;
  }, [data]);

  if (isLoading) return <div className="loading-state"><span className="spinner" /> {intl.formatMessage({ id: 'resource.loadingWorkload' })}</div>;
  if (error) return <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'resource.loadWorkloadError' })} message={error.message} />;
  if (data.length === 0) return <EmptyState icon={Users} title={intl.formatMessage({ id: 'resource.noWorkload' })} message={intl.formatMessage({ id: 'resource.noWorkloadMessage' })} />;

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">{intl.formatMessage({ id: 'resource.workloadBalance' })}</span>
          <h2>
            {intl.formatMessage({ id: 'resource.teamMemberCount' }, { n: data.length })}
            {overAllocatedCount > 0 && (
              <span className="status-badge status-overallocated" style={{ marginLeft: 10 }}>
                <span className="status-dot" />
                {overAllocatedCount} {intl.formatMessage({ id: 'resource.overallocated' })}
              </span>
            )}
          </h2>
        </div>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder={intl.formatMessage({ id: 'resource.filterMembers' })} />
          <SelectField
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            label={intl.formatMessage({ id: 'resource.filterStatus' })}
            options={[
              { value: 'all', label: intl.formatMessage({ id: 'resource.filterAllMembers' }) },
              { value: 'overallocated', label: intl.formatMessage({ id: 'resource.filterOverallocatedOnly' }) },
            ]}
            translateOptionLabels={false}
          />
          <div className="field-group" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <label htmlFor="workload-start" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{intl.formatMessage({ id: 'member.from' })}</label>
            <input
              id="workload-start"
              type="date"
              value={dateRange.starts_on || ''}
              onChange={(e) => onDateRangeChange({ ...dateRange, starts_on: e.target.value || undefined })}
              style={{ maxWidth: 140 }}
            />
            <label htmlFor="workload-end" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{intl.formatMessage({ id: 'member.to' })}</label>
            <input
              id="workload-end"
              type="date"
              value={dateRange.ends_on || ''}
              onChange={(e) => onDateRangeChange({ ...dateRange, ends_on: e.target.value || undefined })}
              style={{ maxWidth: 140 }}
            />
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <EmptyState icon={Users} title={intl.formatMessage({ id: 'resource.noMatchingMembers' })} message={intl.formatMessage({ id: 'resource.noMatchingMembersMessage' })} />
      ) : (
        <div className="member-grid">
          {filteredData.map((item) => {
            const allocated = item.allocated_hours ?? 0;
            const capacity = item.capacity_hours ?? 40;
            const isOver = allocated > capacity;
            const diff = allocated - capacity;

            return (
              <article className={`member-card ${isOver ? 'is-overallocated' : ''}`} key={item.user_id || item.id}>
                <span className="avatar avatar-large">
                  {(item.user_name || item.name || '—').slice(0, 2).toUpperCase()}
                </span>
                <div className="member-copy">
                  <strong>{item.user_name || item.name || 'Unknown'}</strong>
                  <span>{item.email || ''}</span>
                </div>
                <div className="workload-info">
                  {isOver ? (
                    <span className="status-badge status-overallocated" title={intl.formatMessage({ id: 'resource.exceedsCapacity' }, { diff })}>
                      <span className="status-dot" />
                      {intl.formatMessage({ id: 'resource.capacityDelta' }, { alloc: allocated, cap: capacity, diff })}
                    </span>
                  ) : (
                    <span className="status-badge status-active">
                      <span className="status-dot" />
                      {intl.formatMessage({ id: 'resource.hoursAllocated' }, { alloc: allocated })}
                    </span>
                  )}
                  {!isOver && capacity != null && (
                    <span className="status-badge">{intl.formatMessage({ id: 'resource.hoursCapacity' }, { cap: capacity })}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Assignments Tab                                                            */
/* -------------------------------------------------------------------------- */
interface AssignmentsTabProps {
  isLoading: boolean;
  memberError: Error | null;
  memberAllocations: MemberAllocation[];
  onEditMemberAlloc: (alloc: MemberAllocation) => void;
  onDeleteMemberAlloc: (alloc: MemberAllocation) => void;
}

interface MemberAssignmentGroup {
  userId: string;
  userName: string;
  userEmail: string;
  peakPercentage: number;
  allocations: MemberAllocation[];
}

function groupMemberAssignments(allocations: MemberAllocation[]): MemberAssignmentGroup[] {
  const byMember = new Map<string, Omit<MemberAssignmentGroup, 'peakPercentage'>>();
  allocations.forEach((allocation) => {
    const userId = allocation.user_id || `unknown-${allocation.id}`;
    const group = byMember.get(userId) || {
      userId,
      userName: allocation.user_name || 'Unknown member',
      userEmail: allocation.user_email || '',
      allocations: [],
    };
    group.allocations.push(allocation);
    byMember.set(userId, group);
  });

  return [...byMember.values()]
    .map((group) => ({
      ...group,
      allocations: group.allocations.sort((left, right) => (
        (left.starts_on || '').localeCompare(right.starts_on || '') ||
        (left.project_name || '').localeCompare(right.project_name || '')
      )),
      peakPercentage: getPeakAllocationPercentage(group.allocations),
    }))
    .sort((left, right) => (
      Number(right.peakPercentage > 100) - Number(left.peakPercentage > 100) ||
      left.userName.localeCompare(right.userName)
    ));
}

function formatPercentage(value: number, intl: ReturnType<typeof useIntl>): string {
  return intl.formatNumber(value, { maximumFractionDigits: 1 });
}

function CapacityBadge({ peakPercentage }: { peakPercentage: number }) {
  const intl = useIntl();
  if (peakPercentage > 100) {
    return (
      <span className="rounded-badge bg-coral-red/15 px-2 py-1 text-[10px] text-[#f09a9a]">
        {intl.formatMessage({ id: 'resource.overallocatedBadge' }, { x: formatPercentage(peakPercentage - 100, intl), y: formatPercentage(peakPercentage, intl) })}
      </span>
    );
  }
  if (peakPercentage === 100) {
    return <span className="rounded-badge bg-white/5 px-2 py-1 text-[10px] text-mist">{intl.formatMessage({ id: 'resource.atCapacityBadge' }, { y: formatPercentage(peakPercentage, intl) })}</span>;
  }
  return (
    <span className="rounded-badge bg-white/5 px-2 py-1 text-[10px] text-fog">
      {intl.formatMessage({ id: 'resource.availableBadge' }, { x: formatPercentage(100 - peakPercentage, intl), y: formatPercentage(peakPercentage, intl) })}
    </span>
  );
}

function AssignmentsTab({
  isLoading,
  memberError,
  memberAllocations,
  onEditMemberAlloc,
  onDeleteMemberAlloc,
}: AssignmentsTabProps) {
  const intl = useIntl();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const memberGroups = useMemo(() => groupMemberAssignments(memberAllocations), [memberAllocations]);

  const projectOptions = useMemo(() => {
    const projects = new Map<string, string>();
    memberAllocations.forEach((allocation) => {
      if (allocation.project_id) projects.set(allocation.project_id, allocation.project_name || intl.formatMessage({ id: 'common.unassigned' }));
    });
    return [...projects].map(([value, label]) => ({ value, label })).sort((left, right) => left.label.localeCompare(right.label));
  }, [intl, memberAllocations]);

  const filteredMemberGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return memberGroups.filter((group) => {
      const hasProject = !projectFilter || group.allocations.some((allocation) => allocation.project_id === projectFilter);
      const searchableText = `${group.userName} ${group.userEmail} ${group.allocations.map((allocation) => allocation.project_name).join(' ')}`.toLowerCase();
      return hasProject && (!query || searchableText.includes(query));
    });
  }, [memberGroups, projectFilter, search]);

  const totalAllocations = memberAllocations.length;

  if (isLoading) return <div className="loading-state"><span className="spinner" /> {intl.formatMessage({ id: 'resource.loadingAssignments' })}</div>;
  if (memberError) return <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'resource.loadAssignmentsError' })} message={memberError.message} />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{intl.formatMessage({ id: 'resource.peopleCommitments' })}</span>
          <h2>
            {intl.formatMessage({ id: 'resource.peopleCount' }, { people: memberGroups.length, assignments: totalAllocations })}
          </h2>
        </div>
        <div className="flex w-full flex-wrap gap-2 border-t border-graphite pt-3">
          <div className="min-w-[200px] max-[600px]:w-full [&_.select-field]:w-full [&_select]:w-full">
            <SelectField
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              label={intl.formatMessage({ id: 'allocation.project' })}
            options={projectOptions}
            translateOptionLabels={false}
              placeholder={intl.formatMessage({ id: 'resource.filterAllProjects' })}
            />
          </div>
          <div className="min-w-[260px] flex-1 max-[600px]:min-w-0 [&_.search-field]:w-full [&_input]:w-full">
            <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder={intl.formatMessage({ id: 'resource.searchPeopleProjects' })} />
          </div>
        </div>
      </div>

      {totalAllocations === 0 ? (
        <EmptyState icon={Layers} title={intl.formatMessage({ id: 'resource.noAssignments' })} message={intl.formatMessage({ id: 'resource.noAssignmentsMessage' })} />
      ) : filteredMemberGroups.length === 0 ? (
        <EmptyState icon={Search} title={intl.formatMessage({ id: 'resource.noMatchingAssignments' })} message={intl.formatMessage({ id: 'resource.noMatchingAssignmentsMessage' })} />
      ) : (
        <section aria-labelledby="people-assignments-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 id="people-assignments-heading" className="text-[11px] font-[510] uppercase tracking-[0.08em] text-ash">{intl.formatMessage({ id: 'resource.teamMembers' })}</h3>
                <span className="text-[10px] text-ash">{intl.formatMessage({ id: 'resource.overallPeakHint' })}</span>
              </div>
              <div className="space-y-2">
                {filteredMemberGroups.map((group) => {
                  const isOverallocated = group.peakPercentage > 100;
                  return (
                    <article
                      className={`overflow-hidden rounded-control border bg-white/[0.015] ${isOverallocated ? 'border-coral-red/40' : 'border-graphite'}`}
                      key={group.userId}
                    >
                      <header className="flex items-center justify-between gap-3 border-b border-graphite px-3.5 py-3 max-[600px]:items-start">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="avatar">{group.userName.slice(0, 2).toUpperCase()}</span>
                          <div className="min-w-0">
                            <h4 className="truncate text-[12px] font-[510] text-bone">{group.userName}</h4>
                            <p className="mt-0.5 truncate text-[9px] text-ash">{group.userEmail || `${group.allocations.length} project allocation${group.allocations.length === 1 ? '' : 's'}`}</p>
                          </div>
                        </div>
                        <CapacityBadge peakPercentage={group.peakPercentage} />
                      </header>
                      <ul className="m-0 list-none p-0">
                        {group.allocations.map((allocation) => (
                          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-graphite px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_72px_auto]" key={allocation.id}>
                            <div className="min-w-0">
                              <strong className="block truncate text-[11px] font-[510] text-mist">{allocation.project_name || intl.formatMessage({ id: 'resource.unassignedProject' })}</strong>
                              <small className="mt-0.5 block truncate text-[9px] text-ash">
                                {allocation.starts_on && allocation.ends_on ? `${allocation.starts_on} → ${allocation.ends_on}` : intl.formatMessage({ id: 'resource.datesNotSet' })}
                              </small>
                            </div>
                            <span className="text-right text-[12px] font-[510] text-bone">{formatPercentage(getAllocationPercentage(allocation), intl)}%</span>
                            <div className="invitation-actions col-span-2 justify-end sm:col-span-1">
                              <button className="icon-button" type="button" aria-label={intl.formatMessage({ id: 'allocation.edit' })} onClick={() => onEditMemberAlloc(allocation)}><Pencil size={14} /></button>
                              <button className="icon-button" type="button" aria-label={intl.formatMessage({ id: 'resource.removeAllocation' })} onClick={() => onDeleteMemberAlloc(allocation)}><Trash2 size={14} /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
        </section>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Availability Tab                                                           */
/* -------------------------------------------------------------------------- */
interface AvailabilityTabProps {
  users: { id: string; name: string; email: string }[];
  onNewUnavailability: (userId?: string) => void;
  onEditAvailability: (rec: Availability) => void;
  onDeleteAvailability: (userId: string, id: string) => void;
}

function AvailabilityTab({ users, onNewUnavailability, onEditAvailability, onDeleteAvailability }: AvailabilityTabProps) {
  const intl = useIntl();
  const availabilityQuery = useQuery({
    queryKey: queryKeys.allAvailability,
    queryFn: ({ signal }) => api.listAllAvailability(signal),
  });

  const records = availabilityQuery.data || [];

  const recordsByUser = new Map<string, Availability[]>();
  for (const rec of records) {
    const userRecords = recordsByUser.get(rec.user_id) || [];
    userRecords.push(rec);
    recordsByUser.set(rec.user_id, userRecords);
  }

  function statusLabel(rec: Availability) {
    if (rec.availability_status === 'unavailable') return intl.formatMessage({ id: 'resource.leaveVacation' });
    if (rec.availability_status === 'reduced_capacity') return intl.formatMessage({ id: 'resource.reducedCapacity' });
    return intl.formatMessage({ id: 'resource.available' });
  }

  if (availabilityQuery.isLoading) return <div className="loading-state"><span className="spinner" /> {intl.formatMessage({ id: 'resource.loadingAvailability' })}</div>;
  if (availabilityQuery.error) return <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'resource.loadAvailabilityError' })} message={availabilityQuery.error.message} />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{intl.formatMessage({ id: 'resource.capacityTimeOff' })}</span>
          <h2>
            {intl.formatMessage({ id: 'resource.availabilitySummary' }, { members: users.length, windows: records.length })}
          </h2>
        </div>
        <button className="button button-secondary button-small" type="button" onClick={() => onNewUnavailability()}>
          <Plus size={13} /> {intl.formatMessage({ id: 'resource.newAvailability' })}
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title={intl.formatMessage({ id: 'resource.noTeamMembers' })} message={intl.formatMessage({ id: 'resource.noTeamMembersMessage' })} />
      ) : (
        <div className="space-y-2">
          {users.map((member) => {
            const memberRecords = recordsByUser.get(member.id) || [];
            const hasRestrictions = memberRecords.some((rec) => rec.availability_status !== 'available');
            return (
              <article className="overflow-hidden rounded-control border border-graphite bg-white/[0.015]" key={member.id}>
                <header className="flex items-center justify-between gap-3 border-b border-graphite px-3.5 py-3 max-[600px]:items-start">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="avatar">{member.name.slice(0, 2).toUpperCase()}</span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[12px] font-[510] text-bone">{member.name}</h3>
                      <p className="mt-0.5 truncate text-[9px] text-ash">{member.email || 'No email listed'}</p>
                    </div>
                  </div>
                  <button className="button button-secondary button-small" type="button" onClick={() => onNewUnavailability(member.id)}>
                    <Plus size={13} /> {intl.formatMessage({ id: 'resource.recordLeave' })}
                  </button>
                </header>
                {memberRecords.length === 0 ? (
                  <p className="px-3.5 py-3 text-[11px] text-ash">{intl.formatMessage({ id: 'resource.noRestrictions' })}</p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {memberRecords.map((rec) => (
                      <li
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-graphite px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                        key={rec.id}
                      >
                        <div className="min-w-0">
                          <strong className={`block truncate text-[11px] font-[510] ${rec.availability_status === 'unavailable' ? 'text-coral-red' : rec.availability_status === 'reduced_capacity' ? 'text-[#d8a52f]' : 'text-mist'}`}>
                            {statusLabel(rec)}
                          </strong>
                          <small className="mt-0.5 block truncate text-[9px] text-ash">
                            {rec.starts_on} — {rec.ends_on} · {intl.formatMessage({ id: 'resource.periodHours' }, { hours: rec.capacity_hours })}{rec.note ? ` · ${rec.note}` : ''}
                          </small>
                        </div>
<span className="hidden text-[10px] text-ash sm:block">
                          {rec.availability_status === 'available' ? intl.formatMessage({ id: 'resource.available' }) : hasRestrictions ? intl.formatMessage({ id: 'resource.restricted' }) : ''}
                        </span>
                        <div className="invitation-actions justify-end">
                          <button className="icon-button" type="button" aria-label={intl.formatMessage({ id: 'resource.editWindow' }, { status: statusLabel(rec) })} onClick={() => onEditAvailability(rec)}><Pencil size={14} /></button>
                          <button className="icon-button" type="button" aria-label={intl.formatMessage({ id: 'resource.deleteWindow' }, { status: statusLabel(rec) })} onClick={() => onDeleteAvailability(rec.user_id || member.id, rec.id)}><Trash2 size={14} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Capacity Profiles Tab                                                      */
/* -------------------------------------------------------------------------- */
interface CapacityProfilesTabProps {
  isLoading: boolean;
  error: Error | null;
  profiles: CapacityProfile[];
  onNewProfile: () => void;
  onEditProfile: (profile: CapacityProfile) => void;
  onDeleteProfile: (profile: CapacityProfile) => void;
}

function CapacityProfilesTab({ isLoading, error, profiles, onNewProfile, onEditProfile, onDeleteProfile }: CapacityProfilesTabProps) {
  const intl = useIntl();
  const [search, setSearch] = useState('');

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      `${p.user_name || ''} ${p.user_email || ''}`.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  if (isLoading) return <div className="loading-state"><span className="spinner" /> {intl.formatMessage({ id: 'resource.loadingProfiles' })}</div>;
  if (error) return <EmptyState icon={TriangleAlert} title={intl.formatMessage({ id: 'resource.loadProfilesError' })} message={error.message} />;

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">{intl.formatMessage({ id: 'resource.memberCapacity' })}</span>
          <h2>{intl.formatMessage({ id: 'resource.profileCount' }, { n: profiles.length })}</h2>
        </div>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder={intl.formatMessage({ id: 'resource.searchProfiles' })} />
          <button className="button button-secondary button-small" type="button" onClick={onNewProfile}>
            <Plus size={13} /> {intl.formatMessage({ id: 'resource.newProfile' })}
          </button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title={intl.formatMessage({ id: 'capacity.noProfiles' })}
          message={intl.formatMessage({ id: 'resource.noProfilesMessage' })}
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon={Users} title={intl.formatMessage({ id: 'resource.noMatchingProfiles' })} message={intl.formatMessage({ id: 'resource.noMatchingProfilesMessage' })} />
      ) : (
        <DetailList>
          {filteredProfiles.map((profile) => (
            <DetailRow key={profile.id}>
              <span className="avatar">{(profile.user_name || '—').slice(0, 2).toUpperCase()}</span>
              <span className="detail-list-copy">
                <strong>{profile.user_name || `User ${profile.user_id}`}</strong>
                <small>{intl.formatMessage({ id: 'member.hoursPerWeek' }, { hours: profile.weekly_capacity_hours })} · {intl.formatMessage({ id: 'capacity.effectiveFrom' }, { date: profile.effective_from })}</small>
              </span>
              <div className="invitation-actions">
                <button className="text-button" type="button" onClick={() => onEditProfile(profile)}>
                  {intl.formatMessage({ id: 'common.edit' })}
                </button>
                <button className="text-button text-button-danger" type="button" onClick={() => onDeleteProfile(profile)}>
                  {intl.formatMessage({ id: 'common.delete' })}
                </button>
              </div>
            </DetailRow>
          ))}
        </DetailList>
      )}
    </>
  );
}
