import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type {
  Asset,
  AssetAllocation,
  Availability,
  MemberAllocation,
  WorkloadItem,
} from '../types/api.js';
import AllocationModal from './AllocationModal.js';
import AssetModal from './AssetModal.js';
import AvailabilityModal from './AvailabilityModal.js';
import ConfirmDialog from './ConfirmDialog.js';
import EmptyState from './EmptyState.js';
import { SearchField, SelectField } from './FilterBar.js';
import Icon from './Icon.js';
import PageHeader from './PageHeader.js';

interface ResourcesPageProps {
  onMenu: () => void;
}

export default function ResourcesPage({ onMenu }: ResourcesPageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'Workload' | 'Allocations' | 'Assets' | 'Availability'>('Workload');

  // Modals state
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
  const [deleteAvailabilityTarget, setDeleteAvailabilityTarget] = useState<{ userId: string; id: string } | null>(null);

  // Queries
  const workloadQuery = useQuery({
    queryKey: queryKeys.workload,
    queryFn: ({ signal }) => api.getWorkload(signal),
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

  const workload = workloadQuery.data || [];
  const assets = assetsQuery.data || [];
  const memberAllocations = memberAllocationsQuery.data || [];
  const assetAllocations = assetAllocationsQuery.data || [];
  const users = usersQuery.data || [];

  // Mutations
  const invalidateResources = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workload });
    queryClient.invalidateQueries({ queryKey: queryKeys.memberAllocations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.assetAllocations() });
    queryClient.invalidateQueries({ queryKey: queryKeys.assets });
  };

  const deleteMemberAllocationMutation = useMutation({
    mutationFn: (id: string) => api.deleteMemberAllocation(id),
    onSuccess: () => {
      invalidateResources();
      setDeleteMemberAllocTarget(null);
    },
  });

  const deleteAssetAllocationMutation = useMutation({
    mutationFn: (id: string) => api.deleteAssetAllocation(id),
    onSuccess: () => {
      invalidateResources();
      setDeleteAssetAllocTarget(null);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: () => {
      invalidateResources();
      setDeleteAssetTarget(null);
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) => api.deleteAvailability(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setDeleteAvailabilityTarget(null);
    },
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
              onClick={() => {
                setEditAssetTarget(null);
                setIsAssetOpen(true);
              }}
            >
              <Icon name="plus" />
              New asset
            </button>
          ) : activeTab === 'Availability' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setIsAvailabilityOpen(true)}
            >
              <Icon name="plus" />
              Record leave / unavailability
            </button>
          ) : null
        }
      />

      <nav className="project-tabs" aria-label="Resource sections">
        {(['Workload', 'Allocations', 'Assets', 'Availability'] as const).map((tab) => (
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
          <WorkloadTab isLoading={workloadQuery.isLoading} error={workloadQuery.error} data={workload} />
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
            onEditMemberAlloc={(alloc) => {
              setEditMemberAlloc(alloc);
              setEditAssetAlloc(null);
              setIsAllocationOpen(true);
            }}
            onEditAssetAlloc={(alloc) => {
              setEditAssetAlloc(alloc);
              setEditMemberAlloc(null);
              setIsAllocationOpen(true);
            }}
            onDeleteMemberAlloc={(alloc) => setDeleteMemberAllocTarget(alloc)}
            onDeleteAssetAlloc={(alloc) => setDeleteAssetAllocTarget(alloc)}
          />
        )}

        {activeTab === 'Assets' && (
          <AssetsTab
            isLoading={assetsQuery.isLoading}
            error={assetsQuery.error}
            data={assets}
            onNewAsset={() => {
              setEditAssetTarget(null);
              setIsAssetOpen(true);
            }}
            onEditAsset={(asset) => {
              setEditAssetTarget(asset);
              setIsAssetOpen(true);
            }}
            onDeleteAsset={(asset) => setDeleteAssetTarget(asset)}
          />
        )}

        {activeTab === 'Availability' && (
          <AvailabilityTab
            users={users}
            onNewUnavailability={() => setIsAvailabilityOpen(true)}
            onDeleteAvailability={(userId, id) => setDeleteAvailabilityTarget({ userId, id })}
          />
        )}
      </section>

      {/* Dialog Modals */}
      {isAllocationOpen && (
        <AllocationModal
          initialType={allocationInitialType}
          editMemberTarget={editMemberAlloc}
          editAssetTarget={editAssetAlloc}
          onClose={() => {
            setIsAllocationOpen(false);
            setEditMemberAlloc(null);
            setEditAssetAlloc(null);
          }}
          onSuccess={invalidateResources}
        />
      )}

      {isAssetOpen && (
        <AssetModal
          editTarget={editAssetTarget}
          onClose={() => {
            setIsAssetOpen(false);
            setEditAssetTarget(null);
          }}
          onSuccess={invalidateResources}
        />
      )}

      {isAvailabilityOpen && (
        <AvailabilityModal
          onClose={() => setIsAvailabilityOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['availability'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialogs */}
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
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Workload Tab Component                                                     */
/* -------------------------------------------------------------------------- */
interface WorkloadTabProps {
  isLoading: boolean;
  error: Error | null;
  data: WorkloadItem[];
}

function WorkloadTab({ isLoading, error, data }: WorkloadTabProps) {
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
    return data.filter(
      (item) => (item.allocated_hours ?? 0) > (item.capacity_hours ?? 40)
    ).length;
  }, [data]);

  if (isLoading)
    return (
      <div className="loading-state">
        <span className="spinner" />
        Loading workload…
      </div>
    );
  if (error)
    return <EmptyState icon="alert" title="Failed to load workload" message={error.message} />;
  if (data.length === 0)
    return (
      <EmptyState
        icon="users"
        title="No workload data"
        message="Workload information will appear once team members are assigned to projects."
      />
    );

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
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter members…"
          />
          <SelectField
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            label="Filter status"
            options={[
              { value: 'all', label: 'All members' },
              { value: 'overallocated', label: 'Over-allocated only' },
            ]}
          />
        </div>
      </div>

      {filteredData.length === 0 ? (
        <EmptyState
          icon="users"
          title="No matching members"
          message="Adjust search or filters to see workload balance."
        />
      ) : (
        <div className="member-grid">
          {filteredData.map((item) => {
            const allocated = item.allocated_hours ?? 0;
            const capacity = item.capacity_hours ?? 40;
            const isOver = allocated > capacity;
            const diff = allocated - capacity;

            return (
              <article
                className={`member-card ${isOver ? 'is-overallocated' : ''}`}
                key={item.user_id || item.id}
              >
                <span className="avatar avatar-large">
                  {(item.user_name || item.name || '—').slice(0, 2).toUpperCase()}
                </span>
                <div className="member-copy">
                  <strong>{item.user_name || item.name || 'Unknown'}</strong>
                  <span>{item.email || ''}</span>
                </div>
                <div className="workload-info">
                  {isOver ? (
                    <span className="status-badge status-overallocated" title={`Exceeds capacity by ${diff} hours`}>
                      <span className="status-dot" />
                      {allocated}h / {capacity}h (+{diff}h)
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
/* Allocations Tab Component                                                  */
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

  if (isLoading)
    return (
      <div className="loading-state">
        <span className="spinner" />
        Loading allocations…
      </div>
    );
  if (memberError || assetError)
    return (
      <EmptyState
        icon="alert"
        title="Failed to load allocations"
        message={memberError?.message || assetError?.message || 'Unknown error'}
      />
    );

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
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search allocations…"
          />
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => onNewAllocation('member')}
          >
            <Icon name="plus" size={13} />
            Member allocation
          </button>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => onNewAllocation('asset')}
          >
            <Icon name="plus" size={13} />
            Asset allocation
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon="projects"
          title="No allocations found"
          message="Project allocations will appear here once team members or shared assets are assigned."
        />
      ) : (
        <>
          {filteredMembers.length > 0 && (
            <div className="allocation-section">
              <div className="section-header compact">
                <h3>Member allocations</h3>
                <span className="count-pill">{filteredMembers.length}</span>
              </div>
              <div className="detail-list">
                {filteredMembers.map((alloc) => {
                  const pct = alloc.allocation_percentage ?? alloc.percentage ?? 0;
                  return (
                    <div className="detail-list-row" key={alloc.id}>
                      <span className="avatar">
                        {(alloc.user_name || '—').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="detail-list-copy">
                        <strong>{alloc.user_name || `User ${alloc.user_id}`}</strong>
                        <small>
                          {alloc.project_name || `Project ${alloc.project_id}`} · {pct}% allocation
                        </small>
                      </span>
                      <div className="invitation-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onEditMemberAlloc(alloc)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-button text-button-danger"
                          type="button"
                          onClick={() => onDeleteMemberAlloc(alloc)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredAssets.length > 0 && (
            <div className="allocation-section" style={{ marginTop: 24 }}>
              <div className="section-header compact">
                <h3>Asset allocations</h3>
                <span className="count-pill">{filteredAssets.length}</span>
              </div>
              <div className="detail-list">
                {filteredAssets.map((alloc) => {
                  const pct = alloc.allocation_percentage ?? alloc.percentage ?? 0;
                  return (
                    <div className="detail-list-row" key={alloc.id}>
                      <span className="avatar">
                        {(alloc.asset_name || '—').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="detail-list-copy">
                        <strong>{alloc.asset_name || `Asset ${alloc.asset_id}`}</strong>
                        <small>
                          {alloc.project_name || `Project ${alloc.project_id}`} · {pct}% usage
                        </small>
                      </span>
                      <div className="invitation-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onEditAssetAlloc(alloc)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-button text-button-danger"
                          type="button"
                          onClick={() => onDeleteAssetAlloc(alloc)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Assets Tab Component                                                      */
/* -------------------------------------------------------------------------- */
interface AssetsTabProps {
  isLoading: boolean;
  error: Error | null;
  data: Asset[];
  onNewAsset: () => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

function AssetsTab({
  isLoading,
  error,
  data,
  onNewAsset,
  onEditAsset,
  onDeleteAsset,
}: AssetsTabProps) {
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

  if (isLoading)
    return (
      <div className="loading-state">
        <span className="spinner" />
        Loading assets…
      </div>
    );
  if (error)
    return <EmptyState icon="alert" title="Failed to load assets" message={error.message} />;

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
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
          />
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by status"
            options={[
              { value: 'available', label: 'Available' },
              { value: 'allocated', label: 'Allocated' },
              { value: 'maintenance', label: 'In maintenance' },
              { value: 'retired', label: 'Retired' },
            ]}
            placeholder="All statuses"
          />
          <button className="button button-secondary button-small" type="button" onClick={onNewAsset}>
            <Icon name="plus" size={13} />
            New asset
          </button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon="projects"
          title="No shared assets"
          message="Shared assets and resources registered for your organization will appear here."
        />
      ) : (
        <div className="detail-list">
          {filteredAssets.map((asset) => (
            <div className="detail-list-row" key={asset.id}>
              <span className="avatar">{(asset.name || '—').slice(0, 2).toUpperCase()}</span>
              <span className="detail-list-copy">
                <strong>{asset.name}</strong>
                <small>
                  {asset.type || asset.asset_type || 'Resource'} · Status: {asset.status || 'available'}
                </small>
              </span>
              <div className="invitation-actions">
                <button className="text-button" type="button" onClick={() => onEditAsset(asset)}>
                  Edit
                </button>
                <button
                  className="text-button text-button-danger"
                  type="button"
                  onClick={() => onDeleteAsset(asset)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Availability Tab Component                                                 */
/* -------------------------------------------------------------------------- */
interface AvailabilityTabProps {
  users: { id: string; name: string; email: string }[];
  onNewUnavailability: () => void;
  onDeleteAvailability: (userId: string, id: string) => void;
}

function AvailabilityTab({
  users,
  onNewUnavailability,
  onDeleteAvailability,
}: AvailabilityTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const targetUserId = selectedUserId || users[0]?.id;

  const availabilityQuery = useQuery({
    queryKey: ['availability', targetUserId],
    queryFn: ({ signal }) =>
      targetUserId ? api.listAvailability(targetUserId, signal) : Promise.resolve([]),
    enabled: Boolean(targetUserId),
  });

  const records = availabilityQuery.data || [];

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
          <button className="button button-secondary button-small" type="button" onClick={onNewUnavailability}>
            <Icon name="plus" size={13} />
            Record leave
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
        <div className="loading-state">
          <span className="spinner" />
          Loading availability schedule…
        </div>
      ) : availabilityQuery.error ? (
        <EmptyState
          icon="alert"
          title="Failed to load availability"
          message={availabilityQuery.error.message}
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No unavailability recorded"
          message="No vacations, leave, or planned capacity restrictions are scheduled for this team member."
        />
      ) : (
        <div className="detail-list">
          {records.map((rec: Availability) => (
            <div className="detail-list-row" key={rec.id}>
              <span className="avatar avatar-accent">
                {rec.status === 'unavailable' ? 'LV' : 'LM'}
              </span>
              <span className="detail-list-copy">
                <strong>
                  {rec.status === 'unavailable' ? 'Planned Leave / Vacation' : 'Limited Capacity'}
                </strong>
                <small>
                  {rec.start_date} — {rec.end_date} {rec.notes ? `· ${rec.notes}` : ''}
                </small>
              </span>
              <div className="invitation-actions">
                <button
                  className="text-button text-button-danger"
                  type="button"
                  onClick={() => onDeleteAvailability(rec.user_id || targetUserId, rec.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
