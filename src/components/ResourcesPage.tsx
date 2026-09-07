import { useMemo, useState } from 'react';
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
import { Calendar, Layers, Pencil, Plus, Search, Trash2, TriangleAlert, Users } from 'lucide-react';

interface ResourcesPageProps {
  onMenu: () => void;
}

export default function ResourcesPage({ onMenu }: ResourcesPageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'Workload' | 'Assignments' | 'Availability' | 'Capacity'>('Workload');

  const [isAllocationOpen, setIsAllocationOpen] = useState(false);
  const [editMemberAlloc, setEditMemberAlloc] = useState<MemberAllocation | null>(null);
  const [deleteMemberAllocTarget, setDeleteMemberAllocTarget] = useState<MemberAllocation | null>(null);

  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [editAvailabilityTarget, setEditAvailabilityTarget] = useState<Availability | null>(null);
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['availability'] }); setDeleteAvailabilityTarget(null); },
  });

  const deleteCapacityProfileMutation = useMutation({
    mutationFn: ({ userId, profileId }: { userId: string; profileId: string }) =>
      api.updateCapacityProfile(userId, profileId, { weekly_capacity_hours: 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['capacityProfiles'] }); setDeleteCapacityProfileTarget(null); },
  });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Resources"
        description="Manage team capacity, workload balance, and project allocations."
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
              New allocation
            </button>
          ) : activeTab === 'Availability' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditAvailabilityTarget(null); setIsAvailabilityOpen(true); }}
            >
              <Plus />
              Record leave / unavailability
            </button>
          ) : activeTab === 'Capacity' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditCapacityProfileTarget(null); setIsCapacityProfileOpen(true); }}
            >
              <Plus />
              New capacity profile
            </button>
          ) : null
        }
      />

      <nav className="project-tabs" aria-label="Resource sections">
        {(['Workload', 'Assignments', 'Availability', 'Capacity'] as const).map((tab) => (
          <button
            className={activeTab === tab ? 'is-active' : ''}
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
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
            onNewUnavailability={() => { setEditAvailabilityTarget(null); setIsAvailabilityOpen(true); }}
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
          onClose={() => { setIsAvailabilityOpen(false); setEditAvailabilityTarget(null); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['availability'] }); }}
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
          title="Delete Member Allocation"
          description={`Are you sure you want to remove ${deleteMemberAllocTarget.user_name || 'this member'}'s allocation for ${deleteMemberAllocTarget.project_name || 'this project'}?`}
          confirmLabel="Delete allocation"
          variant="danger"
          isPending={deleteMemberAllocationMutation.isPending}
          onConfirm={() => deleteMemberAllocationMutation.mutate(deleteMemberAllocTarget.id)}
          onCancel={() => setDeleteMemberAllocTarget(null)}
        />
      )}

      {deleteAvailabilityTarget && (
        <ConfirmDialog
          title="Delete Leave Window"
          description="Are you sure you want to remove this leave/unavailability record?"
          confirmLabel="Delete window"
          variant="danger"
          isPending={deleteAvailabilityMutation.isPending}
          onConfirm={() => deleteAvailabilityMutation.mutate(deleteAvailabilityTarget)}
          onCancel={() => setDeleteAvailabilityTarget(null)}
        />
      )}

      {deleteCapacityProfileTarget && (
        <ConfirmDialog
          title="Delete Capacity Profile"
          description={`Are you sure you want to remove this capacity profile (effective ${deleteCapacityProfileTarget.effective_from})?`}
          confirmLabel="Delete profile"
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

  if (isLoading) return <div className="loading-state"><span className="spinner" /> Loading workload…</div>;
  if (error) return <EmptyState icon={TriangleAlert} title="Failed to load workload" message={error.message} />;
  if (data.length === 0) return <EmptyState icon={Users} title="No workload data" message="Workload information will appear once team members are assigned to projects." />;

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">Workload Balance</span>
          <h2>
            {data.length} team member{data.length === 1 ? '' : 's'}
            {overAllocatedCount > 0 && (
              <span className="status-badge status-overallocated" style={{ marginLeft: 10 }}>
                <span className="status-dot" />
                {overAllocatedCount} over-allocated
              </span>
            )}
          </h2>
        </div>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter members…" />
          <SelectField
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            label="Filter status"
            options={[
              { value: 'all', label: 'All members' },
              { value: 'overallocated', label: 'Over-allocated only' },
            ]}
          />
          <div className="field-group" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <label htmlFor="workload-start" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>From</label>
            <input
              id="workload-start"
              type="date"
              value={dateRange.starts_on || ''}
              onChange={(e) => onDateRangeChange({ ...dateRange, starts_on: e.target.value || undefined })}
              style={{ maxWidth: 140 }}
            />
            <label htmlFor="workload-end" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>To</label>
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
        <EmptyState icon={Users} title="No matching members" message="Adjust search or filters to see workload balance." />
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
                    <span className="status-badge status-overallocated" title={`Exceeds capacity by ${diff.toFixed(1)} hours`}>
                      <span className="status-dot" />
                      {allocated}h / {capacity}h (+{diff.toFixed(1)}h)
                    </span>
                  ) : (
                    <span className="status-badge status-active">
                      <span className="status-dot" />
                      {allocated}h allocated
                    </span>
                  )}
                  {!isOver && capacity != null && (
                    <span className="status-badge">{capacity}h capacity</span>
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

function formatPercentage(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function CapacityBadge({ peakPercentage, noun = 'capacity' }: { peakPercentage: number; noun?: string }) {
  if (peakPercentage > 100) {
    return (
      <span className="rounded-badge bg-coral-red/15 px-2 py-1 text-[10px] text-[#f09a9a]">
        Overallocated by {formatPercentage(peakPercentage - 100)}% · {formatPercentage(peakPercentage)}% peak
      </span>
    );
  }
  if (peakPercentage === 100) {
    return <span className="rounded-badge bg-white/5 px-2 py-1 text-[10px] text-mist">At {noun} · 100% peak</span>;
  }
  return (
    <span className="rounded-badge bg-white/5 px-2 py-1 text-[10px] text-fog">
      {formatPercentage(100 - peakPercentage)}% available · {formatPercentage(peakPercentage)}% peak
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
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const memberGroups = useMemo(() => groupMemberAssignments(memberAllocations), [memberAllocations]);

  const projectOptions = useMemo(() => {
    const projects = new Map<string, string>();
    memberAllocations.forEach((allocation) => {
      if (allocation.project_id) projects.set(allocation.project_id, allocation.project_name || 'Unassigned');
    });
    return [...projects].map(([value, label]) => ({ value, label })).sort((left, right) => left.label.localeCompare(right.label));
  }, [memberAllocations]);

  const filteredMemberGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return memberGroups.filter((group) => {
      const hasProject = !projectFilter || group.allocations.some((allocation) => allocation.project_id === projectFilter);
      const searchableText = `${group.userName} ${group.userEmail} ${group.allocations.map((allocation) => allocation.project_name).join(' ')}`.toLowerCase();
      return hasProject && (!query || searchableText.includes(query));
    });
  }, [memberGroups, projectFilter, search]);

  const totalAllocations = memberAllocations.length;

  if (isLoading) return <div className="loading-state"><span className="spinner" /> Loading assignments…</div>;
  if (memberError) return <EmptyState icon={TriangleAlert} title="Failed to load assignments" message={memberError.message} />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">People & Project Commitments</span>
          <h2>
            {memberGroups.length} {memberGroups.length === 1 ? 'Person' : 'People'} · {totalAllocations} Assignment{totalAllocations === 1 ? '' : 's'}
          </h2>
        </div>
        <div className="flex w-full flex-wrap gap-2 border-t border-graphite pt-3">
          <div className="min-w-[200px] max-[600px]:w-full [&_.select-field]:w-full [&_select]:w-full">
            <SelectField
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              label="Filter by project"
              options={projectOptions}
              placeholder="All projects"
            />
          </div>
          <div className="min-w-[260px] flex-1 max-[600px]:min-w-0 [&_.search-field]:w-full [&_input]:w-full">
            <SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people and projects…" />
          </div>
        </div>
      </div>

      {totalAllocations === 0 ? (
        <EmptyState icon={Layers} title="No assignments found" message="Project assignments will appear here once team members are allocated." />
      ) : filteredMemberGroups.length === 0 ? (
        <EmptyState icon={Search} title="No matching assignments" message="Adjust the search or project filter." />
      ) : (
        <section aria-labelledby="people-assignments-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 id="people-assignments-heading" className="text-[11px] font-[510] uppercase tracking-[0.08em] text-ash">Team members</h3>
                <span className="text-[10px] text-ash">Overall peak is the highest concurrent allocation across projects</span>
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
                              <strong className="block truncate text-[11px] font-[510] text-mist">{allocation.project_name || 'Unassigned project'}</strong>
                              <small className="mt-0.5 block truncate text-[9px] text-ash">
                                {allocation.starts_on && allocation.ends_on ? `${allocation.starts_on} → ${allocation.ends_on}` : 'Dates not set'}
                              </small>
                            </div>
                            <span className="text-right text-[12px] font-[510] text-bone">{formatPercentage(getAllocationPercentage(allocation))}%</span>
                            <div className="invitation-actions col-span-2 justify-end sm:col-span-1">
                              <button className="icon-button" type="button" aria-label="Edit allocation" onClick={() => onEditMemberAlloc(allocation)}><Pencil size={14} /></button>
                              <button className="icon-button" type="button" aria-label="Remove allocation" onClick={() => onDeleteMemberAlloc(allocation)}><Trash2 size={14} /></button>
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
  onNewUnavailability: () => void;
  onEditAvailability: (rec: Availability) => void;
  onDeleteAvailability: (userId: string, id: string) => void;
}

function AvailabilityTab({ users, onNewUnavailability, onEditAvailability, onDeleteAvailability }: AvailabilityTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const targetUserId = selectedUserId || '';

  const availabilityQuery = useQuery({
    queryKey: ['availability', targetUserId],
    queryFn: ({ signal }) => targetUserId ? api.listAvailability(targetUserId, signal) : Promise.resolve([]),
    enabled: Boolean(targetUserId),
  });

  const records = availabilityQuery.data || [];

  const todayStr = new Date().toISOString().slice(0, 10);

  const earliestDate = records.length > 0
    ? records.reduce((earliest, rec) => rec.starts_on < earliest ? rec.starts_on : earliest, records[0].starts_on)
    : todayStr;

  const latestDate = records.length > 0
    ? records.reduce((latest, rec) => rec.ends_on > latest ? rec.ends_on : latest, records[0].ends_on)
    : todayStr;

  function getBarStyle(rec: Availability) {
    const rangeStart = new Date(earliestDate).getTime();
    const totalSpan = (new Date(latestDate).getTime() - rangeStart) / (1000 * 60 * 60 * 24);
    const recStart = (new Date(rec.starts_on).getTime() - rangeStart) / (1000 * 60 * 60 * 24);
    const recEnd = (new Date(rec.ends_on).getTime() - rangeStart) / (1000 * 60 * 60 * 24);
    const leftPct = totalSpan > 0 ? (recStart / totalSpan) * 100 : 0;
    const widthPct = totalSpan > 0 ? ((recEnd - recStart + 1) / totalSpan) * 100 : 100;
    const bgColor = rec.availability_status === 'unavailable' ? 'var(--color-coral-red)' : '#d8a52f';
    return { left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`, backgroundColor: bgColor };
  }

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">Capacity & Time-off</span>
          <h2>Availability Schedule</h2>
        </div>
        <div className="toolbar-fields">
          <SelectField
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            label="Select member"
            options={users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` }))}
            placeholder="Select team member…"
          />
          <button className="button button-secondary button-small" type="button" onClick={onNewUnavailability} disabled={!targetUserId}>
            <Plus size={13} /> Record leave
          </button>
        </div>
      </div>

      {!targetUserId ? (
        <EmptyState
          icon={Calendar}
          title="Select a team member"
          message="Choose a team member above to view planned capacity and unavailability windows."
        />
      ) : availabilityQuery.isLoading ? (
        <div className="loading-state"><span className="spinner" /> Loading availability schedule…</div>
      ) : availabilityQuery.error ? (
        <EmptyState icon={TriangleAlert} title="Failed to load availability" message={availabilityQuery.error.message} />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No unavailability recorded"
          message="No vacations, leave, or planned capacity restrictions are scheduled for this team member."
        />
      ) : (
        <>
          <div style={{ padding: '16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <span>{earliestDate}</span>
              <span>{latestDate}</span>
            </div>
            <div style={{ position: 'relative', height: records.length * 36 + 8, background: 'var(--color-surface-elevated)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              {records.map((rec) => {
                const topIndex = records.indexOf(rec);
                return (
                  <div
                    key={rec.id}
                    title={`${rec.availability_status === 'unavailable' ? 'Leave' : 'Reduced capacity'}: ${rec.starts_on} → ${rec.ends_on}${rec.note ? ` (${rec.note})` : ''}`}
                    style={{
                      position: 'absolute',
                      top: topIndex * 36 + 4,
                      left: getBarStyle(rec).left,
                      width: getBarStyle(rec).width,
                      height: 28,
                      backgroundColor: getBarStyle(rec).backgroundColor,
                      opacity: 0.85,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      fontSize: 11,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => onEditAvailability(rec)}
                  >
                    {rec.starts_on} → {rec.ends_on}
                  </div>
                );
              })}
            </div>
          </div>

          <DetailList>
            {records.map((rec: Availability) => (
              <DetailRow key={rec.id}>
                <span className="avatar avatar-accent">
                  {rec.availability_status === 'unavailable' ? 'LV' : 'LM'}
                </span>
                <span className="detail-list-copy">
                  <strong>
                    {rec.availability_status === 'unavailable' ? 'Planned Leave / Vacation' : 'Limited Capacity'}
                  </strong>
                  <small>
                    {rec.starts_on} — {rec.ends_on} {rec.note ? `· ${rec.note}` : ''}
                  </small>
                </span>
                <div className="invitation-actions">
                  <button className="text-button" type="button" onClick={() => onEditAvailability(rec)}>
                    Edit
                  </button>
                  <button
                    className="text-button text-button-danger"
                    type="button"
                    onClick={() => onDeleteAvailability(rec.user_id || targetUserId, rec.id)}
                  >
                    Delete
                  </button>
                </div>
              </DetailRow>
            ))}
          </DetailList>
        </>
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
  const [search, setSearch] = useState('');

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      `${p.user_name || ''} ${p.user_email || ''}`.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  if (isLoading) return <div className="loading-state"><span className="spinner" /> Loading capacity profiles…</div>;
  if (error) return <EmptyState icon={TriangleAlert} title="Failed to load capacity profiles" message={error.message} />;

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">Member Capacity</span>
          <h2>{profiles.length} Capacity Profile{profiles.length === 1 ? '' : 's'}</h2>
        </div>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" />
          <button className="button button-secondary button-small" type="button" onClick={onNewProfile}>
            <Plus size={13} /> New profile
          </button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No capacity profiles"
          message="Define baseline weekly hours for team members. Default capacity is 40 hours per week if no profile is set."
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon={Users} title="No matching profiles" message="Adjust your search to see capacity profiles." />
      ) : (
        <DetailList>
          {filteredProfiles.map((profile) => (
            <DetailRow key={profile.id}>
              <span className="avatar">{(profile.user_name || '—').slice(0, 2).toUpperCase()}</span>
              <span className="detail-list-copy">
                <strong>{profile.user_name || `User ${profile.user_id}`}</strong>
                <small>{profile.weekly_capacity_hours}h / week · Effective from {profile.effective_from}</small>
              </span>
              <div className="invitation-actions">
                <button className="text-button" type="button" onClick={() => onEditProfile(profile)}>
                  Edit
                </button>
                <button className="text-button text-button-danger" type="button" onClick={() => onDeleteProfile(profile)}>
                  Delete
                </button>
              </div>
            </DetailRow>
          ))}
        </DetailList>
      )}
    </>
  );
}
