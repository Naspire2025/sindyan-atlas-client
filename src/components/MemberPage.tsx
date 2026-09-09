import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { api } from "../api/client.js";
import type { MemberSummary } from "../types/api.js";
import { formatDate } from "../utils/project.js";
import { DetailList, DetailRow } from "./DetailList.js";
import EmptyState from "./EmptyState.js";

import PageHeader from "./PageHeader.js";
import {
  Calendar,
  ChevronRight,
  CircleCheck,
  Layers,
  Menu,
  TriangleAlert,
} from "lucide-react";

interface MemberPageProps {
  memberId: string;
  onBack: () => void;
  onMenu: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
}

const SCROLLABLE_DETAIL_LIST_STYLES =
  "max-h-[20rem] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-acid-lime/70";

function roleLabel(role: string, intl: ReturnType<typeof useIntl>): string {
  if (role === "project_lead") return intl.formatMessage({ id: 'member.projectLead' });
  return intl.formatMessage({ id: 'member.member' });
}

export default function MemberPage({
  memberId,
  onBack,
  onMenu,
  onSelectProject,
  onSelectTask,
}: MemberPageProps) {
  const intl = useIntl();
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const loaded = await api.getMemberSummary(memberId);
      setSummary(loaded);
      setError("");
    } catch (loadError) {
      setSummary(null);
      setError((loadError as Error).message);
    }
  }, [memberId]);

  useEffect(() => {
    // Loading the URL-selected member is the synchronization purpose of this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  if (error && !summary) {
    return (
      <div className="page">
        <PageHeader
          eyebrow={intl.formatMessage({ id: "team.memberRole" })}
          title={intl.formatMessage({ id: 'member.unavailable' })}
          description={error}
          onMenu={onMenu}
        />
        <EmptyState
          icon={TriangleAlert}
          title={intl.formatMessage({ id: 'member.failedToLoad' })}
          message={error}
          action={
            <button className="button ghost" type="button" onClick={load}>
              {intl.formatMessage({ id: "common.retry" })}
            </button>
          }
        />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page">
        <PageHeader eyebrow={intl.formatMessage({ id: "team.memberRole" })} title={intl.formatMessage({ id: "common.loading" })} onMenu={onMenu} />
        <div className="loading-state">{intl.formatMessage({ id: "common.loading" })}</div>
      </div>
    );
  }

  const openProjects = summary.projects.filter(
    (p) => p.status !== "done",
  ).length;

  return (
    <div className="page">
      <header className="project-breadcrumb-bar">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label={intl.formatMessage({ id: "common.openNavigation" })}
          onClick={onMenu}
        >
          <Menu size={18} />
        </button>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <button type="button" onClick={onBack}>
            {intl.formatMessage({ id: "team.title" })}
          </button>
          <ChevronRight size={13} />
          <span>{summary.name}</span>
        </nav>
        <span
          className={`status-badge status-${summary.status === "active" ? "active" : "cancelled"}`}
        >
          <span className="status-dot" />
          {summary.status}
        </span>
      </header>
      <PageHeader
        eyebrow={intl.formatMessage({ id: "team.memberRole" })}
        title={summary.name}
        description={`${summary.email} · ${summary.role === "admin" ? intl.formatMessage({ id: "team.admin" }) : intl.formatMessage({ id: "team.teamMember" })}`}
        onMenu={onMenu}
      />

      <div className="project-section-block">
        <div className="project-section-card">
          <div className="section-header">
            <div>
              <div className="eyebrow">{intl.formatMessage({ id: "team.memberRole" })}</div>
              <h2>{summary.name}</h2>
              <p>{summary.email}</p>
            </div>
          </div>
          <div className="project-stat-grid">
            <div className="project-stat">
              <strong>{summary.projects.length}</strong>
              <span>{intl.formatMessage({ id: "member.projects" })}</span>
            </div>
            <div className="project-stat">
              <strong>{openProjects}</strong>
              <span>{intl.formatMessage({ id: 'member.activeProjects' })}</span>
            </div>
            <div className="project-stat">
              <strong>{summary.assignments.tasks.length}</strong>
              <span>{intl.formatMessage({ id: "member.tasks" })}</span>
            </div>
            <div className="project-stat">
              <strong>{summary.assignments.vault_entries.length}</strong>
              <span>{intl.formatMessage({ id: "member.vaultEntries" })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 px-12 pb-32 pt-32 max-[960px]:grid-cols-1">
        <div className="project-section-card min-w-0">
          <div className="section-header">
            <div>
              <h2>{intl.formatMessage({ id: 'member.projectsAndRoles' })}</h2>
              <p>{intl.formatMessage({ id: 'member.membershipsDescription' })}</p>
            </div>
          </div>
          {summary.projects.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={intl.formatMessage({ id: "member.noProjects" })}
              message={intl.formatMessage({ id: 'member.noProjectsMessage' })}
            />
          ) : (
            <DetailList
              aria-label="Projects and roles"
              className={SCROLLABLE_DETAIL_LIST_STYLES}
              role="region"
              tabIndex={0}
            >
              {summary.projects.map((project) => (
                <DetailRow key={project.project_id}>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectProject(project.project_id)}
                  >
                    {project.project_name}
                  </button>
                  <div className="detail-list-copy">
                    <small>{roleLabel(project.project_role, intl)}</small>
                  </div>
                  <span className="role-pill">{project.status}</span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>

        <div className="project-section-card min-w-0">
          <div className="section-header">
            <div>
              <h2>{intl.formatMessage({ id: "member.tasks" })}</h2>
              <p>{intl.formatMessage({ id: 'member.tasksDescription' })}</p>
            </div>
          </div>
          {summary.assignments.tasks.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title={intl.formatMessage({ id: "member.noTasks" })}
              message={intl.formatMessage({ id: "member.noTasks" })}
            />
          ) : (
            <DetailList
              aria-label="Assigned tasks"
              className={SCROLLABLE_DETAIL_LIST_STYLES}
              role="region"
              tabIndex={0}
            >
              {summary.assignments.tasks.map((task) => (
                <DetailRow key={`task-${task.id}`}>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                  >
                    {task.title}
                  </button>
                  <div className="detail-list-copy">
                    <small>
                      {task.project_name} · {task.status.replaceAll("_", " ")}
                      {task.due_date
                        ? ` · due ${formatDate(task.due_date)}`
                        : ""}
                    </small>
                  </div>
                  <span className="role-pill">{task.priority}</span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>

        <div className="project-section-card min-w-0">
          <div className="section-header">
            <div>
              <h2>{intl.formatMessage({ id: "member.risks" })}</h2>
              <p>{intl.formatMessage({ id: 'member.risksDescription' })}</p>
            </div>
          </div>
          {summary.assignments.risks.length === 0 ? (
            <EmptyState
              icon={TriangleAlert}
              title={intl.formatMessage({ id: "member.noRisks" })}
              message={intl.formatMessage({ id: "member.noRisks" })}
            />
          ) : (
            <DetailList
              aria-label="Owned risks"
              className={SCROLLABLE_DETAIL_LIST_STYLES}
              role="region"
              tabIndex={0}
            >
              {summary.assignments.risks.map((risk) => (
                <DetailRow key={`risk-${risk.id}`}>
                  <span className="detail-list-copy">
                    <strong>{risk.title}</strong>
                    <small>
                      {risk.project_name} · {risk.severity} ·{" "}
                      {risk.status.replaceAll("_", " ")}
                      {risk.due_date
                        ? ` · due ${formatDate(risk.due_date)}`
                        : ""}
                    </small>
                  </span>
                  <span className="role-pill">{risk.severity}</span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>

        <div className="project-section-card min-w-0">
          <div className="section-header">
            <div>
              <h2>{intl.formatMessage({ id: "member.issues" })}</h2>
              <p>{intl.formatMessage({ id: 'member.issuesDescription' })}</p>
            </div>
          </div>
          {summary.assignments.issues.length === 0 ? (
            <EmptyState
              icon={TriangleAlert}
              title={intl.formatMessage({ id: "member.noIssues" })}
              message={intl.formatMessage({ id: "member.noIssues" })}
            />
          ) : (
            <DetailList
              aria-label="Owned issues"
              className={SCROLLABLE_DETAIL_LIST_STYLES}
              role="region"
              tabIndex={0}
            >
              {summary.assignments.issues.map((issue) => (
                <DetailRow key={`issue-${issue.id}`}>
                  <span className="detail-list-copy">
                    <strong>{issue.title}</strong>
                    <small>
                      {issue.project_name} · {issue.status.replaceAll("_", " ")}
                      {issue.target_resolution_date
                        ? ` · target ${formatDate(issue.target_resolution_date)}`
                        : ""}
                    </small>
                  </span>
                  <span className="role-pill">{issue.priority}</span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>

        <div className="project-section-card col-span-2 min-w-0 max-[960px]:col-span-1">
          <div className="section-header">
            <div>
              <h2>{intl.formatMessage({ id: "member.allocations" })}</h2>
              <p>{intl.formatMessage({ id: 'member.allocationsDescription' })}</p>
            </div>
          </div>
          {summary.assignments.allocations.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={intl.formatMessage({ id: "member.noAllocations" })}
              message={intl.formatMessage({ id: "member.noAllocations" })}
            />
          ) : (
            <DetailList
              aria-label="Allocations"
              className={SCROLLABLE_DETAIL_LIST_STYLES}
              role="region"
              tabIndex={0}
            >
              {summary.assignments.allocations.map((allocation, index) => (
                <DetailRow key={`allocation-${index}`}>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onSelectProject(allocation.project_id)}
                  >
                    {allocation.project_name}
                  </button>
                  <div className="detail-list-copy">
                    <small>
                      {formatDate(allocation.starts_on)} →{" "}
                      {formatDate(allocation.ends_on)}
                    </small>
                  </div>
                  <span className="role-pill">
                    {allocation.allocation_percent}%
                  </span>
                </DetailRow>
              ))}
            </DetailList>
          )}
        </div>
      </div>
    </div>
  );
}
