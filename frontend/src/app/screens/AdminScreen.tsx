import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Users, LayoutGrid, ClipboardList, Archive, AlertTriangle,
  ChevronRight, Plus, Check, Newspaper, Package, X,
} from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";
import type { Screen } from "../types";
import { useAuth } from "../auth/AuthContext";
import {
  approveUser,
  fetchPendingUsers,
  rejectUser,
} from "@/lib/adminApi";
import type { AuthUser } from "@/lib/authApi";
import { ApiError, apiFetch } from "@/lib/api";
// Garden-admin compose → Dashboard Community board.
import { createAnnouncement } from "@/lib/announcementsApi";
// Live Admin unclaimed-tasks panel + resend-claim action.
import {
  fetchHelpRequests,
  resendHelpRequestClaim,
  type HelpRequest,
} from "@/lib/helpRequestsApi";

type AdminListModal = "pending" | "plots" | "tasks" | "inventory" | null; // which View-all modal is open

const AVATAR_COLORS = [C.terra, C.sage, C.amber, C.lavender, C.sky];

/** Prefer full name; fall back to email for incomplete profiles. */
function displayName(user: AuthUser): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.email;
}

function initialsFor(user: AuthUser): string {
  const first = user.first_name?.[0];
  const last = user.last_name?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return (user.email?.[0] || "?").toUpperCase();
}

function formatJoined(dateJoined?: string): string {
  if (!dateJoined) return "";
  const date = new Date(dateJoined);
  if (Number.isNaN(date.getTime())) return dateJoined;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format help-request due_date for Admin rows (YYYY-MM-DD → locale date). */
function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Unclaimed = no assignee and not completed. */
function isUnclaimedHelpRequest(request: HelpRequest): boolean {
  return request.assigned_to == null && request.status !== "done";
}

export function AdminScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { accessToken } = useAuth();
  const { plots, plotsLoading, plotsError } = usePlots();

  const unassignedPlots = plots.filter(
    (plot) => plot.is_active && plot.owners.length === 0
  );

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annText, setAnnText] = useState("");
  // Compose-only feedback (Admin does not list announcements).
  const [annPosting, setAnnPosting] = useState(false); // disables Post while create is in flight
  const [annError, setAnnError] = useState<string | null>(null);
  const [annSuccess, setAnnSuccess] = useState<string | null>(null); // shown after a successful create
  // Controls the full-list popup (pending today; other keys reserved for later panels).
  const [listModal, setListModal] = useState<AdminListModal>(null);

  // Live pending registrations (other Admin panels stay mock for now).
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<number | null>(null);

  // Live unclaimed help requests (no assignee, not done).
  const [unclaimedTasks, setUnclaimedTasks] = useState<HelpRequest[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [resendingTaskId, setResendingTaskId] = useState<number | null>(null); // disables Resend while in flight
  const [resendMessage, setResendMessage] = useState<string | null>(null); // success toast line above the list

  // Live inventory alerts (numeric qty 0 = out; 1–LOW_STOCK_THRESHOLD = low).
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    if (!accessToken) {
      setPendingUsers([]);
      setPendingLoading(false);
      return;
    }
    setPendingLoading(true);
    setPendingError(null);
    try {
      const users = await fetchPendingUsers(accessToken);
      setPendingUsers(users);
    } catch (err) {
      setPendingUsers([]);
      setPendingError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load pending registrations.",
      );
    } finally {
      setPendingLoading(false);
    }
  }, [accessToken]);

  // Load help requests and keep only unclaimed ones for the Admin panel.
  const loadUnclaimedTasks = useCallback(async () => {
    if (!accessToken) {
      setUnclaimedTasks([]);
      setTasksLoading(false);
      return;
    }
    setTasksLoading(true);
    setTasksError(null);
    try {
      const requests = await fetchHelpRequests(accessToken);
      setUnclaimedTasks(requests.filter(isUnclaimedHelpRequest));
    } catch (err) {
      setUnclaimedTasks([]);
      setTasksError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load unclaimed tasks.",
      );
    } finally {
      setTasksLoading(false);
    }
  }, [accessToken]);

  // Load inventory list and keep only out-of-stock / low-stock rows.
  const loadInventoryAlerts = useCallback(async () => {
    // Admin is gated; wait for JWT before hitting the inventory list.
    if (!accessToken) {
      setInventoryAlerts([]);
      setInventoryLoading(false);
      return;
    }
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      // GET /api/inventory/ — filter client-side; token optional on AllowAny, ready for IsApproved.
      const items = await apiFetch<InventoryItemRow[]>("/api/inventory/", {
        token: accessToken,
      });
      // Drop rows that are in stock or have non-numeric quantities.
      setInventoryAlerts(
        items
          .map(toInventoryAlert)
          .filter((alert): alert is InventoryAlert => alert != null),
      );
    } catch (err) {
      setInventoryAlerts([]);
      setInventoryError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load inventory alerts.",
      );
    } finally {
      setInventoryLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  // Fetch unclaimed tasks whenever the auth token is available.
  useEffect(() => {
    void loadUnclaimedTasks();
  }, [loadUnclaimedTasks]);

  // Fetch inventory alerts whenever the auth token is available.
  useEffect(() => {
    void loadInventoryAlerts();
  }, [loadInventoryAlerts]);

  /** Approve then refresh the pending list. */
  async function handleApprove(userId: number) {
    if (!accessToken) return;
    setActionUserId(userId);
    setPendingError(null);
    try {
      await approveUser(accessToken, userId);
      await loadPending();
    } catch (err) {
      setPendingError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Approve failed.",
      );
    } finally {
      setActionUserId(null);
    }
  }

  /** Reject (delete signup) then refresh the pending list. */
  async function handleReject(userId: number) {
    if (!accessToken) return;
    setActionUserId(userId);
    setPendingError(null);
    try {
      await rejectUser(accessToken, userId);
      await loadPending();
    } catch (err) {
      setPendingError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Reject failed.",
      );
    } finally {
      setActionUserId(null);
    }
  }

  /** Resend claim-notification email to all active garden members (admin only; no assign). */
  async function handleResendClaim(taskId: number) {
    if (!accessToken) return;
    setResendingTaskId(taskId);
    setTasksError(null);
    setResendMessage(null);
    try {
      const result = await resendHelpRequestClaim(accessToken, taskId);
      setResendMessage(
        result.recipients > 0
          ? `Claim email resent (${result.recipients} recipients).`
          : result.detail,
      );
    } catch (err) {
      setTasksError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Resend claim email failed.",
      );
    } finally {
      setResendingTaskId(null);
    }
  }

  /** Post body to /api/announcements/ — appears on Dashboard Community board only. */
  async function handlePostAnnouncement() {
    if (!accessToken) return; // Admin requires JWT
    const body = annText.trim();
    // Reject empty posts before hitting the API.
    if (!body) {
      setAnnError("Write an announcement before posting.");
      return;
    }
    setAnnPosting(true);
    setAnnError(null);
    setAnnSuccess(null);
    try {
      await createAnnouncement(accessToken, body);
      // Clear the compose form; do not load/list posts here.
      setAnnText("");
      setShowAnnForm(false);
      setAnnSuccess("Posted to the Dashboard Community board.");
    } catch (err) {
      setAnnError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not post announcement.",
      );
    } finally {
      setAnnPosting(false);
    }
  }

  const statCards = [
    // Pending opens the full-list modal; other cards still navigate to member screens.
    { label: "Pending Registrations", value: pendingUsers.length, color: C.terra,    Icon: Users,         action: () => setListModal("pending") },
    { label: "Unassigned Plots",       value: 3, color: C.amber,   Icon: LayoutGrid,    action: () => setScreen("plot") },
    // Live unclaimed count; opens the tasks View-all modal.
    { label: "Unclaimed Tasks",        value: unclaimedTasks.length, color: C.lavender, Icon: ClipboardList, action: () => setListModal("tasks") },
    // Live inventory alert count; opens the inventory View-all modal.
    { label: "Inventory Alerts",       value: inventoryAlerts.length, color: C.sky,     Icon: Archive,       action: () => setListModal("inventory") },
    { label: "Flagged Content",        value: 0, color: C.sage,    Icon: AlertTriangle, action: () => {} },
  ];

  const inventoryAlerts = [
    { item: "Wheelbarrow",        qty: 0, label: "Out of stock" },
    { item: "Organic Fertilizer", qty: 2, label: "Low stock"    },
  ];

  const unassignedPlots = [
    { id: 5,  zone: "North" },
    { id: 12, zone: "South" },
    { id: 21, zone: "East"  },
  ];

  const recentActivity = [
    { name: "Kate A.",  sub: "Approved John S.",        when: "10m ago",   initials: "KA", color: C.sage     },
    { name: "Plot 2",   sub: "Assigned to Maria K.",    when: "1h ago",    initials: "P2", color: C.amber    },
    { name: "John S.",  sub: '"Close Shed" marked done', when: "2h ago",   initials: "JS", color: C.terra    },
    { name: "Mary K.",  sub: "New announcement posted", when: "Yesterday", initials: "MK", color: C.lavender },
  ];

  const panel = (
    title: string,
    icon: ReactNode,
    action: ReactNode,
    children: ReactNode
  ) => (
    <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
      borderRadius: "0.875rem", overflow: "hidden",
      boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)" }}>
      <div style={{ background: C.sagePop, borderBottom: `0.0625rem solid ${C.sageMid}`,
        padding: "0.5625rem 1rem", display: "flex", alignItems: "center",
        justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
          {icon}
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: C.sage,
            letterSpacing: "0.04em", ...mono }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );

  const viewAll = (onClick?: () => void) => (
    <button type="button" onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer",
      color: C.sage, fontSize: "0.7rem", fontWeight: 700,
      fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", gap: "0.1875rem" }}>
      View all <ChevronRight size={12} />
    </button>
  );

  // Shared pending rows for the dashboard panel and the View-all modal.
  function renderPendingList() {
    if (pendingLoading) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
          Loading pending registrations…
        </div>
      );
    }
    if (pendingError) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.terra, fontWeight: 600 }}>
          {pendingError}
        </div>
      );
    }
    if (pendingUsers.length === 0) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
          No pending registrations.
        </div>
      );
    }
    return pendingUsers.map((user, i) => {
      const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
      const busy = actionUserId === user.id;
      return (
        <div key={user.id} style={{ display: "flex", alignItems: "center",
          gap: "0.625rem", padding: "0.6875rem 1rem",
          borderBottom: i < pendingUsers.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none" }}>
          <div style={{ width: "2rem", height: "2rem", borderRadius: "50%",
            background: color, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontWeight: 800, fontSize: "0.64rem" }}>
            {initialsFor(user)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>
              {displayName(user)}
            </div>
            <div style={{ fontSize: "0.66rem", color: C.muted, ...mono }}>
              {user.email}
              {user.date_joined ? ` · ${formatJoined(user.date_joined)}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.375rem" }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleApprove(user.id)}
              style={{ background: C.sageLight, color: C.sageDark, border: "none",
                borderRadius: "0.4375rem", padding: "0.25rem 0.625rem", fontSize: "0.68rem", fontWeight: 800,
                cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
                fontFamily: "'Nunito', sans-serif" }}>
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReject(user.id)}
              style={{ background: C.terraLight, color: C.terra, border: "none",
                borderRadius: "0.4375rem", padding: "0.25rem 0.625rem", fontSize: "0.68rem", fontWeight: 800,
                cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
                fontFamily: "'Nunito', sans-serif" }}>
              Reject
            </button>
          </div>
        </div>
      );
    });
  }

  // Shared unclaimed-task rows for the dashboard panel and the View-all modal.
  function renderUnclaimedList() {
    if (tasksLoading) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
          Loading unclaimed tasks…
        </div>
      );
    }
    if (tasksError) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.terra, fontWeight: 600 }}>
          {tasksError}
        </div>
      );
    }
    if (unclaimedTasks.length === 0) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
          No unclaimed help requests.
        </div>
      );
    }
    return (
      <>
        {/* Shown after a successful resend-claim call */}
        {resendMessage && (
          <div style={{ padding: "0.75rem 1rem 0", fontSize: "0.72rem", color: C.sage, fontWeight: 700 }}>
            {resendMessage}
          </div>
        )}
        {unclaimedTasks.map((task, i) => {
          const highPriority = task.priority === "high";
          const busy = resendingTaskId === task.id;
          return (
            <div key={task.id} style={{ display: "flex", alignItems: "center",
              gap: "0.625rem", padding: "0.6875rem 1rem",
              borderBottom: i < unclaimedTasks.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown, marginBottom: "0.125rem" }}>
                  {task.title}
                </div>
                <div style={{ fontSize: "0.66rem", color: C.muted, ...mono }}>
                  {formatDueDate(task.due_date)}
                </div>
              </div>
              {/* Priority badge — high uses terra, otherwise amber */}
              <span style={{
                background: highPriority ? C.terraLight : C.amberLight,
                color: highPriority ? C.terra : C.amber,
                fontSize: "0.64rem", fontWeight: 800, padding: "0.125rem 0.5rem", borderRadius: "1.25rem",
                textTransform: "capitalize",
              }}>
                {task.priority}
              </span>
              {/* Admin can only resend claim email — no assignee picker */}
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleResendClaim(task.id)}
                style={{ background: C.sageLight, color: C.lavender, border: "none",
                  borderRadius: "0.4375rem", padding: "0.25rem 0.625rem", fontSize: "0.68rem", fontWeight: 800,
                  cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
                  fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap" }}>
                {busy ? "Sending…" : "Resend claim email"}
              </button>
            </div>
          );
        })}
      </>
    );
  }

  // Shared inventory-alert rows for the dashboard panel and the View-all modal.
  function renderInventoryAlertsList() {
    if (inventoryLoading) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
          Loading inventory alerts…
        </div>
      );
    }
    if (inventoryError) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.terra, fontWeight: 600 }}>
          {inventoryError}
        </div>
      );
    }
    if (inventoryAlerts.length === 0) {
      return (
        <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
          No inventory alerts.
        </div>
      );
    }
    return inventoryAlerts.map((a, i) => {
      // Terra = out of stock; amber = low stock (matches prior mock styling).
      const outOfStock = a.label === "Out of stock";
      return (
        <div
          key={a.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0.6875rem 1rem",
            borderBottom:
              i < inventoryAlerts.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5625rem",
              background: outOfStock ? C.terraLight : C.amberLight,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={14} color={outOfStock ? C.terra : C.amber} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>{a.item}</div>
            <div style={{ fontSize: "0.66rem", color: C.muted }}>Qty: {a.quantity}</div>
          </div>
          {/* Severity badge — same labels as the mock Inventory Alerts panel */}
          <span
            style={{
              background: outOfStock ? C.terraLight : C.amberLight,
              color: outOfStock ? C.terra : C.amber,
              fontSize: "0.64rem",
              fontWeight: 800,
              padding: "0.125rem 0.5rem",
              borderRadius: "1.25rem",
            }}
          >
            {a.label}
          </span>
        </div>
      );
    });
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans }}>
      <div className="page-content">

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h1 style={{ ...serif, fontSize: "1.4rem", fontWeight: 700,
              color: C.brown, margin: "0 0 0.1875rem" }}>Admin Dashboard</h1>
            <p style={{ fontSize: "0.76rem", color: C.muted, margin: 0 }}>
              Overview of what needs your attention and recent community activity
            </p>
          </div>
          <button style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
            color: C.white, border: "none", borderRadius: "0.625rem", padding: "0.5rem 1rem",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
            fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Plus size={14} /> New Activity
          </button>
        </div>

        {/* Stat cards */}
        <div className="admin-stat-row" style={{ marginBottom: "1.125rem" }}>
          {statCards.map(({ label, value, color, Icon, action }) => (
            <button key={label} type="button" onClick={action}
              style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
                borderRadius: "0.875rem", padding: "1rem 1rem 0.875rem",
                boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)",
                cursor: "pointer", textAlign: "left",
                fontFamily: "'Nunito', sans-serif",
                display: "flex", flexDirection: "column", gap: "0.5rem",
                transition: "box-shadow 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0.25rem 0.875rem ${color}33`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0.0625rem 0.25rem rgba(44,31,20,0.05)")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5625rem",
                  background: `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: "2rem", fontWeight: 800,
                  color: value === 0 ? C.muted : C.brown, lineHeight: 1 }}>{value}</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: C.brownLight,
                fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
              <div style={{ fontSize: "0.66rem", color: color, fontWeight: 700 }}>
                {value === 0 ? "All clear" : "View →"}
              </div>
            </button>
          ))}
        </div>

        {/* 2x2 panel grid */}
        <div className="admin-panel-grid" style={{ marginBottom: "0.875rem" }}>

        {/* Live pending queue from GET /api/auth/pending/ */}
          {/* View all opens the full pending list in a modal */}
          {panel("Pending Registrations", <Users size={13} color={C.sage} />, viewAll(() => setListModal("pending")), (
            <div>
              {renderPendingList()}
            </div>
          ))}

          {panel("Unassigned Plots", <LayoutGrid size={13} color={C.sage} />, viewAll(() => setScreen("plot")), (
            <div>
              {unassignedPlots.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center",
                  gap: "0.625rem", padding: "0.6875rem 1rem",
                  borderBottom: i < unassignedPlots.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5625rem", background: C.sageLight,
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LayoutGrid size={14} color={C.sage} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>Plot {p.id}</div>
                    <div style={{ fontSize: "0.66rem", color: C.muted }}>{p.zone} Zone</div>
                  </div>
                  <button style={{ background: C.amberLight, color: C.amber, border: "none",
                    borderRadius: "0.4375rem", padding: "0.25rem 0.75rem", fontSize: "0.68rem", fontWeight: 800,
                    cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Assign</button>
                </div>
              ))}
            </div>
          ))}

          {/* Live unclaimed help requests — Resend claim email only (no assign) */}
          {panel("Unclaimed Help Requests", <AlertTriangle size={13} color={C.sage} />, viewAll(() => setListModal("tasks")), (
            <div>
              {renderUnclaimedList()}
            </div>
          ))}

          {/* Live inventory alerts — out of stock / low stock from GET /api/inventory/ */}
          {panel("Inventory Alerts", <Archive size={13} color={C.sage} />, viewAll(() => setListModal("inventory")), (
            <div>
              {renderInventoryAlertsList()}
            </div>
          ))}
        </div>

        {/* Recent Activity — full width horizontal */}
        <div style={{ marginBottom: "0.875rem" }}>
          {panel("Recent Activity", <Check size={13} color={C.sage} />, viewAll(), (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ padding: "0.875rem 1rem",
                  borderRight: i < recentActivity.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "50%",
                      background: a.color, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.white, fontWeight: 800, fontSize: "0.62rem" }}>
                      {a.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.brown }}>{a.name}</div>
                      <div style={{ fontSize: "0.62rem", color: C.muted, ...mono }}>{a.when}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: C.brownLight, lineHeight: 1.4 }}>{a.sub}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Community Announcements — compose only; posts appear on Dashboard Community board */}
        {panel("Community Announcements", <Newspaper size={13} color={C.sage} />,
          <button
            type="button"
            onClick={() => {
              // Toggle compose form; clear prior success/error banners.
              setShowAnnForm((v) => !v);
              setAnnError(null);
              setAnnSuccess(null);
            }}
            style={{ background: C.sage, color: C.white, border: "none",
              borderRadius: "0.4375rem", padding: "0.25rem 0.75rem", fontSize: "0.7rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Plus size={11} /> New Announcement
          </button>,
          <div style={{ padding: "0.875rem 1rem" }}>
            {/* Success after a create — Admin never lists the board feed */}
            {annSuccess && (
              <div style={{ marginBottom: "0.75rem", fontSize: "0.72rem", color: C.sage, fontWeight: 700 }}>
                {annSuccess}
              </div>
            )}
            {annError && (
              <div style={{ marginBottom: "0.75rem", fontSize: "0.72rem", color: C.terra, fontWeight: 700 }}>
                {annError}
              </div>
            )}
            {showAnnForm ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <textarea
                  value={annText}
                  onChange={(e) => setAnnText(e.target.value)}
                  placeholder="Write your announcement to the community…"
                  disabled={annPosting}
                  style={{ ...inputStyle, minHeight: "4.5rem", resize: "vertical",
                    fontFamily: "'Nunito', sans-serif" } as CSSProperties}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {/* POST /api/announcements/ (garden-admin JWT) */}
                  <button
                    type="button"
                    disabled={annPosting}
                    onClick={() => void handlePostAnnouncement()}
                    style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                      color: C.white, border: "none", borderRadius: "0.5625rem", padding: "0.5rem 1.25rem",
                      fontWeight: 700, fontSize: "0.8rem",
                      cursor: annPosting ? "wait" : "pointer", opacity: annPosting ? 0.7 : 1,
                      fontFamily: "'Nunito', sans-serif" }}
                  >
                    {annPosting ? "Posting…" : "Post"}
                  </button>
                  <button
                    type="button"
                    disabled={annPosting}
                    onClick={() => {
                      setShowAnnForm(false);
                      setAnnText("");
                      setAnnError(null);
                    }}
                    style={{ background: C.creamDark, color: C.brownLight, border: "none",
                      borderRadius: "0.5625rem", padding: "0.5rem 0.875rem", fontWeight: 700, fontSize: "0.8rem",
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Idle state — no feed; Dashboard is the source of truth for posted news.
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
                <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", background: C.sagePop,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Newspaper size={18} color={C.sage} />
                </div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.brownMid }}>
                    Post to the Community board
                  </div>
                  <div style={{ fontSize: "0.72rem", color: C.muted }}>
                    Announcements appear on the Dashboard — this panel does not list them.
                    Posts older than 30 days are removed automatically.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Full pending list modal (stat card / View all). Backdrop click closes. */}
      {listModal === "pending" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pending registrations"
          onClick={() => setListModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(44,31,20,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: "1rem",
          }}
        >
          {/* stopPropagation so clicks inside the card do not close the modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card,
              borderRadius: "1.375rem",
              width: "min(92%, 32rem)",
              maxHeight: "min(80vh, 40rem)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)",
              border: `0.125rem solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderBottom: `0.0625rem solid ${C.border}`,
            }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                Pending Registrations
              </h3>
              <button
                type="button"
                onClick={() => setListModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={17} />
              </button>
            </div>
            {/* Scrollable body reuses the same pending rows as the panel */}
            <div style={{ overflow: "auto", flex: 1 }}>
              {renderPendingList()}
            </div>
          </div>
        </div>
      )}

      {/* Full unclaimed-tasks modal (stat card / View all). Backdrop click closes. */}
      {listModal === "tasks" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unclaimed help requests"
          onClick={() => setListModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(44,31,20,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: "1rem",
          }}
        >
          {/* stopPropagation so clicks inside the card do not close the modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card,
              borderRadius: "1.375rem",
              width: "min(92%, 36rem)",
              maxHeight: "min(80vh, 40rem)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)",
              border: `0.125rem solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderBottom: `0.0625rem solid ${C.border}`,
            }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                Unclaimed Help Requests
              </h3>
              <button
                type="button"
                onClick={() => setListModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={17} />
              </button>
            </div>
            {/* Scrollable body reuses the same unclaimed rows as the panel */}
            <div style={{ overflow: "auto", flex: 1 }}>
              {renderUnclaimedList()}
            </div>
          </div>
        </div>
      )}

      {/* Full inventory-alerts modal (stat card / View all). Backdrop click closes. */}
      {listModal === "inventory" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Inventory alerts"
          onClick={() => setListModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(44,31,20,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card,
              borderRadius: "1.375rem",
              width: "min(92%, 32rem)",
              maxHeight: "min(80vh, 40rem)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)",
              border: `0.125rem solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderBottom: `0.0625rem solid ${C.border}`,
            }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                Inventory Alerts
              </h3>
              <button
                type="button"
                onClick={() => setListModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              {renderInventoryAlertsList()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
