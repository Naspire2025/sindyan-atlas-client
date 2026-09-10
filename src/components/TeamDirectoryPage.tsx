import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { api } from "../api/client.js";
import { queryKeys } from "../api/queryKeys.js";
import type { User, UserRole, UserStatus } from "../types/api.js";
import ConfirmDialog from "./ConfirmDialog.js";
import DialogShell from "./DialogShell.js";
import EmptyState from "./EmptyState.js";

import PageHeader from "./PageHeader.js";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldOff,
  TriangleAlert,
  Users,
} from "lucide-react";

interface TeamDirectoryPageProps {
  onMenu: () => void;
  onSelectMember: (userId: string) => void;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "team.admin" },
  { value: "team_member", label: "team.teamMember" },
];
const EMPTY_USERS: User[] = [];

const STATUS_PILL_STYLES: Record<UserStatus, string> = {
  active: "bg-pulse-green/15 text-[#6ee7a0]",
  suspended: "bg-coral-red/15 text-[#f09a9a]",
  pending: "bg-[#d8a52f]/15 text-[#e0b34a]",
};

const AVATAR_PALETTE = [
  "bg-iris-violet/15 text-lavender",
  "bg-signal-teal/15 text-signal-teal",
  "bg-pulse-green/15 text-pulse-green",
  "bg-coral-red/15 text-[#f09a9a]",
  "bg-white/10 text-mist",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function statusLabel(status: UserStatus, intl: ReturnType<typeof useIntl>): string {
  switch (status) {
    case "suspended":
      return intl.formatMessage({ id: "team.suspended" });
    case "pending":
      return intl.formatMessage({ id: "team.pending" });
    default:
      return intl.formatMessage({ id: "team.active" });
  }
}

function roleLabel(role: UserRole, intl: ReturnType<typeof useIntl>): string {
  return role === "admin"
    ? intl.formatMessage({ id: "team.admin" })
    : intl.formatMessage({ id: "team.teamMember" });
}

export default function TeamDirectoryPage({
  onMenu,
  onSelectMember,
}: TeamDirectoryPageProps) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [menuOpenUserId, setMenuOpenUserId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: ({ signal }) => api.listUsers({ signal }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      setEditTarget(null);
    },
  });

  const users = usersQuery.data || EMPTY_USERS;
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!q) return true;
        return `${user.name} ${user.email} ${user.role}`
          .toLowerCase()
          .includes(q);
      })
      .filter((user) => {
        return (
          (!roleFilter || user.role === roleFilter) &&
          (!statusFilter || user.status === statusFilter)
        );
      });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (!menuOpenUserId) return;
    const closeOnScroll = () => {
      setMenuOpenUserId(null);
      setMenuAnchor(null);
    };
    document.addEventListener("scroll", closeOnScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", closeOnScroll, {
        capture: true,
        passive: true,
      } as EventListenerOptions);
  }, [menuOpenUserId]);

  return (
    <>
      <PageHeader
        eyebrow={intl.formatMessage({ id: 'team.administration' })}
        title={intl.formatMessage({ id: 'team.directoryTitle' })}
        description={intl.formatMessage({ id: 'team.directoryDescription' })}
        onMenu={onMenu}
      />

      <section className="panel vault-panel">
        <div className="project-toolbar">
          <div>
            <span className="eyebrow">{intl.formatMessage({ id: 'team.directory' })}</span>
            <h2>
              {intl.formatMessage({ id: 'team.userCount' }, { n: users.length })}
            </h2>
          </div>
          <label className="search-field">
            <Search />
            <span className="sr-only">{intl.formatMessage({ id: 'team.searchTeam' })}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={intl.formatMessage({ id: "common.search" })}
            />
          </label>
          <label className="select-field">
            <span className="sr-only">{intl.formatMessage({ id: 'team.filterByRole' })}</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="">{intl.formatMessage({ id: 'team.allRoles' })}</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {intl.formatMessage({ id: role.label })}
                </option>
              ))}
            </select>
          </label>
          <label className="select-field">
            <span className="sr-only">{intl.formatMessage({ id: 'team.filterByStatus' })}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">{intl.formatMessage({ id: 'common.allStatuses' })}</option>
              <option value="active">{intl.formatMessage({ id: "team.active" })}</option>
              <option value="suspended">{intl.formatMessage({ id: "team.suspended" })}</option>
              <option value="pending">{intl.formatMessage({ id: "team.pending" })}</option>
            </select>
          </label>
        </div>

        {usersQuery.isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            {intl.formatMessage({ id: "common.loading" })}
          </div>
        ) : usersQuery.error ? (
          <EmptyState
            icon={TriangleAlert}
            title={intl.formatMessage({ id: 'team.failedToLoad' })}
            message={usersQuery.error.message}
          />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={intl.formatMessage({ id: "team.noMembers" })}
            message={
              search
                ? "Try adjusting your search."
                : intl.formatMessage({ id: "team.noMembersMessage" })
            }
          />
        ) : (
          <div className="member-grid">
            {filteredUsers.map((user) => (
              <article
                className="group relative w-full cursor-pointer rounded-card border border-graphite bg-white/[0.015] p-5 transition-colors hover:border-smoke hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-acid-lime/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
                key={user.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMember(user.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectMember(user.id);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-[510] ${avatarColor(`${user.name}|${user.email}`)}`}
                    >
                      {user.name?.slice(0, 2).toUpperCase() || "\u2014"}
                    </span>
                    <p className="truncate text-[13px] font-[510] text-bone">
                      {user.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={intl.formatMessage({ id: 'team.memberActions' })}
                    aria-haspopup="menu"
                    aria-expanded={menuOpenUserId === user.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      const anchor =
                        event.currentTarget.getBoundingClientRect();
                      if (menuOpenUserId === user.id) {
                        setMenuOpenUserId(null);
                        setMenuAnchor(null);
                      } else {
                        setMenuOpenUserId(user.id);
                        setMenuAnchor(anchor);
                      }
                    }}
                    className="shrink-0 rounded-md p-1 text-fog transition-colors hover:bg-white/[0.05] hover:text-paper"
                  >
                    <MoreHorizontal size={18} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1 truncate text-[11px] text-ash">
                  {user.email}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-badge px-2 py-0.5 text-[11px] font-[510] ${STATUS_PILL_STYLES[user.status]}`}
                    >
                      {statusLabel(user.status, intl)}
                    </span>
                    <span className="rounded-badge border border-graphite bg-white/[0.05] px-2 py-0.5 text-[11px] font-[510] text-fog">
                      {roleLabel(user.role, intl)}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-graphite transition-all group-hover:translate-x-0.5 group-hover:text-fog"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editTarget && (
        <EditRoleDialog
          user={editTarget}
          isPending={updateUser.isPending}
          onSave={(data: { role: UserRole }) =>
            updateUser.mutate({ id: editTarget.id, data })
          }
          onClose={() => setEditTarget(null)}
        />
      )}
      {suspendTarget && (
        <ConfirmDialog
          title={intl.formatMessage({ id: 'team.suspendUser' })}
          description={intl.formatMessage({ id: 'team.suspendDescription' }, { name: suspendTarget.name })}
          confirmLabel={intl.formatMessage({ id: "team.suspended" })}
          isPending={updateUser.isPending}
          onConfirm={() =>
            updateUser.mutate({
              id: suspendTarget.id,
              data: { status: "suspended" },
            })
          }
          onCancel={() => setSuspendTarget(null)}
          variant="danger"
        />
      )}
      {menuOpenUserId &&
        menuAnchor &&
        (() => {
          const openUser = users.find((u) => u.id === menuOpenUserId);
          if (!openUser) return null;
          return createPortal(
            <FloatingMenu
              user={openUser}
              anchor={menuAnchor}
              onEdit={() => {
                setEditTarget(openUser);
                setMenuOpenUserId(null);
                setMenuAnchor(null);
              }}
              onSuspend={() => {
                setSuspendTarget(openUser);
                setMenuOpenUserId(null);
                setMenuAnchor(null);
              }}
              onClose={() => {
                setMenuOpenUserId(null);
                setMenuAnchor(null);
              }}
            />,
            document.body,
          );
        })()}
    </>
  );
}

const MENU_EDGE = 4;

function FloatingMenu({
  user,
  anchor,
  onEdit,
  onSuspend,
  onClose,
}: {
  user: User;
  anchor: DOMRect;
  onEdit: () => void;
  onSuspend: () => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    top: number;
    right: number;
  } | null>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const height = menu.offsetHeight;
    const fitsBelow = anchor.bottom + height + MENU_EDGE <= window.innerHeight;
    const rawTop = fitsBelow
      ? anchor.bottom + MENU_EDGE
      : anchor.top - height - MENU_EDGE;
    const top = Math.max(
      MENU_EDGE,
      Math.min(rawTop, window.innerHeight - height - MENU_EDGE),
    );
    const right = window.innerWidth - anchor.right;
    setPlacement({ top, right });
  }, [anchor, user.status, onClose]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 w-[10rem] overflow-hidden rounded-control border border-graphite bg-obsidian p-1 shadow-xl"
      style={
        placement
          ? { top: placement.top, right: placement.right }
          : { visibility: "hidden" }
      }
    >
      <button
        type="button"
        role="menuitem"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        className="flex w-full items-center gap-2 rounded-small px-2 py-1.5 text-left text-[12px] text-mist transition-colors hover:bg-white/[0.05] hover:text-paper"
      >
        <Pencil size={14} />
        {intl.formatMessage({ id: "common.edit" })}
      </button>
      {user.status === "active" && user.role !== "admin" && (
        <button
          type="button"
          role="menuitem"
          onClick={(event) => {
            event.stopPropagation();
            onSuspend();
          }}
          className="flex w-full items-center gap-2 rounded-small px-2 py-1.5 text-left text-[12px] text-coral-red transition-colors hover:bg-white/[0.05] hover:text-[#f09a9a]"
        >
          <ShieldOff size={14} />
          {intl.formatMessage({ id: "team.suspend" })}
        </button>
      )}
    </div>
  );
}

interface EditRoleDialogProps {
  user: User;
  isPending: boolean;
  onSave: (data: { role: UserRole }) => void;
  onClose: () => void;
}

function EditRoleDialog({
  user,
  isPending,
  onSave,
  onClose,
}: EditRoleDialogProps) {
  const intl = useIntl();
  const [role, setRole] = useState(user.role || "team_member");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    onSave({ role });
  };

  return (
    <DialogShell
      title={intl.formatMessage({ id: 'team.editUser' }, { name: user.name })}
      description={intl.formatMessage({ id: 'team.editRoleDescription' })}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="field-group">
          <label htmlFor="edit-role">{intl.formatMessage({ id: 'team.accountRole' })}</label>
          <select
            id="edit-role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {intl.formatMessage({ id: opt.label })}
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
            disabled={isPending}
          >
            {isPending ? intl.formatMessage({ id: "common.saving" }) : intl.formatMessage({ id: "common.save" })}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}
