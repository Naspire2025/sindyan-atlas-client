import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type {
  Asset,
  AssetAllocation,
  Availability,
  CapacityProfile,
  MemberAllocation,
  WorkloadItem,
} from '../types/api.js';
import AllocationModal from './AllocationModal.js';
import AssetModal from './AssetModal.js';
import AvailabilityModal from './AvailabilityModal.js';
import CapacityProfileModal from './CapacityProfileModal.js';
import ConfirmDialog from './ConfirmDialog.js';
import { DetailList, DetailRow } from './DetailList.js';
import EmptyState from './EmptyState.js';
import { SearchField, SelectField } from './FilterBar.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface ResourcesPageProps {
  onMenu: () => void;
}

export default function ResourcesPage({ onMenu }: ResourcesPageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'Workload' | 'Allocations' | 'Assets' | 'Availability' | 'Capacity'>('Workload');

  const [isAllocationOpen, setIsAllocationOpen] = useState(false);
  const [allocationInitialType, setAllocationInitialType] = useState<'member' | 'asset'>('member');
  const [editMemberAlloc, setEditMemberAlloc] = useState<MemberAllocation | null>(null);
  const [editAssetAlloc, setEditAssetAlloc] = useState<AssetAllocation | null>(null);
  const [deleteMemberAllocTarget, setDeleteMemberAllocTarget] = useState<MemberAllocation | null>(null);
  const [deleteAssetAllocTarget, setDeleteAssetAllocTarget] = useState<AssetAllocation | null>(null);

  const [isAssetOpen, setIsAssetOpen] = useState(false);
  const [editAssetTarget, setEditAssetTarget] = useState<Asset | null>(null);
  const [deleteAssetTarget, setDeleteAssetTarget] = useState<Asset | null>(null);

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

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets,
    queryFn: ({ signal }) => api.listAssets(signal),
  });

  const memberAllocationsQuery = useQuery({
    queryKey: queryKeys.memberAllocations(),
    queryFn: ({ signal }) => api.listMemberAllocations({ signal }),
  });

  const assetAllocationsQuery = useQuery({
    queryKey: queryKeys.assetAllocations(),
    queryFn: ({ signal }) => api.listAssetAllocations({ signal }),
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
  const assets = assetsQuery.data || [];
  const memberAllocations = memberAllocationsQuery.data || [];
  const assetAllocations = assetAllocationsQuery.data || [];
  const users = usersQuery.data || [];
  const allCapacityProfiles = allCapacityProfilesQuery.data || [];

  const invalidateResources = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workload() });
    queryClient.invalidateQueries({ queryKey: queryKeys.memberAllocations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.assetAllocations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.assets });
    queryClient.invalidateQueries({ queryKey: queryKeys.allCapacityProfiles });
  };

  const deleteMemberAllocationMutation = useMutation({
    mutationFn: (id: string) => api.deleteMemberAllocation(id),
    onSuccess: () => { invalidateResources(); setDeleteMemberAllocTarget(null); },
  });

  const deleteAssetAllocationMutation = useMutation({
    mutationFn: (id: string) => api.deleteAssetAllocation(id),
    onSuccess: () => { invalidateResources(); setDeleteAssetAllocTarget(null); },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: () => { invalidateResources(); setDeleteAssetTarget(null); },
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
        description="Manage team capacity, workload balance, project allocations, and shared assets."
        onMenu={onMenu}
        action={
          activeTab === 'Allocations' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setEditMemberAlloc(null);
                setEditAssetAlloc(null);
                setAllocationInitialType('member');
                setIsAllocationOpen(true);
              }}
            >
              <Icon name="plus" />
              New allocation
            </button>
          ) : activeTab === 'Assets' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditAssetTarget(null); setIsAssetOpen(true); }}
            >
              <Icon name="plus" />
              New asset
            </button>
          ) : activeTab === 'Availability' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditAvailabilityTarget(null); setIsAvailabilityOpen(true); }}
            >
              <Icon name="plus" />
              Record leave / unavailability
            </button>
          ) : activeTab === 'Capacity' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => { setEditCapacityProfileTarget(null); setIsCapacityProfileOpen(true); }}
            >
              <Icon name="plus" />
              New capacity profile
            </button>
          ) : null
        }
      />

      <nav className="project-tabs" aria-label="Resource sections">
        {(['Workload', 'Allocations', 'Assets', 'Availability', 'Capacity'] as const).map((tab) => (
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

        {activeTab === 'Allocations' && (
          <AllocationsTab
            isLoading={memberAllocationsQuery.isLoading || assetAllocationsQuery.isLoading}
            memberError={memberAllocationsQuery.error}
            assetError={assetAllocationsQuery.error}
            memberAllocations={memberAllocations}
            assetAllocations={assetAllocations}
            onNewAllocation={(type) => {
              setEditMemberAlloc(null);
              setEditAssetAlloc(null);
              setAllocationInitialType(type);
              setIsAllocationOpen(true);
            }}
            onEditMemberAlloc={(alloc) => { setEditMemberAlloc(alloc); setEditAssetAlloc(null); setIsAllocationOpen(true); }}
            onEditAssetAlloc={(alloc) => { setEditAssetAlloc(alloc); setEditMemberAlloc(null); setIsAllocationOpen(true); }}
            onDeleteMemberAlloc={(alloc) => setDeleteMemberAllocTarget(alloc)}
            onDeleteAssetAlloc={(alloc) => setDeleteAssetAllocTarget(alloc)}
          />
        )}

        {activeTab === 'Assets' && (
          <AssetsTab
            isLoading={assetsQuery.isLoading}
            error={assetsQuery.error}
            data={assets}
            onNewAsset={() => { setEditAssetTarget(null); setIsAssetOpen(true); }}
            onEditAsset={(asset) => { setEditAssetTarget(asset); setIsAssetOpen(true); }}
            onDeleteAsset={(asset) => setDeleteAssetTarget(asset)}
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
          initialType={allocationInitialType}
          editMemberTarget={editMemberAlloc}
          editAssetTarget={editAssetAlloc}
          onClose={() => { setIsAllocationOpen(false); setEditMemberAlloc(null); setEditAssetAlloc(null); }}
          onSuccess={invalidateResources}
        />
      )}

      {isAssetOpen && (
        <AssetModal
          editTarget={editAssetTarget}
          onClose={() => { setIsAssetOpen(false); setEditAssetTarget(null); }}
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

      {deleteAssetAllocTarget && (
        <ConfirmDialog
          title="Delete Asset Allocation"
          description={`Are you sure you want to remove allocation for ${deleteAssetAllocTarget.asset_name || 'this asset'}?`}
          confirmLabel="Delete allocation"
          variant="danger"
          isPending={deleteAssetAllocationMutation.isPending}
          onConfirm={() => deleteAssetAllocationMutation.mutate(deleteAssetAllocTarget.id)}
          onCancel={() => setDeleteAssetAllocTarget(null)}
        />
      )}

      {deleteAssetTarget && (
        <ConfirmDialog
          title="Delete Shared Asset"
          description={`Are you sure you want to delete ${deleteAssetTarget.name}? This action cannot be undone.`}
          confirmLabel="Delete asset"
          variant="danger"
          isPending={deleteAssetMutation.isPending}
          onConfirm={() => deleteAssetMutation.mutate(deleteAssetTarget.id)}
          onCancel={() => setDeleteAssetTarget(null)}
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
  if (error) return <EmptyState icon="alert" title="Failed to load workload" message={error.message} />;
  if (data.length === 0) return <EmptyState icon="users" title="No workload data" message="Workload information will appear once team members are assigned to projects." />;

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
        <EmptyState icon="users" title="No matching members" message="Adjust search or filters to see workload balance." />
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
/* Allocations Tab                                                            */
/* -------------------------------------------------------------------------- */
interface AllocationsTabProps {
  isLoading: boolean;
  memberError: Error | null;
  assetError: Error | null;
  memberAllocations: MemberAllocation[];
  assetAllocations: AssetAllocation[];
  onNewAllocation: (type: 'member' | 'asset') => void;
  onEditMemberAlloc: (alloc: MemberAllocation) => void;
  onEditAssetAlloc: (alloc: AssetAllocation) => void;
  onDeleteMemberAlloc: (alloc: MemberAllocation) => void;
  onDeleteAssetAlloc: (alloc: AssetAllocation) => void;
}

function AllocationsTab({
  isLoading,
  memberError,
  assetError,
  memberAllocations,
  assetAllocations,
  onNewAllocation,
  onEditMemberAlloc,
  onEditAssetAlloc,
  onDeleteMemberAlloc,
  onDeleteAssetAlloc,
}: AllocationsTabProps) {
  const [search, setSearch] = useState('');

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return memberAllocations;
    return memberAllocations.filter((a) =>
      `${a.user_name || ''} ${a.project_name || ''}`.toLowerCase().includes(q)
    );
  }, [memberAllocations, search]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assetAllocations;
    return assetAllocations.filter((a) =>
      `${a.asset_name || ''} ${a.project_name || ''}`.toLowerCase().includes(q)
    );
  }, [assetAllocations, search]);

  if (isLoading) return <div className="loading-state"><span className="spinner" /> Loading allocations…</div>;
  if (memberError || assetError) return <EmptyState icon="alert" title="Failed to load allocations" message={memberError?.message || assetError?.message || 'Unknown error'} />;

  const hasData = memberAllocations.length > 0 || assetAllocations.length > 0;

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">Project Staffing & Equipment</span>
          <h2>
            {memberAllocations.length + assetAllocations.length} Active Allocation
            {memberAllocations.length + assetAllocations.length === 1 ? '' : 's'}
          </h2>
        </div>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search allocations…" />
          <button className="button button-secondary button-small" type="button" onClick={() => onNewAllocation('member')}>
            <Icon name="plus" size={13} /> Member allocation
          </button>
          <button className="button button-secondary button-small" type="button" onClick={() => onNewAllocation('asset')}>
            <Icon name="plus" size={13} /> Asset allocation
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState icon="projects" title="No allocations found" message="Project allocations will appear here once team members or shared assets are assigned." />
      ) : (
        <>
          {filteredMembers.length > 0 && (
            <div className="allocation-section">
              <div className="section-header compact">
                <h3>Member allocations</h3>
                <span className="count-pill">{filteredMembers.length}</span>
              </div>
              <DetailList>
                {filteredMembers.map((alloc) => {
                  const pct = alloc.allocation_percentage ?? alloc.percentage ?? 0;
                  return (
                    <DetailRow key={alloc.id}>
                      <span className="avatar">{(alloc.user_name || '—').slice(0, 2).toUpperCase()}</span>
                      <span className="detail-list-copy">
                        <strong>{alloc.user_name || `User ${alloc.user_id}`}</strong>
                        <small>
                          {alloc.project_name || `Project ${alloc.project_id}`} · {pct}% allocation
                          {alloc.starts_on && alloc.ends_on && ` · ${alloc.starts_on} → ${alloc.ends_on}`}
                        </small>
                      </span>
                      <div className="invitation-actions">
                        <button className="text-button" type="button" onClick={() => onEditMemberAlloc(alloc)}>
                          Reassign
                        </button>
                        <button className="text-button" type="button" onClick={() => onEditMemberAlloc(alloc)}>
                          Edit
                        </button>
                        <button className="text-button text-button-danger" type="button" onClick={() => onDeleteMemberAlloc(alloc)}>
                          Remove
                        </button>
                      </div>
                    </DetailRow>
                  );
                })}
              </DetailList>
            </div>
          )}

          {filteredAssets.length > 0 && (
            <div className="allocation-section" style={{ marginTop: 24 }}>
              <div className="section-header compact">
                <h3>Asset allocations</h3>
                <span className="count-pill">{filteredAssets.length}</span>
              </div>
              <DetailList>
                {filteredAssets.map((alloc) => {
                  const pct = alloc.allocation_percentage ?? alloc.percentage ?? 0;
                  return (
                    <DetailRow key={alloc.id}>
                      <span className="avatar">{(alloc.asset_name || '—').slice(0, 2).toUpperCase()}</span>
                      <span className="detail-list-copy">
                        <strong>{alloc.asset_name || `Asset ${alloc.asset_id}`}</strong>
                        <small>
                          {alloc.project_name || `Project ${alloc.project_id}`} · {pct}% usage
                          {alloc.starts_on && alloc.ends_on && ` · ${alloc.starts_on} → ${alloc.ends_on}`}
                        </small>
                      </span>
                      <div className="invitation-actions">
                        <button className="text-button" type="button" onClick={() => onEditAssetAlloc(alloc)}>
                          Reassign
                        </button>
                        <button className="text-button" type="button" onClick={() => onEditAssetAlloc(alloc)}>
                          Edit
                        </button>
                        <button className="text-button text-button-danger" type="button" onClick={() => onDeleteAssetAlloc(alloc)}>
                          Remove
                        </button>
                      </div>
                    </DetailRow>
                  );
                })}
              </DetailList>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Assets Tab                                                                 */
/* -------------------------------------------------------------------------- */
interface AssetsTabProps {
  isLoading: boolean;
  error: Error | null;
  data: Asset[];
  onNewAsset: () => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

function AssetsTab({ isLoading, error, data, onNewAsset, onEditAsset, onDeleteAsset }: AssetsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((asset) => {
      const name = asset.name || '';
      const type = asset.type || asset.asset_type || '';
      if (q && !`${name} ${type}`.toLowerCase().includes(q)) return false;
      if (statusFilter && asset.status !== statusFilter) return false;
      return true;
    });
  }, [data, search, statusFilter]);

  if (isLoading) return <div className="loading-state"><span className="spinner" /> Loading assets…</div>;
  if (error) return <EmptyState icon="alert" title="Failed to load assets" message={error.message} />;

  return (
    <>
      <div className="project-toolbar">
        <div>
          <span className="eyebrow">Shared Resources</span>
          <h2>
            {data.length} Shared Asset{data.length === 1 ? '' : 's'}
          </h2>
        </div>
        <div className="toolbar-fields">
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…" />
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by status"
            options={[
              { value: 'available', label: 'Available' },
              { value: 'in_use', label: 'In use' },
              { value: 'reserved', label: 'Reserved' },
              { value: 'retired', label: 'Retired' },
              { value: 'unavailable', label: 'Unavailable' },
            ]}
            placeholder="All statuses"
          />
          <button className="button button-secondary button-small" type="button" onClick={onNewAsset}>
            <Icon name="plus" size={13} /> New asset
          </button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState icon="projects" title="No shared assets" message="Shared assets and resources registered for your organization will appear here." />
      ) : (
        <DetailList>
          {filteredAssets.map((asset) => (
            <DetailRow key={asset.id}>
              <span className="avatar">{(asset.name || '—').slice(0, 2).toUpperCase()}</span>
              <span className="detail-list-copy">
                <strong>{asset.name}</strong>
                <small>{asset.type || asset.asset_type || 'Resource'} · Status: {asset.status || 'available'}</small>
              </span>
              <div className="invitation-actions">
                <button className="text-button" type="button" onClick={() => onEditAsset(asset)}>Edit</button>
                <button className="text-button text-button-danger" type="button" onClick={() => onDeleteAsset(asset)}>Delete</button>
              </div>
            </DetailRow>
          ))}
        </DetailList>
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
            <Icon name="plus" size={13} /> Record leave
          </button>
        </div>
      </div>

      {!targetUserId ? (
        <EmptyState
          icon="calendar"
          title="Select a team member"
          message="Choose a team member above to view planned capacity and unavailability windows."
        />
      ) : availabilityQuery.isLoading ? (
        <div className="loading-state"><span className="spinner" /> Loading availability schedule…</div>
      ) : availabilityQuery.error ? (
        <EmptyState icon="alert" title="Failed to load availability" message={availabilityQuery.error.message} />
      ) : records.length === 0 ? (
        <EmptyState
          icon="calendar"
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
  if (error) return <EmptyState icon="alert" title="Failed to load capacity profiles" message={error.message} />;

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
            <Icon name="plus" size={13} /> New profile
          </button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon="users"
          title="No capacity profiles"
          message="Define baseline weekly hours for team members. Default capacity is 40 hours per week if no profile is set."
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState icon="users" title="No matching profiles" message="Adjust your search to see capacity profiles." />
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
