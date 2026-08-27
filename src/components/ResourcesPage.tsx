import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';
import type { WorkloadItem, MemberAllocation, AssetAllocation, Asset } from '../types/api.js';
import EmptyState from './EmptyState.js';
import PageHeader from './PageHeader.js';

interface ResourcesPageProps {
  onMenu: () => void;
}

export default function ResourcesPage({ onMenu }: ResourcesPageProps) {
  const [activeTab, setActiveTab] = useState('Workload');

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

  const workload = workloadQuery.data || [];
  const assets = assetsQuery.data || [];
  const memberAllocations = memberAllocationsQuery.data || [];
  const assetAllocations = assetAllocationsQuery.data || [];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Resources"
        description="Manage team capacity, availability, and shared assets."
        onMenu={onMenu}
      />

      <nav className="project-tabs" aria-label="Resource sections">
        {['Workload', 'Allocations', 'Assets'].map((tab) => (
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
          />
        )}
        {activeTab === 'Assets' && (
          <AssetsTab isLoading={assetsQuery.isLoading} error={assetsQuery.error} data={assets} />
        )}
      </section>
    </>
  );
}

interface WorkloadTabProps {
  isLoading: boolean;
  error: Error | null;
  data: WorkloadItem[];
}

function WorkloadTab({ isLoading, error, data }: WorkloadTabProps) {
  if (isLoading) return <div className="loading-state"><span className="spinner" />Loading workload…</div>;
  if (error) return <EmptyState icon="alert" title="Failed to load workload" message={error.message} />;
  if (data.length === 0) return <EmptyState icon="users" title="No workload data" message="Workload information will appear once team members are allocated to projects." />;

  return (
    <div className="member-grid">
      {data.map((item) => (
        <article className="member-card" key={item.user_id || item.id}>
          <span className="avatar avatar-large">{(item.user_name || item.name || '—').slice(0, 2).toUpperCase()}</span>
          <div className="member-copy">
            <strong>{item.user_name || item.name || 'Unknown'}</strong>
            <span>{item.email || ''}</span>
          </div>
          <div className="workload-info">
            <span className="status-badge status-active">
              <span className="status-dot" />
              {item.allocated_hours ?? 0}h allocated
            </span>
            {item.capacity_hours != null && (
              <span className="status-badge">
                {item.capacity_hours}h capacity
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

interface AllocationsTabProps {
  isLoading: boolean;
  memberError: Error | null;
  assetError: Error | null;
  memberAllocations: MemberAllocation[];
  assetAllocations: AssetAllocation[];
}

function AllocationsTab({ isLoading, memberError, assetError, memberAllocations, assetAllocations }: AllocationsTabProps) {
  if (isLoading) return <div className="loading-state"><span className="spinner" />Loading allocations…</div>;
  if (memberError || assetError) return <EmptyState icon="alert" title="Failed to load allocations" message={memberError?.message || assetError?.message || 'Unknown error'} />;

  const hasData = memberAllocations.length > 0 || assetAllocations.length > 0;
  if (!hasData) return <EmptyState icon="projects" title="No allocations" message="Project allocations will appear here once team members are assigned." />;

  return (
    <>
      {memberAllocations.length > 0 && (
        <div className="allocation-section">
          <div className="section-header compact"><h3>Member allocations</h3><span className="count-pill">{memberAllocations.length}</span></div>
          <div className="detail-list">
            {memberAllocations.map((alloc) => (
              <div className="detail-list-row" key={alloc.id}>
                <span className="avatar">{(alloc.user_name || '—').slice(0, 2).toUpperCase()}</span>
                <span className="detail-list-copy">
                  <strong>{alloc.user_name || `User ${alloc.user_id}`}</strong>
                  <small>{alloc.project_name || `Project ${alloc.project_id}`} · {alloc.allocation_percentage ?? alloc.percentage ?? 0}%</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {assetAllocations.length > 0 && (
        <div className="allocation-section">
          <div className="section-header compact"><h3>Asset allocations</h3><span className="count-pill">{assetAllocations.length}</span></div>
          <div className="detail-list">
            {assetAllocations.map((alloc) => (
              <div className="detail-list-row" key={alloc.id}>
                <span className="avatar">{(alloc.asset_name || '—').slice(0, 2).toUpperCase()}</span>
                <span className="detail-list-copy">
                  <strong>{alloc.asset_name || `Asset ${alloc.asset_id}`}</strong>
                  <small>{alloc.project_name || `Project ${alloc.project_id}`} · {alloc.allocation_percentage ?? alloc.percentage ?? 0}%</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface AssetsTabProps {
  isLoading: boolean;
  error: Error | null;
  data: Asset[];
}

function AssetsTab({ isLoading, error, data }: AssetsTabProps) {
  if (isLoading) return <div className="loading-state"><span className="spinner" />Loading assets…</div>;
  if (error) return <EmptyState icon="alert" title="Failed to load assets" message={error.message} />;
  if (data.length === 0) return <EmptyState icon="projects" title="No shared assets" message="Shared assets and resources will appear here." />;

  return (
    <div className="detail-list">
      {data.map((asset) => (
        <div className="detail-list-row" key={asset.id}>
          <span className="avatar">{(asset.name || '—').slice(0, 2).toUpperCase()}</span>
          <span className="detail-list-copy">
            <strong>{asset.name}</strong>
            <small>{asset.type || asset.asset_type || 'Resource'} · {asset.status || 'available'}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
