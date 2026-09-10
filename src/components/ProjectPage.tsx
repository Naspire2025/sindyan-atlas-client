import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client.js";
import { queryKeys } from "../api/queryKeys.js";
import {
  ISSUE_STATUSES,
  PRIORITIES,
  RISK_SEVERITIES,
  RISK_STATUSES,
  TASK_STATUSES,
  getLabel,
} from "../constants.js";
import {
  canManageProject,
  canManageFinance,
  canManageRisk,
  canManageIssue,
} from "../auth/permissions.js";
import type {
  User,
  Project,
  Task,
  Milestone,
  Risk,
  Issue,
  BudgetLine,
  SpendRecord,
  ProjectLink,
  Priority,
  MilestoneStatus,
  ProjectRole,
  CreateTaskPayload,
  CreateMilestonePayload,
  VaultEntry,
  VaultFile,
} from "../types/api.js";
import {
  formatDate,
  getInitials,
  getProgress,
  getProjectHealth,
} from "../utils/project.js";
import ConfirmDialog from "./ConfirmDialog.js";
import { DetailList, DetailRow } from "./DetailList.js";
import DialogShell from "./DialogShell.js";
import EmptyState from "./EmptyState.js";
import { SearchField, SelectField } from "./FilterBar.js";


import IssueDialog from "./IssueDialog.js";
import PhaseModal from "./PhaseModal.js";
import RiskDialog from "./RiskDialog.js";
import StatusBadge from "./StatusBadge.js";
import TaskKanbanBoard from "./TaskKanbanBoard.js";
import { Calendar, ChevronDown, CircleCheck, Download, ExternalLink, Layers, LayoutGrid, Lock, Menu, Plus, Trash2, TriangleAlert, Users, X } from 'lucide-react';

interface ProjectPageProps {
  currentUser: User;
  onBack: () => void;
  onChanged: () => void;
  onMenu: () => void;
  onSelectMember: (userId: string) => void;
  onSelectMilestone: (milestoneId: string) => void;
  onSelectTask: (taskId: string) => void;
  projectId: string;
}

const PROJECT_TABS_ADMIN = [
  "Overview",
  "Tasks",
  "Milestones",
  "Timeline",
  "Links",
  "Finance",
  "Risks & Issues",
  "Team",
];
const PROJECT_TABS_MEMBER = [
  "Overview",
  "Tasks",
  "Milestones",
  "Timeline",
  "Links",
  "Risks & Issues",
  "Team",
];

function tabMessageId(tab: string): string {
  switch (tab) {
    case "Overview":
      return "project.overview";
    case "Tasks":
      return "project.tasks";
    case "Milestones":
      return "project.milestones";
    case "Links":
      return "project.links";
    case "Finance":
      return "project.financials";
    case "Risks & Issues":
      return "nav.risksIssues";
    case "Team":
      return "project.team";
    default:
      return tab;
  }
}

export default function ProjectPage({
  currentUser,
  onBack,
  onChanged,
  onMenu,
  onSelectMember,
  onSelectMilestone,
  onSelectTask,
  projectId,
}: ProjectPageProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Overview");
  const [createType, setCreateType] = useState("");

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: ({ signal }) => api.getProject(projectId, signal),
  });

  const project = projectQuery.data;
  const error = projectQuery.error;

  const handleCreated = async () => {
    setCreateType("");
    await queryClient.invalidateQueries({
      queryKey: queryKeys.project(projectId),
    });
    await onChanged();
  };

  if (error)
    return <ProjectError error={error} onBack={onBack} onMenu={onMenu} />;
  if (projectQuery.isLoading)
    return (
      <div className="loading-state project-loading">
        <span className="spinner" />
        {intl.formatMessage({ id: "common.loading" })}
      </div>
    );
  if (!project) return null;

  const isPrivileged = canManageProject(currentUser, project);
  const showFinance = canManageFinance(currentUser);
  const projectTabs = showFinance ? PROJECT_TABS_ADMIN : PROJECT_TABS_MEMBER;

  return (
    <div className="project-page">
      <ProjectBreadcrumb project={project} onBack={onBack} onMenu={onMenu} />
      <nav
        className="project-tabs"
        aria-label={intl.formatMessage({ id: "project.sectionsAria" })}
      >
        {projectTabs.map((tab) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            key={tab}
            type="button"
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => {
              setActiveTab(tab);
              setCreateType("");
            }}
          >
            {intl.formatMessage({ id: tabMessageId(tab) })}
            <TabCount project={project} tab={tab} />
          </button>
        ))}
      </nav>

      <div className="project-page-content">
        {activeTab === "Overview" && (
          <OverviewSection
            project={project}
            onSelectMilestone={onSelectMilestone}
          />
        )}
        {activeTab === "Tasks" && (
          <TasksSection
            canManageProject={isPrivileged}
            currentUser={currentUser}
            project={project}
            projectId={projectId}
            onSelectMember={onSelectMember}
            onSelectTask={onSelectTask}
          />
        )}
        {activeTab === "Milestones" && (
          <MilestonesSection
            projectId={projectId}
            project={project}
            canManageProject={isPrivileged}
            onSelectMilestone={onSelectMilestone}
          />
        )}
        {activeTab === "Timeline" && (
          <TimelineSection
            canManageProject={isPrivileged}
            onSelectMilestone={onSelectMilestone}
            onSelectTask={onSelectTask}
            project={project}
          />
        )}
        {activeTab === "Links" && (
          <LinksSection
            projectId={projectId}
            project={project}
            currentUser={currentUser}
            canManageProject={isPrivileged}
          />
        )}
        {activeTab === "Finance" && showFinance && (
          <FinanceSection projectId={projectId} />
        )}
        {activeTab === "Risks & Issues" && (
          <RisksIssuesSection
            projectId={projectId}
            project={project}
            canManageProject={isPrivileged}
            currentUser={currentUser}
          />
        )}
        {activeTab === "Team" && (
          <TeamSection
            project={project}
            canManageProject={isPrivileged}
            onAdd={() => setCreateType("member")}
            onSelectMember={onSelectMember}
          />
        )}
        {createType && (
          <CreateProjectItemForm
            type={createType}
            project={project}
            onCancel={() => setCreateType("")}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}

interface TimelineSectionProps {
  canManageProject: boolean;
  onSelectMilestone: (milestoneId: string) => void;
  onSelectTask: (taskId: string) => void;
  project: Project;
}

interface TimelineItem {
  end?: string;
  id: string;
  milestoneId?: string;
  owner?: string;
  ownerId?: string;
  phaseId?: string;
  progress: number;
  rawId: string;
  start?: string;
  status: string;
  title: string;
  type: "Phase" | "Milestone" | "Task";
}

function TimelineSection({
  canManageProject,
  onSelectMilestone,
  onSelectTask,
  project,
}: TimelineSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isPhaseOpen, setIsPhaseOpen] = useState(false);
  const [editPhaseTarget, setEditPhaseTarget] = useState<
    import("../types/api.js").Phase | null
  >(null);
  const [filterType, setFilterType] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterMilestone, setFilterMilestone] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<string | null>(
    null,
  );

  const deletePhaseMutation = useMutation({
    mutationFn: (phaseId: string) => api.deletePhase(project.id, phaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.project(project.id),
      });
      setDeletePhaseTarget(null);
    },
  });

  const items = useMemo<TimelineItem[]>(() => {
    const milestones = project.milestones || [];
    const tasks = project.tasks || [];
    const phaseItems: TimelineItem[] = (project.phases || []).map((phase) => {
      const phaseMilestoneIds = new Set(
        milestones
          .filter((milestone) => milestone.phase_id === phase.id)
          .map((milestone) => milestone.id),
      );
      const phaseTasks = tasks.filter(
        (task) => task.milestone_id && phaseMilestoneIds.has(task.milestone_id),
      );
      const progress = getTaskCompletion(phaseTasks);
      return {
        id: `phase-${phase.id}`,
        rawId: phase.id,
        type: "Phase",
        title: phase.name,
        start: phase.start_date,
        end: phase.end_date,
        status:
          progress === 100
            ? "done"
            : progress > 0
              ? "in_progress"
              : "not_started",
        progress,
        phaseId: phase.id,
      };
    });
    const milestoneItems: TimelineItem[] = milestones.map((milestone) => {
      const milestoneTasks = tasks.filter(
        (task) => task.milestone_id === milestone.id,
      );
      return {
        id: `milestone-${milestone.id}`,
        rawId: milestone.id,
        type: "Milestone",
        title: milestone.title,
        start: milestone.target_date,
        end: milestone.target_date,
        status: milestone.status,
        progress: getTaskCompletion(milestoneTasks),
        phaseId: milestone.phase_id,
        milestoneId: milestone.id,
      };
    });
    const taskItems: TimelineItem[] = tasks.map((task) => {
      const milestone = milestones.find(
        (item) => item.id === task.milestone_id,
      );
      return {
        id: `task-${task.id}`,
        rawId: task.id,
        type: "Task",
        title: task.title,
        start: task.due_date,
        end: task.due_date,
        status: task.status,
        progress: task.status === "done" ? 100 : 0,
        phaseId: milestone?.phase_id,
        milestoneId: task.milestone_id || undefined,
        owner: task.assignee_name,
        ownerId: task.assignee_user_id || undefined,
      };
    });
    return [...phaseItems, ...milestoneItems, ...taskItems].sort(
      (first, second) =>
        String(first.start || first.end || "").localeCompare(
          String(second.start || second.end || ""),
        ),
    );
  }, [project]);

  const rows = useMemo(() => {
    return items.filter((item) => {
      if (filterType && item.type.toLowerCase() !== filterType) return false;
      if (filterPhase && item.phaseId !== filterPhase) return false;
      if (filterOwner && item.ownerId !== filterOwner) return false;
      if (filterMilestone && item.milestoneId !== filterMilestone) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (
        search &&
        !`${item.title} ${item.type} ${item.owner || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    items,
    filterType,
    filterPhase,
    filterOwner,
    filterMilestone,
    filterStatus,
    search,
  ]);

  const datedItems = items.filter((item) => item.start || item.end);
  const timelineStart = earliestDate([
    project.start_date,
    ...datedItems.map((item) => item.start || item.end),
  ]);
  const timelineEnd = latestDate([
    project.deadline,
    ...datedItems.map((item) => item.end || item.start),
  ]);

  return (
    <ProjectSection
      title={intl.formatMessage({ id: "project.timelineTitle" })}
      description={intl.formatMessage({ id: "project.timelineDescription" })}
      actionLabel={canManageProject ? intl.formatMessage({ id: "project.addPhase" }) : null}
      onAction={() => setIsPhaseOpen(true)}
    >
      {deletePhaseMutation.error && (
        <div className="error-banner" role="alert">
          {deletePhaseMutation.error.message}
        </div>
      )}
      <div className="project-toolbar timeline-toolbar">
        <div className="toolbar-fields">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={intl.formatMessage({ id: "project.timelinePlaceholder" })}
          />
          <SelectField
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label={intl.formatMessage({ id: "project.filterByType" })}
            options={[
              { value: "phase", label: "project.phases" },
              { value: "milestone", label: "project.milestones" },
              { value: "task", label: "project.tasks" },
            ]}
            placeholder={intl.formatMessage({ id: "project.filterAllItems" })}
          />
          <SelectField
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            label={intl.formatMessage({ id: "project.filterByPhase" })}
            options={(project.phases || []).map((phase) => ({
              value: String(phase.id),
              label: phase.name,
            }))}
            translateOptionLabels={false}
            placeholder={intl.formatMessage({ id: "project.filterAllPhases" })}
          />
          <SelectField
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            label={intl.formatMessage({ id: "project.filterByOwner" })}
            options={(project.team_members || []).map((member) => ({
              value: String(member.user_id || member.id),
              label: member.name,
            }))}
            translateOptionLabels={false}
            placeholder={intl.formatMessage({ id: "project.filterAllOwners" })}
          />
          <SelectField
            value={filterMilestone}
            onChange={(e) => setFilterMilestone(e.target.value)}
            label={intl.formatMessage({ id: "project.filterByMilestone" })}
            options={(project.milestones || []).map((milestone) => ({
              value: String(milestone.id),
              label: milestone.title,
            }))}
            translateOptionLabels={false}
            placeholder={intl.formatMessage({ id: "project.filterAllMilestones" })}
          />
          <SelectField
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Filter by status"
            options={[
              { value: "not_started", label: "milestoneStatus.notStarted" },
              { value: "in_progress", label: "status.task.inProgress" },
              { value: "blocked", label: "status.task.blocked" },
              { value: "reviewing", label: "status.task.reviewing" },
              { value: "reviewed", label: "status.task.reviewed" },
              { value: "done", label: "status.task.done" },
              { value: "missed", label: "milestoneStatus.missed" },
            ]}
            placeholder={intl.formatMessage({ id: "common.allStatuses" })}
          />
        </div>
      </div>

      {rows.length && timelineStart && timelineEnd ? (
        <div
          className="timeline-table"
          role="table"
          aria-label={intl.formatMessage({ id: "project.ganttTimeline" })}
        >
          <div className="timeline-row timeline-header" role="row">
            <span role="columnheader">{intl.formatMessage({ id: "project.workItem" })}</span>
            <span role="columnheader">{intl.formatMessage({ id: "project.scheduleAndProgress" })}</span>
          </div>
          {rows.map((row) => (
            <div className="timeline-row" key={row.id} role="row">
              <div className="timeline-item-copy" role="cell">
                <span
                  className={`timeline-kind timeline-kind-${row.type.toLowerCase()}`}
                >
                  {row.type === "Phase" ? intl.formatMessage({ id: "project.phases" }) : row.type === "Milestone" ? intl.formatMessage({ id: "project.milestones" }) : intl.formatMessage({ id: "project.tasks" })}
                </span>
                {row.type === "Milestone" ? (
                  <button
                    className="timeline-title-button"
                    type="button"
                    onClick={() => onSelectMilestone(row.rawId)}
                  >
                    {row.title}
                  </button>
                ) : row.type === "Task" ? (
                  <button
                    className="timeline-title-button"
                    type="button"
                    onClick={() => onSelectTask(row.rawId)}
                  >
                    {row.title}
                  </button>
                ) : (
                  <strong>{row.title}</strong>
                )}
                <small>
                  {row.owner ||
                    getPhaseName(project, row.phaseId) ||
                    formatTimelineStatus(row.status)}{" "}
                  · {formatDate(row.start, intl)} — {formatDate(row.end, intl)}
                </small>
                <span className={`timeline-deadline ${getDeadlineState(row)}`}>
                  {formatDeadlineState(row)}
                </span>
                {row.type === "Phase" && canManageProject && (
                  <span className="timeline-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        setEditPhaseTarget(
                          (project.phases || []).find(
                            (phase) => phase.id === row.rawId,
                          ) || null,
                        )
                      }
                    >
                      {intl.formatMessage({ id: "common.edit" })}
                    </button>
                    <button
                      className="text-button text-button-danger"
                      type="button"
                      onClick={() => setDeletePhaseTarget(row.rawId)}
                    >
                      {intl.formatMessage({ id: "common.delete" })}
                    </button>
                  </span>
                )}
              </div>
              <div className="timeline-track-cell" role="cell">
                <div
                  className="timeline-track"
                  aria-label={`${row.title}: ${row.progress}% complete`}
                >
                  {row.type === "Milestone" ? (
                    <span
                      className={`gantt-milestone ${getDeadlineState(row)}`}
                      style={{
                        left: `${datePosition(row.end, timelineStart, timelineEnd)}%`,
                      }}
                    />
                  ) : (
                    <span
                      className={`gantt-bar gantt-${row.type.toLowerCase()} ${getDeadlineState(row)}`}
                      style={getBarStyle(row, timelineStart, timelineEnd)}
                    >
                      <span style={{ width: `${row.progress}%` }} />
                    </span>
                  )}
                </div>
                <strong className="timeline-progress">{row.progress}%</strong>
              </div>
            </div>
          ))}
          <div className="timeline-scale" aria-hidden="true">
            <span>{formatDate(timelineStart, intl)}</span>
            <span>{formatDate(timelineEnd, intl)}</span>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title={intl.formatMessage({ id: "project.noScheduledWork" })}
          message={intl.formatMessage({ id: "project.noScheduledWorkMessage" })}
        />
      )}

      {(isPhaseOpen || editPhaseTarget) && (
        <PhaseModal
          phase={editPhaseTarget || undefined}
          projectId={project.id}
          onClose={() => {
            setIsPhaseOpen(false);
            setEditPhaseTarget(null);
          }}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.project(project.id),
            })
          }
        />
      )}

      {deletePhaseTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: "project.deletePhaseTitle" })}
          description={intl.formatMessage({ id: "project.deletePhaseDescription" })}
          confirmLabel={intl.formatMessage({ id: "common.delete" })}
          variant="danger"
          isPending={deletePhaseMutation.isPending}
          onConfirm={() => deletePhaseMutation.mutate(deletePhaseTarget)}
          onCancel={() => setDeletePhaseTarget(null)}
        />
      )}
    </ProjectSection>
  );
}

function getTaskCompletion(tasks: Task[]): number {
  return tasks.length
    ? Math.round(
        (tasks.filter((task) => task.status === "done").length / tasks.length) *
          100,
      )
    : 0;
}

function earliestDate(values: Array<string | undefined>): string | undefined {
  return values.filter(Boolean).sort()[0];
}

function latestDate(values: Array<string | undefined>): string | undefined {
  return values.filter(Boolean).sort().at(-1);
}

function datePosition(
  date: string | undefined,
  start: string,
  end: string,
): number {
  if (!date || start === end) return 0;
  const position =
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`));
  return Math.max(0, Math.min(100, position * 100));
}

function getBarStyle(
  item: TimelineItem,
  start: string,
  end: string,
): { left: string; width: string } {
  const left = datePosition(item.start || item.end, start, end);
  const right = datePosition(item.end || item.start, start, end);
  return { left: `${left}%`, width: `${Math.max(2, right - left)}%` };
}

function getDeadlineState(item: TimelineItem): string {
  if (item.status === "done" || item.progress === 100) return "is-complete";
  if (item.status === "missed") return "is-overdue";
  if (!item.end) return "is-unscheduled";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${item.end}T00:00:00`);
  if (deadline < today) return "is-overdue";
  if (deadline.getTime() - today.getTime() <= 14 * 86_400_000)
    return "is-upcoming";
  return "is-scheduled";
}

function formatDeadlineState(item: TimelineItem): string {
  const state = getDeadlineState(item);
  if (state === "is-overdue") return "Overdue";
  if (state === "is-upcoming") return "Due soon";
  if (state === "is-complete") return "Complete";
  if (state === "is-unscheduled") return "Unscheduled";
  return "Scheduled";
}

function formatTimelineStatus(status: string): string {
  return status ? status.replaceAll("_", " ") : "Scheduled";
}

function milestoneStatusKey(status: string): string {
  switch (status) {
    case "not_started": return "milestoneStatus.notStarted";
    case "in_progress": return "milestoneStatus.inProgress";
    case "done": return "milestoneStatus.done";
    case "missed": return "milestoneStatus.missed";
    default: return status;
  }
}

function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes) return "0 B";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileStatus(status?: VaultFile["storage_status"]): string {
  if (status === "quarantined") return "Awaiting approval";
  if (status === "deletion_pending") return "Removal pending";
  return status ? status.replaceAll("_", " ") : "Pending";
}

function getPhaseName(project: Project, phaseId?: string): string {
  return (
    (project.phases || []).find((phase) => phase.id === phaseId)?.name || ""
  );
}

interface ProjectBreadcrumbProps {
  onBack: () => void;
  onMenu: () => void;
  project: Project;
}

function ProjectBreadcrumb({
  onBack,
  onMenu,
  project,
}: ProjectBreadcrumbProps) {
  const intl = useIntl();
  return (
    <header className="project-breadcrumb-bar">
      <button
        className="icon-button mobile-menu"
        type="button"
        aria-label={intl.formatMessage({ id: "common.openNavigation" })}
        onClick={onMenu}
      >
        <Menu size={18} />
      </button>
      <nav
        aria-label={intl.formatMessage({ id: "common.breadcrumb" })}
        className="breadcrumb"
      >
        <button type="button" onClick={onBack}>
          {intl.formatMessage({ id: "nav.projects" })}
        </button>
        <ChevronDown size={13} />
        <span className={`project-glyph priority-${project.priority}`} />
        <span>{project.name}</span>
      </nav>
      <div className="project-header-links">
        {project.website_url && (
          <a
            href={project.website_url}
            target="_blank"
            rel="noreferrer"
            aria-label={intl.formatMessage({ id: "project.openWebsite" })}
          >
            <ExternalLink />
          </a>
        )}
        {project.drive_folder_url && (
          <a
            href={project.drive_folder_url}
            target="_blank"
            rel="noreferrer"
            aria-label={intl.formatMessage({ id: "project.openDriveFolder" })}
          >
            <Layers />
          </a>
        )}
      </div>
    </header>
  );
}

interface ProjectHeroProps {
  project: Project;
}

function ProjectHero({ project }: ProjectHeroProps) {
  const intl = useIntl();
  const health = getProjectHealth(project);
  const healthLabels: Record<string, string> = {
    on_track: "health.onTrack",
    at_risk: "health.atRisk",
    behind: "health.behind",
    complete: "health.complete",
    no_update: "health.noUpdate",
  };

  return (
    <section className="project-hero">
      <span className={`project-hero-icon priority-${project.priority}`}>
        <Layers size={20} />
      </span>
      <h1>{project.name}</h1>
      <p>{project.description || intl.formatMessage({ id: "project.summaryPlaceholder" })}</p>
      <div className="project-properties" aria-label={intl.formatMessage({ id: "project.projectProperties" })}>
        <span className="property-label">{intl.formatMessage({ id: "project.projectProperties" })}</span>
        <StatusBadge status={project.status} />
        <span
          className={`status-badge status-${health === "behind" ? "blocked" : health === "at_risk" ? "on_hold" : "active"}`}
        >
          <span className="status-dot" />
          {intl.formatMessage({ id: healthLabels[health] || health })}
        </span>
        <span className="priority-label">
          <span className={`priority-mark priority-${project.priority}`} />
          {intl.formatMessage({ id: getLabel(PRIORITIES, project.priority) })}
        </span>
        <span className="project-property">
          <span className="avatar">{getInitials(project.owner_name)}</span>
          {project.owner_name || intl.formatMessage({ id: "project.noLead" })}
        </span>
        {project.start_date && (
          <span className="project-property">
            <Calendar size={14} />
            {intl.formatMessage({ id: "project.startDate" })}: {formatDate(project.start_date, intl)}
          </span>
        )}
        <span className="project-property">
          <Calendar size={14} />
          {intl.formatMessage({ id: "project.deadline" })}: {formatDate(project.deadline, intl)}
        </span>
        <span className="project-property">
          <span className="progress-ring">{getProgress(project)}</span>
          {getProgress(project)}{intl.formatMessage({ id: "project.percentComplete" })}
        </span>
      </div>
      <div className="project-resources">
        <span className="property-label">{intl.formatMessage({ id: "resource.title" })}</span>
        {project.website_url && (
          <a href={project.website_url} target="_blank" rel="noreferrer">
            {intl.formatMessage({ id: "project.projectWebsite" })} <ExternalLink size={13} />
          </a>
        )}
        {project.drive_folder_url && (
          <a href={project.drive_folder_url} target="_blank" rel="noreferrer">
            {intl.formatMessage({ id: "project.driveFolder" })} <ExternalLink size={13} />
          </a>
        )}
        {!project.website_url && !project.drive_folder_url && (
          <span>{intl.formatMessage({ id: "vault.noResourcesLinked" })}</span>
        )}
      </div>
    </section>
  );
}

interface OverviewSectionProps {
  project: Project;
  onSelectMilestone: (milestoneId: string) => void;
}

function OverviewSection({ project, onSelectMilestone }: OverviewSectionProps) {
  const intl = useIntl();
  const completedTasks =
    project.tasks?.filter((task) => task.status === "done").length || 0;
  return (
    <>
      <ProjectHero project={project} />
      <div className="project-overview-layout">
        <div className="project-main-column">
          <section className="project-update-card">
            <LayoutGrid />
            <span>
              <strong>{intl.formatMessage({ id: "project.noUpdate" })}</strong>
              <small>{intl.formatMessage({ id: "project.progressHint" })}</small>
            </span>
          </section>
          <section className="project-section-block">
            <span className="eyebrow">{intl.formatMessage({ id: "project.milestones" })}</span>
            <h2>{intl.formatMessage({ id: "project.deliveryRoadmap" })}</h2>
            {project.milestones?.length ? (
              <MilestoneRows
                project={project}
                onSelectMilestone={onSelectMilestone}
              />
            ) : (
              <EmptyState
                icon={Calendar}
                title={intl.formatMessage({ id: "milestone.noMilestones" })}
                message={intl.formatMessage({ id: "milestone.noMilestonesMessage" })}
              />
            )}
          </section>
        </div>
        <aside className="project-side-column">
          <div className="project-stat-grid">
            <ProjectStat
              value={project.tasks?.length || 0}
              label={intl.formatMessage({ id: "project.totalTasks" })}
            />
            <ProjectStat
              value={completedTasks}
              label={intl.formatMessage({ id: "dashboard.completed" })}
            />
            <ProjectStat
              value={project.milestones?.length || 0}
              label={intl.formatMessage({ id: "project.milestones" })}
            />
            <ProjectStat
              value={project.team_members?.length || 0}
              label={intl.formatMessage({ id: "milestone.members" })}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

interface TasksSectionProps {
  canManageProject: boolean;
  currentUser: User;
  onSelectMember: (userId: string) => void;
  onSelectTask: (taskId: string) => void;
  project: Project;
  projectId: string;
}

function TasksSection({
  canManageProject,
  currentUser,
  onSelectMember,
  onSelectTask,
  project,
  projectId,
}: TasksSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState("");

  const tasks = project.tasks || [];

  const handleStatusChange = async (task: Task, nextStatus: string) => {
    setUpdatingId(task.id);
    setUpdateError("");
    try {
      await api.updateTask(task.id, { status: nextStatus as Task["status"] });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(projectId),
      });
    } catch (error) {
      setUpdateError((error as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ProjectSection
      title={intl.formatMessage({ id: "project.tasksSection" })}
      description={intl.formatMessage({ id: "project.trackOwnership" })}
      actionLabel={canManageProject ? intl.formatMessage({ id: "project.addTask" }) : null}
      onAction={() => setIsCreateOpen(true)}
    >
      {updateError && (
        <div className="error-banner" role="alert">
          {updateError}
        </div>
      )}
      <div className="task-view-toolbar" style={{ marginBottom: 16 }}>
        <div className="segmented-control" aria-label={intl.formatMessage({ id: "task.viewLabel" })}>
          <button
            className={view === "list" ? "is-active" : ""}
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            {intl.formatMessage({ id: "task.viewList" })}
          </button>
          <button
            className={view === "kanban" ? "is-active" : ""}
            type="button"
            aria-pressed={view === "kanban"}
            onClick={() => setView("kanban")}
          >
            {intl.formatMessage({ id: "task.kanban" })}
          </button>
        </div>
      </div>
      {tasks.length ? (
        view === "list" ? (
          <DetailList>
            {tasks.map((task) => (
              <DetailRow key={task.id}>
                <span className={`task-check status-${task.status}`} />
                <button
                  className="detail-list-copy detail-list-link"
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                >
                  <strong>{task.title}</strong>
                  <small>
                    {task.status !== "done"
                      ? intl.formatMessage({ id: getLabel(TASK_STATUSES, task.status || "todo") })
                      : intl.formatMessage({ id: "kanban.done" })}{" "}
                    ·{" "}
                    {task.due_date ? formatDate(task.due_date, intl) : intl.formatMessage({ id: "common.noDueDate" })}
                  </small>
                </button>
                {task.assignee_user_id && (
                  <button
                    className="text-button user-link"
                    type="button"
                    onClick={() => onSelectMember(task.assignee_user_id!)}
                  >
                    {task.assignee_name || intl.formatMessage({ id: "task.assignee" })}
                  </button>
                )}
              </DetailRow>
            ))}
          </DetailList>
        ) : (
          <TaskKanbanBoard
            currentUser={currentUser}
            tasks={tasks}
            updatingId={updatingId}
            onSelectTask={onSelectTask}
            onStatusChange={handleStatusChange}
          />
        )
      ) : (
        <EmptyState
          icon={CircleCheck}
          title={intl.formatMessage({ id: "task.noTasks" })}
          message="No tasks are visible for this project."
        />
      )}
      {isCreateOpen && (
        <TaskDialog
          project={project}
          projectId={projectId}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </ProjectSection>
  );
}

interface MilestonesSectionProps {
  canManageProject: boolean;
  project: Project;
  projectId: string;
  onSelectMilestone: (milestoneId: string) => void;
}

function MilestonesSection({
  canManageProject,
  project,
  projectId,
  onSelectMilestone,
}: MilestonesSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);

  const deleteMilestone = useMutation({
    mutationFn: (id: string) => api.deleteMilestone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      setDeleteTarget(null);
    },
  });

  return (
    <ProjectSection
      title={intl.formatMessage({ id: "project.milestonesSection" })}
      description="Organize tasks around significant delivery targets."
      actionLabel={canManageProject ? intl.formatMessage({ id: "project.addMilestone" }) : null}
      onAction={() => setIsCreateOpen(true)}
    >
      {project.milestones?.length ? (
        <DetailList>
          {project.milestones.map((milestone) => {
            const tasks =
              project.tasks?.filter(
                (task) => task.milestone_id === milestone.id,
              ) || [];
            const done = tasks.filter((task) => task.status === "done").length;
            const progress = tasks.length
              ? Math.round((done / tasks.length) * 100)
              : 0;
            return (
              <DetailRow key={milestone.id}>
                <span className="milestone-mark" />
                <span className="detail-list-copy">
                  <button
                    className="text-button user-link"
                    type="button"
                    onClick={() => onSelectMilestone(milestone.id)}
                  >
                    {milestone.title}
                  </button>
                  <small>
                    {milestone.phase_name || intl.formatMessage({ id: "milestone.noPhase" })} ·{" "}
                    {formatDate(milestone.target_date, intl)} ·{" "}
                    {intl.formatMessage({ id: milestoneStatusKey(milestone.status || "not_started") })}
                  </small>
                </span>
                <span className="mini-progress">
                  <span style={{ width: `${progress}%` }} />
                </span>
                <strong className="progress-number">{progress}%</strong>
                {canManageProject && (
                  <div className="milestone-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setEditTarget(milestone)}
                    >
                      {intl.formatMessage({ id: "common.edit" })}
                    </button>
                    <button
                      className="text-button text-button-danger"
                      type="button"
                      onClick={() => setDeleteTarget(milestone)}
                    >
                      {intl.formatMessage({ id: "common.delete" })}
                    </button>
                  </div>
                )}
              </DetailRow>
            );
          })}
        </DetailList>
      ) : (
        <EmptyState
          icon={Calendar}
          title={intl.formatMessage({ id: "milestone.noMilestones" })}
          message="Milestone management is enabled through the secured API."
        />
      )}
      {isCreateOpen && (
        <MilestoneDialog
          project={project}
          projectId={projectId}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
      {editTarget && (
        <MilestoneDialog
          project={project}
          projectId={projectId}
          milestone={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: "project.deleteMilestoneTitle" })}
          description={intl.formatMessage({ id: "project.deleteMilestoneDescription" }, { title: deleteTarget.title })}
          confirmLabel={intl.formatMessage({ id: "common.delete" })}
          isPending={deleteMilestone.isPending}
          onConfirm={() => deleteMilestone.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </ProjectSection>
  );
}

interface LinksSectionProps {
  canManageProject: boolean;
  currentUser: User;
  projectId: string;
  project: Project;
}

function LinksSection({
  canManageProject,
  currentUser,
  projectId,
}: LinksSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectLink | null>(null);

  const linksQuery = useQuery({
    queryKey: queryKeys.projectLinks(projectId),
    queryFn: ({ signal }) => api.listLinks(projectId, signal),
  });

  const deleteLink = useMutation({
    mutationFn: ({ linkId }: { linkId: string }) =>
      api.deleteLink(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectLinks(projectId),
      });
      setDeleteTarget(null);
    },
  });

  const links = linksQuery.data || [];

  return (
    <>
      <ProjectSection
        title={intl.formatMessage({ id: "project.linksSection" })}
        description="External resources and documentation."
        actionLabel={canManageProject ? intl.formatMessage({ id: "project.addLink" }) : null}
        onAction={() => setIsCreateOpen(true)}
      >
        {linksQuery.isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            {intl.formatMessage({ id: "common.loading" })}
          </div>
        ) : links.length ? (
          <DetailList>
            {links.map((link) => (
              <DetailRow key={link.id}>
                <ExternalLink size={16} />
                <span className="detail-list-copy">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <strong>{link.label || link.title || link.url}</strong>
                  </a>
                  <small>{link.link_type || intl.formatMessage({ id: "project.externalLink" })}</small>
                </span>
                {canManageProject && (
                  <div className="milestone-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setEditTarget(link)}
                    >
                      {intl.formatMessage({ id: "common.edit" })}
                    </button>
                    <button
                      className="text-button text-button-danger"
                      type="button"
                      onClick={() => setDeleteTarget(link)}
                    >
                      {intl.formatMessage({ id: "common.delete" })}
                    </button>
                  </div>
                )}
              </DetailRow>
            ))}
          </DetailList>
        ) : (
          <EmptyState
            icon={ExternalLink}
            title={intl.formatMessage({ id: "project.noLinks" })}
            message={intl.formatMessage({ id: "project.noLinksMessage" })}
          />
        )}
        {isCreateOpen && (
          <LinkDialog
            projectId={projectId}
            onClose={() => setIsCreateOpen(false)}
          />
        )}
        {editTarget && (
          <LinkDialog
            projectId={projectId}
            link={editTarget}
            onClose={() => setEditTarget(null)}
          />
        )}
        {deleteTarget && (
          <ConfirmDialog
            title={intl.formatMessage({ id: "project.deleteLinkTitle" })}
            description={intl.formatMessage({ id: "project.deleteLinkDescription" }, { link: deleteTarget.label || deleteTarget.url })}
            confirmLabel={intl.formatMessage({ id: "common.delete" })}
            isPending={deleteLink.isPending}
            onConfirm={() => deleteLink.mutate({ linkId: deleteTarget.id })}
            onCancel={() => setDeleteTarget(null)}
            variant="danger"
          />
        )}
      </ProjectSection>
      <VaultResourcesSection currentUser={currentUser} projectId={projectId} />
    </>
  );
}

interface VaultResourcesSectionProps {
  currentUser: User;
  projectId: string;
}

function VaultResourcesSection({
  currentUser,
  projectId,
}: VaultResourcesSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const resourcesQuery = useQuery({
    queryKey: queryKeys.vaultEntries({ project_id: String(projectId) }),
    queryFn: ({ signal }) =>
      api.listVaultEntries({ signal, project_id: projectId }),
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => api.deleteVaultFile(fileId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaultEntries({ project_id: String(projectId) }),
      }),
  });

  const resources = resourcesQuery.data || [];
  const canReview = currentUser.role === "admin";

  const handleDownload = async (file: VaultFile) => {
    const result = await api.getFileDownload(file.id);
    window.location.assign(result.download_url);
  };

  const handleReview = async (
    file: VaultFile,
    status: "available" | "rejected",
  ) => {
    await api.reviewVaultFile(file.id, status);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.vaultEntries({ project_id: String(projectId) }),
    });
  };

  return (
    <ProjectSection
      title={intl.formatMessage({ id: "vault.title" })}
      description="Secure resources attached to this project."
      actionLabel={null}
      className="mt-3"
    >
      {resourcesQuery.isLoading ? (
        <div className="loading-state">
          <span className="spinner" />
          {intl.formatMessage({ id: "common.loading" })}
        </div>
      ) : resourcesQuery.error ? (
        <EmptyState
          icon={TriangleAlert}
          title={intl.formatMessage({ id: "vault.unavailable" })}
          message={resourcesQuery.error.message}
        />
      ) : resources.length ? (
        <DetailList>
          {resources.map((resource) => (
            <VaultResourceRow
              canReview={canReview}
              key={resource.id}
              resource={resource}
              onDeleteFile={(fileId) => deleteFile.mutate(fileId)}
              onDownload={handleDownload}
              onReview={handleReview}
            />
          ))}
        </DetailList>
      ) : (
        <EmptyState
          icon={Lock}
          title={intl.formatMessage({ id: "vault.noResourceEntries" })}
          message={intl.formatMessage({ id: "vault.noResourceEntriesMessage" })}
        />
      )}
    </ProjectSection>
  );
}

interface VaultResourceRowProps {
  canReview: boolean;
  onDeleteFile: (fileId: string) => void;
  onDownload: (file: VaultFile) => void;
  onReview: (file: VaultFile, status: "available" | "rejected") => void;
  resource: VaultEntry;
}

function VaultResourceRow({
  canReview,
  onDeleteFile,
  onDownload,
  onReview,
  resource,
}: VaultResourceRowProps) {
  const intl = useIntl();
  const files = resource.files || [];
  return (
    <DetailRow className="vault-entry-row">
      {resource.entry_type === "external_link" ? <ExternalLink size={16} /> : resource.entry_type === "file" ? <Layers size={16} /> : <Lock size={16} />}
      <span className="detail-list-copy">
        <strong>{resource.title}</strong>
        <small>
          {resource.entry_type.replaceAll("_", " ")} ·{" "}
          {resource.category || intl.formatMessage({ id: "category.general" })}
        </small>
        {files.map((file) => (
          <span className="vault-file-chip" key={file.id}>
            <span>{file.original_filename}</span>
            <small>
              {formatFileSize(file.size_bytes)} ·{" "}
              {formatFileStatus(file.storage_status)}
            </small>
            {file.storage_status === "available" && (
              <button
                className="text-button"
                type="button"
                onClick={() => onDownload(file)}
              >
                <Download size={11} />
                {intl.formatMessage({ id: "common.download" })}
              </button>
            )}
            {canReview && file.storage_status === "quarantined" && (
              <button
                className="text-button"
                type="button"
                onClick={() => onReview(file, "available")}
              >
                {intl.formatMessage({ id: "vault.approve" })}
              </button>
            )}
            {canReview && file.storage_status === "quarantined" && (
              <button
                className="text-button text-button-danger"
                type="button"
                onClick={() => onReview(file, "rejected")}
              >
                {intl.formatMessage({ id: "vault.reject" })}
              </button>
            )}
            {canReview && (
              <button
                className="text-button text-button-danger"
                type="button"
                onClick={() => onDeleteFile(file.id)}
              >
                <Trash2 size={11} />
                {intl.formatMessage({ id: "common.remove" })}
              </button>
            )}
          </span>
        ))}
      </span>
      {resource.external_url && (
        <a
          className="text-button"
          href={resource.external_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {intl.formatMessage({ id: "vault.visitLink" })} <ExternalLink size={13} />
        </a>
      )}
    </DetailRow>
  );
}

interface RisksIssuesSectionProps {
  canManageProject: boolean;
  currentUser: User;
  project: Project;
  projectId: string;
}

type RiskOrIssue = ({ _type: "risk" } & Risk) | ({ _type: "issue" } & Issue);

function RisksIssuesSection({
  canManageProject,
  currentUser,
  project,
  projectId,
}: RisksIssuesSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState("risks");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RiskOrIssue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RiskOrIssue | null>(null);

  const risksQuery = useQuery({
    queryKey: queryKeys.projectRisks(projectId),
    queryFn: ({ signal }) => api.listRisks(projectId, signal),
  });

  const issuesQuery = useQuery({
    queryKey: queryKeys.projectIssues(projectId),
    queryFn: ({ signal }) => api.listIssues(projectId, signal),
  });

  const deleteRisk = useMutation({
    mutationFn: (id: string) => api.deleteRisk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectRisks(projectId),
      });
      setDeleteTarget(null);
    },
  });

  const deleteIssue = useMutation({
    mutationFn: (id: string) => api.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectIssues(projectId),
      });
      setDeleteTarget(null);
    },
  });

  const risks = risksQuery.data || [];
  const issues = issuesQuery.data || [];
  const canManage =
    canManageProject ||
    canManageRisk(currentUser, project) ||
    canManageIssue(currentUser, project);

  return (
    <>
      <div
        className="project-tabs"
        aria-label={intl.formatMessage({ id: "project.riskIssueSections" })}
        style={{ padding: "4px 0" }}
      >
        <button
          className={activeSubTab === "risks" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveSubTab("risks")}
        >
          {intl.formatMessage({ id: "riskIssue.risks" })} <span>{risks.length}</span>
        </button>
        <button
          className={activeSubTab === "issues" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveSubTab("issues")}
        >
          {intl.formatMessage({ id: "riskIssue.issues" })} <span>{issues.length}</span>
        </button>
      </div>
      <ProjectSection
        title={
          activeSubTab === "risks"
            ? intl.formatMessage({ id: "project.risksSection" })
            : intl.formatMessage({ id: "project.issuesSection" })
        }
        description={
          activeSubTab === "risks"
            ? "Identified risks and their mitigation status."
            : "Active issues requiring resolution."
        }
        actionLabel={
          canManage
            ? intl.formatMessage({
                id: activeSubTab === "risks" ? "riskIssue.addRisk" : "riskIssue.addIssue",
              })
            : null
        }
        onAction={() => setIsCreateOpen(true)}
      >
        {activeSubTab === "risks" ? (
          risksQuery.isLoading ? (
            <div className="loading-state">
              <span className="spinner" />
              {intl.formatMessage({ id: "common.loading" })}
            </div>
          ) : risks.length ? (
            <DetailList>
              {risks.map((risk) => (
                <DetailRow key={risk.id}>
                  <span
                    className={`priority-mark priority-${risk.severity || "medium"}`}
                  />
                  <span className="detail-list-copy">
                    <strong>{risk.title}</strong>
                    <small>
                      {intl.formatMessage({ id: getLabel(RISK_SEVERITIES, risk.severity || "medium") })} {intl.formatMessage({ id: "riskIssue.severity" })} ·{" "}
                      {intl.formatMessage({ id: getLabel(RISK_SEVERITIES, risk.probability || "medium") })} {intl.formatMessage({ id: "riskIssue.probability" })} ·{" "}
                      {intl.formatMessage({ id: getLabel(RISK_STATUSES, risk.status || "open") })}
                    </small>
                  </span>
                  {canManage && (
                    <div className="milestone-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() =>
                          setEditTarget({ ...risk, _type: "risk" })
                        }
                      >
                        {intl.formatMessage({ id: "common.edit" })}
                      </button>
                      <button
                        className="text-button text-button-danger"
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ ...risk, _type: "risk" })
                        }
                      >
                        {intl.formatMessage({ id: "common.delete" })}
                      </button>
                    </div>
                  )}
                </DetailRow>
              ))}
            </DetailList>
          ) : (
            <EmptyState
              icon={TriangleAlert}
              title={intl.formatMessage({ id: "risk.none" })}
              message="Risks will appear here when they are logged against this project."
            />
          )
        ) : issuesQuery.isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            {intl.formatMessage({ id: "common.loading" })}
          </div>
        ) : issues.length ? (
          <DetailList>
            {issues.map((issue) => (
              <DetailRow key={issue.id}>
                <span
                  className={`priority-mark priority-${issue.priority || "medium"}`}
                />
                <span className="detail-list-copy">
                  <strong>{issue.title}</strong>
                  <small>
                    {intl.formatMessage({ id: getLabel(PRIORITIES, issue.priority || "medium") })} {intl.formatMessage({ id: "task.priorityLabel" })} ·{" "}
                    {intl.formatMessage({ id: getLabel(ISSUE_STATUSES, issue.status || "open") })}
                  </small>
                </span>
                {canManage && (
                  <div className="milestone-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        setEditTarget({ ...issue, _type: "issue" })
                      }
                    >
                      {intl.formatMessage({ id: "common.edit" })}
                    </button>
                    <button
                      className="text-button text-button-danger"
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ ...issue, _type: "issue" })
                      }
                    >
                      {intl.formatMessage({ id: "common.delete" })}
                    </button>
                  </div>
                )}
              </DetailRow>
            ))}
          </DetailList>
        ) : (
          <EmptyState
            icon={TriangleAlert}
            title={intl.formatMessage({ id: "issue.none" })}
            message="Issues will appear here when they are logged against this project."
          />
        )}
      </ProjectSection>

      {isCreateOpen && activeSubTab === "risks" && (
        <RiskDialog
          projectId={projectId}
          project={project}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
      {isCreateOpen && activeSubTab === "issues" && (
        <IssueDialog
          projectId={projectId}
          project={project}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
      {editTarget?._type === "risk" && (
        <RiskDialog
          projectId={projectId}
          project={project}
          risk={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {editTarget?._type === "issue" && (
        <IssueDialog
          projectId={projectId}
          project={project}
          issue={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget?._type === "risk" && (
        <ConfirmDialog
          title={intl.formatMessage({ id: "project.deleteRiskTitle" })}
          description={intl.formatMessage({ id: "project.deleteItemDescription" }, { title: deleteTarget.title })}
          confirmLabel={intl.formatMessage({ id: "common.delete" })}
          isPending={deleteRisk.isPending}
          onConfirm={() => deleteRisk.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
      {deleteTarget?._type === "issue" && (
        <ConfirmDialog
          title={intl.formatMessage({ id: "project.deleteIssueTitle" })}
          description={intl.formatMessage({ id: "project.deleteItemDescription" }, { title: deleteTarget.title })}
          confirmLabel={intl.formatMessage({ id: "common.delete" })}
          isPending={deleteIssue.isPending}
          onConfirm={() => deleteIssue.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </>
  );
}

interface TeamSectionProps {
  project: Project;
  canManageProject: boolean;
  onAdd: () => void;
  onSelectMember: (userId: string) => void;
}

function TeamSection({
  project,
  canManageProject,
  onAdd,
  onSelectMember,
}: TeamSectionProps) {
  const intl = useIntl();
  return (
    <ProjectSection
      title={intl.formatMessage({ id: "project.teamSection" })}
      description="The people who can access and contribute to this project."
      actionLabel={canManageProject ? intl.formatMessage({ id: "team.addMember" }) : null}
      onAction={onAdd}
    >
      {project.team_members?.length ? (
        <DetailList>
          {project.team_members.map((member) => (
            <DetailRow key={member.id}>
              <span className="avatar">{getInitials(member.name)}</span>
              <span className="detail-list-copy">
                <button
                  className="text-button user-link"
                  type="button"
                  onClick={() => onSelectMember(member.user_id)}
                >
                  {member.name}
                </button>
                <small>{member.email || intl.formatMessage({ id: "team.noEmailAdded" })}</small>
              </span>
              <span className="role-pill">
                {member.project_role === "project_lead"
                  ? intl.formatMessage({ id: "member.projectLead" })
                  : intl.formatMessage({ id: "member.member" })}
              </span>
            </DetailRow>
          ))}
        </DetailList>
      ) : (
        <EmptyState
          icon={Users}
          title={intl.formatMessage({ id: "team.noMembersYet" })}
          message={intl.formatMessage({ id: "team.noMembersYetMessage" })}
        />
      )}
    </ProjectSection>
  );
}

interface MilestoneRowsProps {
  project: Project;
  onSelectMilestone: (milestoneId: string) => void;
}

function MilestoneRows({ project, onSelectMilestone }: MilestoneRowsProps) {
  const intl = useIntl();
  return (
    <DetailList>
      {project.milestones!.map((milestone) => {
        const tasks =
          project.tasks?.filter((task) => task.milestone_id === milestone.id) ||
          [];
        const done = tasks.filter((task) => task.status === "done").length;
        const progress = tasks.length
          ? Math.round((done / tasks.length) * 100)
          : 0;
        return (
          <DetailRow key={milestone.id}>
            <span className="milestone-mark" />
            <span className="detail-list-copy">
              <button
                className="text-button user-link"
                type="button"
                onClick={() => onSelectMilestone(milestone.id)}
              >
                {milestone.title}
              </button>
              <small>
                {formatDate(milestone.target_date, intl)} ·{" "}
                {intl.formatMessage({ id: milestoneStatusKey(milestone.status || "not_started") })}
              </small>
            </span>
            <span className="mini-progress">
              <span style={{ width: `${progress}%` }} />
            </span>
            <strong className="progress-number">{progress}%</strong>
          </DetailRow>
        );
      })}
    </DetailList>
  );
}

interface FinanceSectionProps {
  projectId: string;
}

function FinanceSection({ projectId }: FinanceSectionProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isBudgetLineOpen, setIsBudgetLineOpen] = useState(false);
  const [isSpendOpen, setIsSpendOpen] = useState(false);
  const [editBudgetLine, setEditBudgetLine] = useState<BudgetLine | null>(null);
  const [editSpend, setEditSpend] = useState<SpendRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    _type: string;
    id: string;
    category?: string;
    name?: string;
    amount: number;
  } | null>(null);

  const summaryQuery = useQuery({
    queryKey: queryKeys.projectFinancialSummary(projectId),
    queryFn: ({ signal }) => api.getFinancialSummary(projectId, signal),
  });

  const budgetLinesQuery = useQuery({
    queryKey: queryKeys.projectBudgetLines(projectId),
    queryFn: ({ signal }) => api.listBudgetLines(projectId, signal),
  });

  const spendRecordsQuery = useQuery({
    queryKey: queryKeys.projectSpendRecords(projectId),
    queryFn: ({ signal }) => api.listSpendRecords(projectId, signal),
  });

  const deleteBudgetLine = useMutation({
    mutationFn: (id: string) => api.deleteBudgetLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectBudgetLines(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFinancialSummary(projectId),
      });
      setDeleteTarget(null);
    },
  });

  const deleteSpendRecord = useMutation({
    mutationFn: (id: string) => api.deleteSpendRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSpendRecords(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFinancialSummary(projectId),
      });
      setDeleteTarget(null);
    },
  });

  const summary = summaryQuery.data;
  const budgetLines = budgetLinesQuery.data || [];
  const spendRecords = spendRecordsQuery.data || [];
  const allocated =
    summary?.budget_allocated_amount ??
    budgetLines.reduce((sum, line) => sum + line.planned_amount, 0);
  const spent =
    summary?.total_spent ??
    spendRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const remaining = allocated - spent;
  const variance =
    allocated > 0 ? Math.round((remaining / allocated) * 100) : 0;

  return (
    <div className="finance-section">
      <div className="finance-summary-grid">
        <div className="project-stat">
          <strong>{formatCurrency(allocated, intl)}</strong>
          <span>{intl.formatMessage({ id: "project.budgetAllocated" })}</span>
        </div>
        <div className="project-stat">
          <strong>{formatCurrency(spent, intl)}</strong>
          <span>{intl.formatMessage({ id: "project.totalSpent" })}</span>
        </div>
        <div className="project-stat">
          <strong>{formatCurrency(remaining, intl)}</strong>
          <span>{intl.formatMessage({ id: "project.remaining" })}</span>
        </div>
        <div className="project-stat">
          <strong>{variance}%</strong>
          <span>{intl.formatMessage({ id: "project.variance" })}</span>
        </div>
        {summary?.projected_final_cost !== undefined && summary.projected_final_cost !== null && (
          <div className="project-stat">
            <strong>{formatCurrency(summary.projected_final_cost, intl)}</strong>
            <span>{intl.formatMessage({ id: "project.projectedFinalCost" })}</span>
          </div>
        )}
      </div>

      <div className="project-section-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">{intl.formatMessage({ id: "project.financialTracking" })}</span>
            <h2>{intl.formatMessage({ id: "project.budgetLines" })}</h2>
            <p>{intl.formatMessage({ id: "project.allocatedByCategory" })}</p>
          </div>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => setIsBudgetLineOpen(true)}
          >
            <Plus size={14} />
            {intl.formatMessage({ id: "project.addBudgetLine" })}
          </button>
        </div>
        {budgetLinesQuery.isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            {intl.formatMessage({ id: "common.loading" })}
          </div>
        ) : budgetLines.length ? (
          <DetailList>
            {budgetLines.map((line) => {
              const lineSpent = spendRecords
                .filter((record) => record.category === line.category)
                .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
              const over = lineSpent > line.planned_amount;
              const pct = line.planned_amount > 0 ? Math.min(100, Math.round((lineSpent / line.planned_amount) * 100)) : 0;
              return (
                <DetailRow key={line.id}>
                  <span className="detail-list-copy">
                    <strong>{line.category}</strong>
                    <span className="variance-bar" aria-hidden="true">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <small>
                      {formatCurrency(line.planned_amount, intl, line.currency)} {intl.formatMessage({ id: "project.budget" })}{line.note ? ` · ${line.note}` : ""}
                    </small>
                  </span>
                  <div className="variance-figures">
                    <span>{formatCurrency(lineSpent, intl, line.currency)} <em>{intl.formatMessage({ id: "project.spent" })}</em></span>
                    <span className={`variance-badge ${over ? "is-over" : "is-ok"}`}>
                      {over ? intl.formatMessage({ id: "project.overBudget" }) : intl.formatMessage({ id: "project.underBudget" })} {formatCurrency(Math.abs(line.planned_amount - lineSpent), intl, line.currency)}
                    </span>
                  </div>
                  <div className="milestone-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setEditBudgetLine(line)}
                    >
                      {intl.formatMessage({ id: "common.edit" })}
                    </button>
                    <button
                      className="text-button text-button-danger"
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          _type: "budgetLine",
                          id: line.id,
                          category: line.category,
                          amount: line.planned_amount,
                        })
                      }
                    >
                      {intl.formatMessage({ id: "common.delete" })}
                    </button>
                  </div>
                </DetailRow>
              );
            })}
          </DetailList>
        ) : (
          <EmptyState
            icon={Layers}
            title={intl.formatMessage({ id: "budget.noLines" })}
            message={intl.formatMessage({ id: "budget.noLinesMessage" })}
          />
        )}
      </div>

      <div className="project-section-card" style={{ marginTop: "12px" }}>
        <div className="section-header">
          <div>
            <span className="eyebrow">{intl.formatMessage({ id: "project.financialTracking" })}</span>
            <h2>{intl.formatMessage({ id: "project.spendRecords" })}</h2>
            <p>{intl.formatMessage({ id: "project.spendRecordsDescription" })}</p>
          </div>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => setIsSpendOpen(true)}
          >
            <Plus size={14} />
            {intl.formatMessage({ id: "project.addSpendRecord" })}
          </button>
        </div>
        {spendRecordsQuery.isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            {intl.formatMessage({ id: "common.loading" })}
          </div>
        ) : spendRecords.length ? (
          <DetailList>
            {spendRecords.map((record) => (
              <DetailRow key={record.id}>
                <span className="detail-list-copy">
                  <strong>
                    {record.description || record.category || intl.formatMessage({ id: "budget.spendRecord" })}
                  </strong>
                  <small>
                    {formatCurrency(record.amount, intl)} ·{" "}
                    {record.spent_on || intl.formatMessage({ id: "common.noDate" })}
                  </small>
                </span>
                <div className="milestone-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setEditSpend(record)}
                  >
                    {intl.formatMessage({ id: "common.edit" })}
                  </button>
                  <button
                    className="text-button text-button-danger"
                    type="button"
                    onClick={() =>
                      setDeleteTarget({ _type: "spend", ...record })
                    }
                  >
                    {intl.formatMessage({ id: "common.delete" })}
                  </button>
                </div>
              </DetailRow>
            ))}
          </DetailList>
        ) : (
          <EmptyState
            icon={Layers}
            title={intl.formatMessage({ id: "budget.noSpendRecords" })}
            message={intl.formatMessage({ id: "budget.noSpendRecordsMessage" })}
          />
        )}
      </div>

      {isBudgetLineOpen && (
        <BudgetLineDialog
          projectId={projectId}
          onClose={() => setIsBudgetLineOpen(false)}
        />
      )}
      {editBudgetLine && (
        <BudgetLineDialog
          projectId={projectId}
          budgetLine={editBudgetLine}
          onClose={() => setEditBudgetLine(null)}
        />
      )}
      {isSpendOpen && (
        <SpendRecordDialog
          projectId={projectId}
          onClose={() => setIsSpendOpen(false)}
        />
      )}
      {editSpend && (
        <SpendRecordDialog
          projectId={projectId}
          record={editSpend}
          onClose={() => setEditSpend(null)}
        />
      )}
      {deleteTarget?._type === "budgetLine" && (
        <ConfirmDialog
          title={intl.formatMessage({ id: "budget.deleteLine" })}
          description={intl.formatMessage({ id: "budget.deleteLineMessage" })}
          confirmLabel={intl.formatMessage({ id: "common.delete" })}
          isPending={deleteBudgetLine.isPending}
          onConfirm={() => deleteBudgetLine.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
      {deleteTarget?._type === "spend" && (
        <ConfirmDialog
          title={intl.formatMessage({ id: "budget.deleteSpend" })}
          description={intl.formatMessage({ id: "budget.deleteSpendMessage" })}
          confirmLabel={intl.formatMessage({ id: "common.delete" })}
          isPending={deleteSpendRecord.isPending}
          onConfirm={() => deleteSpendRecord.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

interface BudgetLineDialogProps {
  budgetLine?: BudgetLine;
  projectId: string;
  onClose: () => void;
}

function BudgetLineDialog({
  budgetLine,
  projectId,
  onClose,
}: BudgetLineDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const isEditing = Boolean(budgetLine);
  const [form, setForm] = useState({
    category: budgetLine?.category || "",
    planned_amount: budgetLine?.planned_amount || "",
    currency: budgetLine?.currency || "USD",
    effective_date:
      budgetLine?.effective_date || new Date().toISOString().slice(0, 10),
    note: budgetLine?.note || "",
  });
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: import("../types/api.js").CreateBudgetLinePayload) =>
      isEditing
        ? api.updateBudgetLine(budgetLine!.id, data)
        : api.createBudgetLine(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectBudgetLines(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFinancialSummary(projectId),
      });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.category.trim() || !form.planned_amount || !form.effective_date) {
      setError("Category, amount, and effective date are required.");
      return;
    }
    saveMutation.mutate({
      ...form,
      planned_amount: Number(form.planned_amount),
    });
  };

  return (
    <DialogShell
      title={isEditing ? "Edit budget line" : "Add budget line"}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="field-group">
          <label htmlFor="bl-category">{intl.formatMessage({ id: "project.budgetLineCategory" })}</label>
          <input
            id="bl-category"
            required
            value={form.category}
            onChange={(e) =>
              setForm((c) => ({ ...c, category: e.target.value }))
            }
            placeholder={intl.formatMessage({ id: "budget.categoryPlaceholder" })}
          />
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="bl-amount">{intl.formatMessage({ id: "project.spendAmount" })}</label>
            <input
              id="bl-amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.planned_amount}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  planned_amount: e.target.value,
                }))
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="bl-currency">{intl.formatMessage({ id: "budget.currency" })}</label>
            <input
              id="bl-currency"
              required
              maxLength={3}
              value={form.currency}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  currency: e.target.value.toUpperCase(),
                }))
              }
              placeholder={intl.formatMessage({ id: "budget.currencyPlaceholder" })}
            />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="bl-date">{intl.formatMessage({ id: "project.budgetLineDate" })}</label>
          <input
            id="bl-date"
            type="date"
            required
            value={form.effective_date}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                effective_date: e.target.value,
              }))
            }
          />
        </div>
        <div className="field-group">
          <label htmlFor="bl-note">{intl.formatMessage({ id: "project.budgetLineNote" })}</label>
          <textarea
            id="bl-note"
            value={form.note}
            onChange={(e) =>
              setForm((current) => ({ ...current, note: e.target.value }))
            }
            placeholder={intl.formatMessage({ id: "budget.linePurpose" })}
          />
        </div>
        <footer className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            {intl.formatMessage({ id: "common.cancel" })}
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? intl.formatMessage({ id: "common.saving" })
              : intl.formatMessage({ id: "common.save" })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

interface SpendRecordDialogProps {
  projectId: string;
  record?: SpendRecord;
  onClose: () => void;
}

function SpendRecordDialog({
  projectId,
  record,
  onClose,
}: SpendRecordDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const isEditing = Boolean(record);
  const [form, setForm] = useState({
    amount: record?.amount || "",
    category: record?.category || "",
    description: record?.description || "",
    spent_on: record?.spent_on || "",
  });
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: {
      amount: number;
      category: string;
      description: string;
      spent_on: string;
      project_id: string;
    }) =>
      isEditing
        ? api.updateSpendRecord(record!.id, data)
        : api.createSpendRecord(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectSpendRecords(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFinancialSummary(projectId),
      });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.amount) {
      setError(intl.formatMessage({ id: "budget.amountRequired" }));
      return;
    }
    saveMutation.mutate({
      ...form,
      project_id: projectId,
      amount: Number(form.amount),
    });
  };

  return (
    <DialogShell
      title={isEditing ? "Edit spend record" : "Record spend"}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="sp-amount">{intl.formatMessage({ id: "project.spendAmount" })} ($)</label>
            <input
              id="sp-amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) =>
                setForm((c) => ({ ...c, amount: e.target.value }))
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="sp-date">{intl.formatMessage({ id: "project.spendDate" })}</label>
            <input
              id="sp-date"
              type="date"
              value={form.spent_on}
              onChange={(e) =>
                setForm((c) => ({ ...c, spent_on: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="sp-category">{intl.formatMessage({ id: "project.spendCategory" })}</label>
          <input
            id="sp-category"
            value={form.category}
            onChange={(e) =>
              setForm((c) => ({ ...c, category: e.target.value }))
            }
            placeholder={intl.formatMessage({ id: "budget.spendCategoryPlaceholder" })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="sp-desc">{intl.formatMessage({ id: "project.spendDescription" })}</label>
          <textarea
            id="sp-desc"
            value={form.description}
            onChange={(e) =>
              setForm((c) => ({ ...c, description: e.target.value }))
            }
            placeholder={intl.formatMessage({ id: "budget.spendPurpose" })}
          />
        </div>
        <footer className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            {intl.formatMessage({ id: "common.cancel" })}
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? intl.formatMessage({ id: "common.saving" })
              : intl.formatMessage({ id: "common.save" })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

function formatCurrency(amount: number, intl: ReturnType<typeof useIntl>, currency = "USD") {
  const num = Number(amount) || 0;
  return intl.formatNumber(num, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface ProjectSectionProps {
  actionLabel: string | null;
  children: React.ReactNode;
  className?: string;
  description: string;
  onAction?: () => void;
  title: string;
}

function ProjectSection({
  actionLabel,
  children,
  className,
  description,
  onAction,
  title,
}: ProjectSectionProps) {
  const intl = useIntl();
  return (
    <section className={`project-section-card${className ? ` ${className}` : ""}`}>
      <div className="section-header">
        <div>
          <span className="eyebrow">{intl.formatMessage({ id: "project.workspace" })}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {actionLabel && (
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={onAction}
          >
            <Plus size={14} />
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

interface ProjectStatProps {
  label: string;
  value: number;
}

function ProjectStat({ label, value }: ProjectStatProps) {
  return (
    <div className="project-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

interface TabCountProps {
  project: Project;
  tab: string;
}

function TabCount({ project, tab }: TabCountProps) {
  const count =
    tab === "Tasks"
      ? project.tasks?.length
      : tab === "Milestones"
        ? project.milestones?.length
        : tab === "Team"
          ? project.team_members?.length
          : null;
  return count == null ? null : <span>{count}</span>;
}

interface ProjectErrorProps {
  error: Error | null;
  onBack: () => void;
  onMenu: () => void;
}

function ProjectError({ error, onBack, onMenu }: ProjectErrorProps) {
  const intl = useIntl();
  return (
    <>
      <header className="project-breadcrumb-bar">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label={intl.formatMessage({ id: "common.openNavigation" })}
          onClick={onMenu}
        >
          <Menu />
        </button>
        <button className="text-button" type="button" onClick={onBack}>
          {intl.formatMessage({ id: "nav.projects" })}
        </button>
      </header>
      <div className="project-error">
        <EmptyState
          icon={TriangleAlert}
          title={intl.formatMessage({ id: "project.unavailable" })}
          message={error?.message || "This project could not be loaded."}
          action={
            <button
              className="button button-secondary"
              type="button"
              onClick={onBack}
            >
              {intl.formatMessage({ id: "common.backToAllProjects" })}
            </button>
          }
        />
      </div>
    </>
  );
}

interface CreateProjectItemFormProps {
  onCancel: () => void;
  onCreated: () => void;
  project: Project;
  type: string;
}

function CreateProjectItemForm({
  onCancel,
  onCreated,
  project,
  type,
}: CreateProjectItemFormProps) {
  const intl = useIntl();
  const initialValues = useMemo(() => getInitialValues(type), [type]);
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateField =
    (key: string) =>
    (
      eventOrValue:
        | React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >
        | string
        | number
        | null,
    ) => {
      const value =
        eventOrValue &&
        typeof eventOrValue === "object" &&
        "target" in eventOrValue
          ? eventOrValue.target.value
          : eventOrValue;
      setForm((current) => ({ ...current, [key]: value }));
    };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await createProjectItem(type, project.id, form);
      await onCreated();
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="inline-create-form project-inline-form"
      onSubmit={handleSubmit}
    >
      <div className="section-header compact">
        <div>
          <span className="eyebrow">{intl.formatMessage({ id: "project.quickAdd" })}</span>
          <h3>{intl.formatMessage({ id: getCreateTitle(type) })}</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={intl.formatMessage({ id: "common.close" })}
          onClick={onCancel}
        >
          <X size={14} />
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {type === "milestone" && (
        <MilestoneFields form={form} updateField={updateField} />
      )}
      {type === "member" && (
        <MemberFields form={form} updateField={updateField} />
      )}
      <div className="dialog-actions">
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={onCancel}
        >
          {intl.formatMessage({ id: "common.cancel" })}
        </button>
        <button
          className="button button-primary button-small"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? intl.formatMessage({ id: "common.saving" })
            : intl.formatMessage({ id: "common.save" })}
        </button>
      </div>
    </form>
  );
}

interface MilestoneFieldsProps {
  form: InitialValues;
  updateField: (
    key: string,
  ) => (
    eventOrValue:
      | React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      | string
      | number
      | null,
  ) => void;
}

function MilestoneFields({ form, updateField }: MilestoneFieldsProps) {
  const intl = useIntl();
  return (
    <>
      <div className="field-group">
        <label htmlFor="milestone-title">{intl.formatMessage({ id: "milestone.milestoneTitle" })}</label>
        <input
          id="milestone-title"
          required
          value={form.title as string}
          onChange={updateField("title")}
        />
      </div>
      <div className="field-group">
        <label htmlFor="milestone-date">{intl.formatMessage({ id: "milestone.targetDate" })}</label>
        <input
          id="milestone-date"
          type="date"
          value={form.target_date as string}
          onChange={updateField("target_date")}
        />
      </div>
    </>
  );
}

interface MemberFieldsProps {
  form: InitialValues;
  updateField: (
    key: string,
  ) => (
    eventOrValue:
      | React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      | string
      | number
      | null,
  ) => void;
}

function MemberFields({ form, updateField }: MemberFieldsProps) {
  const intl = useIntl();
  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });
  return (
    <>
      <div className="field-group">
        <label htmlFor="member-user">{intl.formatMessage({ id: "team.teamMember" })}</label>
        <select
          id="member-user"
          required
          value={form.user_id as string}
          onChange={(event) =>
            updateField("user_id")(Number(event.target.value))
          }
        >
          <option value="">{intl.formatMessage({ id: "common.selectUser" })}</option>
          {(usersQuery.data || [])
            .filter((user) => user.status === "active")
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.email}
              </option>
            ))}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor="member-role">{intl.formatMessage({ id: "team.memberRole" })}</label>
        <select
          id="member-role"
          value={form.project_role as string}
          onChange={updateField("project_role")}
        >
          <option value="member">{intl.formatMessage({ id: "member.member" })}</option>
          <option value="project_lead">{intl.formatMessage({ id: "member.projectLead" })}</option>
        </select>
      </div>
    </>
  );
}

interface InitialValues {
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  milestone_id?: string | null;
  assignee_user_id?: string | null;
  target_date?: string;
  status?: string;
  user_id?: string;
  project_role?: string;
}

function getInitialValues(type: string): InitialValues {
  if (type === "milestone")
    return { title: "", target_date: "", status: "not_started" };
  return { user_id: "", project_role: "member" };
}

function getCreateTitle(type: string) {
  return type === "milestone" ? "milestone.createTitle" : "team.addMember";
}

function createProjectItem(
  type: string,
  projectId: string,
  form: InitialValues,
) {
  if (type === "milestone")
    return api.createMilestone(projectId, {
      ...form,
      project_id: projectId,
      status: (form.status || "not_started") as MilestoneStatus,
    } as CreateMilestonePayload);
  return api.addProjectMember(projectId, {
    user_id: form.user_id || "",
    project_role: (form.project_role || "member") as ProjectRole,
  });
}

export interface TaskDialogProps {
  initialMilestoneId?: string | null;
  onClose: () => void;
  onCreated?: () => void;
  project: Project;
  projectId: string;
}

export function TaskDialog({
  initialMilestoneId = null,
  onClose,
  onCreated,
  project,
  projectId,
}: TaskDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as Priority,
    due_date: "",
    milestone_id: initialMilestoneId,
    assignee_user_id: null as string | null,
  });
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      onCreated?.();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell
      title={intl.formatMessage({ id: "task.createTitle" })}
      description={intl.formatMessage({ id: "task.createDescription" })}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="field-group">
          <label htmlFor="task-title">{intl.formatMessage({ id: "task.titleField" })}</label>
          <input
            id="task-title"
            required
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
          />
        </div>
        <div className="field-group">
          <label htmlFor="task-description">{intl.formatMessage({ id: "task.descriptionField" })}</label>
          <textarea
            id="task-description"
            value={form.description}
            onChange={(e) =>
              setForm((c) => ({ ...c, description: e.target.value }))
            }
            placeholder={intl.formatMessage({ id: "task.descriptionPlaceholder" })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="task-priority">{intl.formatMessage({ id: "task.priorityLabel" })}</label>
          <select
            id="task-priority"
            value={form.priority}
            onChange={(e) =>
              setForm((c) => ({ ...c, priority: e.target.value as Priority }))
            }
          >
            {PRIORITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {intl.formatMessage({ id: item.label })}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field-group">
            <label htmlFor="task-date">{intl.formatMessage({ id: "task.dueDateLabel" })}</label>
            <input
              id="task-date"
              type="date"
              value={form.due_date}
              onChange={(e) =>
                setForm((c) => ({ ...c, due_date: e.target.value }))
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="task-milestone">{intl.formatMessage({ id: "task.milestoneLabel" })}</label>
            <select
              id="task-milestone"
              value={form.milestone_id || ""}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  milestone_id: e.target.value ? e.target.value : null,
                }))
              }
            >
              <option value="">{intl.formatMessage({ id: "task.noMilestone" })}</option>
              {(project.milestones || []).map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="task-assignee">{intl.formatMessage({ id: "task.assignee" })}</label>
          <select
            id="task-assignee"
            value={form.assignee_user_id || ""}
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                assignee_user_id: e.target.value ? e.target.value : null,
              }))
            }
          >
            <option value="">{intl.formatMessage({ id: "common.unassigned" })}</option>
            {(project.team_members || [])
              .filter((member) => member.status === "active")
              .map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.name}
                </option>
              ))}
          </select>
        </div>
        <footer className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            {intl.formatMessage({ id: "common.cancel" })}
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? intl.formatMessage({ id: "common.saving" })
              : intl.formatMessage({ id: "common.save" })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

interface MilestoneDialogProps {
  milestone?: Milestone;
  project: Project;
  projectId: string;
  onClose: () => void;
}

function MilestoneDialog({
  milestone,
  project,
  projectId,
  onClose,
}: MilestoneDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const isEditing = Boolean(milestone);
  const [form, setForm] = useState({
    title: milestone?.title || "",
    target_date: milestone?.target_date || "",
    status: milestone?.status || "not_started",
    phase_id: milestone?.phase_id ? String(milestone.phase_id) : "",
  });
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: CreateMilestonePayload) =>
      isEditing
        ? api.updateMilestone(milestone!.id, data)
        : api.createMilestone(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.target_date) {
      setError(intl.formatMessage({ id: "task.targetDateRequired" }));
      return;
    }
    saveMutation.mutate({
      ...form,
      phase_id: form.phase_id ? form.phase_id : null,
      project_id: projectId,
    });
  };

  return (
    <DialogShell
      title={isEditing ? "Edit milestone" : intl.formatMessage({ id: "milestone.createTitle" })}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="field-group">
          <label htmlFor="ms-title">{intl.formatMessage({ id: "milestone.milestoneTitle" })}</label>
          <input
            id="ms-title"
            required
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
          />
        </div>
        <div className="field-group">
          <label htmlFor="ms-phase">{intl.formatMessage({ id: "milestone.phase" })}</label>
          <select
            id="ms-phase"
            value={form.phase_id}
            onChange={(e) =>
              setForm((c) => ({ ...c, phase_id: e.target.value }))
            }
          >
            <option value="">{intl.formatMessage({ id: "milestone.noPhase" })}</option>
            {(project.phases || []).map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="ms-date">{intl.formatMessage({ id: "milestone.targetDate" })}</label>
          <input
            id="ms-date"
            type="date"
            required
            value={form.target_date}
            onChange={(e) =>
              setForm((c) => ({ ...c, target_date: e.target.value }))
            }
          />
        </div>
        <div className="field-group">
          <label htmlFor="ms-status">{intl.formatMessage({ id: "milestone.status" })}</label>
          <select
            id="ms-status"
            value={form.status}
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                status: e.target.value as MilestoneStatus,
              }))
            }
          >
            <option value="not_started">{intl.formatMessage({ id: "milestone.notStarted" })}</option>
            <option value="in_progress">{intl.formatMessage({ id: "milestone.inProgress" })}</option>
            <option value="done">{intl.formatMessage({ id: "milestone.done" })}</option>
            <option value="missed">{intl.formatMessage({ id: "milestone.missed" })}</option>
          </select>
        </div>
        <footer className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            {intl.formatMessage({ id: "common.cancel" })}
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? intl.formatMessage({ id: "common.saving" })
              : intl.formatMessage({ id: "common.save" })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

interface LinkDialogProps {
  link?: ProjectLink;
  projectId: string;
  onClose: () => void;
}

function LinkDialog({ link, projectId, onClose }: LinkDialogProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const isEditing = Boolean(link);
  const [form, setForm] = useState({
    label: link?.label || link?.title || "",
    url: link?.url || "",
    link_type: link?.link_type || "",
  });
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: (data: {
      label: string;
      url: string;
      link_type: string;
      project_id: string;
    }) =>
      isEditing
        ? api.updateLink(projectId, link!.id, data)
        : api.createLink(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectLinks(projectId),
      });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.url.trim()) {
      setError(intl.formatMessage({ id: "project.urlRequired" }));
      return;
    }
    saveMutation.mutate({ ...form, project_id: projectId });
  };

  return (
    <DialogShell title={isEditing ? "Edit link" : "Add link"} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="field-group">
          <label htmlFor="link-label">{intl.formatMessage({ id: "project.label" })}</label>
          <input
            id="link-label"
            value={form.label}
            onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))}
            placeholder={intl.formatMessage({ id: "project.linkLabelPlaceholder" })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="link-url">{intl.formatMessage({ id: "project.url" })}</label>
          <input
            id="link-url"
            type="url"
            required
            value={form.url}
            onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))}
            placeholder={intl.formatMessage({ id: "project.urlPlaceholder" })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="link-type">{intl.formatMessage({ id: "common.type" })}</label>
          <input
            id="link-type"
            value={form.link_type}
            onChange={(e) =>
              setForm((c) => ({ ...c, link_type: e.target.value }))
            }
            placeholder={intl.formatMessage({ id: "project.linkTypePlaceholder" })}
          />
        </div>
        <footer className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            {intl.formatMessage({ id: "common.cancel" })}
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? intl.formatMessage({ id: "common.saving" })
              : intl.formatMessage({ id: "common.save" })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
