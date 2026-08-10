import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Users, UserCheck, LayoutGrid, ClipboardList, Archive, AlertTriangle,
  ChevronRight, Plus, Package, X,
} from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";
import type { Screen } from "../types";
import { useAuth } from "../auth/AuthContext";
// invalidatePlotsCache refreshes Admin unassigned list after assign succeeds.
import { invalidatePlotsCache, usePlots } from "../hooks/usePlots";
import {
  approveUser,
  fetchPendingUsers,
  fetchUsers,
  rejectUser,
} from "@/lib/adminApi";
import type { AuthUser } from "@/lib/authApi";
import { ApiError, apiFetch } from "@/lib/api";
// POST /api/plots/<id>/assign/ — creates primary PlotOwnership.
import { assignPlotSteward } from "@/api/plots";
// Garden-admin compose → Dashboard Community board.
import { createAnnouncement } from "@/lib/announcementsApi";
// Live Admin unclaimed-tasks panel + resend-claim action.
import {
  fetchHelpRequests,
  isUnclaimedHelpRequest,
  resendHelpRequestClaim,
  type HelpRequest,
} from "@/lib/helpRequestsApi";
// Inventory Alerts — list via shared apiFetch (no edits to inventory client).
import {
  filterInventoryAlerts,
  type InventoryAlert,
  type InventoryItemRow,
} from "@/lib/adminInventoryAlerts";

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

export function AdminScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { accessToken } = useAuth();
  // Shared plot cache — invalidatePlotsCache() after a successful assign.
  const { plots, plotsLoading, plotsError } = usePlots();

  // Active plots with no PlotOwnership rows (owners[] empty from GET /api/plots/).
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
  // Approved member count for the stat card beside Pending Registrations.
  const [approvedMemberCount, setApprovedMemberCount] = useState(0);

  // Live unclaimed help requests (no assignee, not done).
  const [unclaimedTasks, setUnclaimedTasks] = useState<HelpRequest[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [resendingTaskId, setResendingTaskId] = useState<number | null>(null); // disables Resend while in flight
  // Per-task success line so a second identical resend still looks like feedback.
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendMessageTaskId, setResendMessageTaskId] = useState<number | null>(null);

  // Live inventory alerts (numeric qty 0 = out; 1–LOW_STOCK_THRESHOLD = low).
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Assign-plot modal: pick an approved member as primary steward (PlotOwnership).
  const [assignPlotId, setAssignPlotId] = useState<number | null>(null);
  const [assignCandidates, setAssignCandidates] = useState<AuthUser[]>([]);
  const [assignCandidatesLoading, setAssignCandidatesLoading] = useState(false);
  const [assignCandidatesError, setAssignCandidatesError] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const assignPlot = assignPlotId == null
    ? null
    : unassignedPlots.find((plot) => plot.id === assignPlotId) ?? null;

  /** Close picker; ignore backdrop clicks while the assign request is running. */
  const closeAssignModal = () => {
    if (assignSubmitting) return;
    setAssignPlotId(null);
    setAssignCandidates([]);
    setAssignCandidatesError(null);
    setSelectedAssigneeId(null);
    setAssignError(null);
  };

  /** Open modal and load GET /api/auth/users/ filtered to is_approved. */
  const openAssignModal = async (plotId: number) => {
    setAssignPlotId(plotId);
    setSelectedAssigneeId(null);
    setAssignError(null);
    setAssignCandidatesError(null);
    setAssignCandidates([]);

    if (!accessToken) {
      setAssignCandidatesError("Sign in required.");
      return;
    }

    setAssignCandidatesLoading(true);
    try {
      const users = await fetchUsers(accessToken);
      const approved = users
        .filter((user) => user.is_approved)
        .sort((a, b) => displayName(a).localeCompare(displayName(b)));
      setAssignCandidates(approved);
    } catch (err) {
      setAssignCandidatesError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load members.",
      );
    } finally {
      setAssignCandidatesLoading(false);
    }
  };

  /** POST /api/plots/<id>/assign/ then refresh the shared plots cache. */
  const handleAssignPlot = async () => {
    if (!accessToken || assignPlotId == null || selectedAssigneeId == null) return;

    setAssignSubmitting(true);
    setAssignError(null);
    try {
      await assignPlotSteward(assignPlotId, selectedAssigneeId, accessToken);
      invalidatePlotsCache();
      setAssignSubmitting(false);
      setAssignPlotId(null);
      setAssignCandidates([]);
      setSelectedAssigneeId(null);
    } catch (err) {
      setAssignError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not assign plot.",
      );
      setAssignSubmitting(false);
    }
  };

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

  // Count approved members from GET /api/auth/users/ (garden-admin only).
  const loadApprovedMembers = useCallback(async () => {
    if (!accessToken) {
      setApprovedMemberCount(0);
      return;
    }
    try {
      const users = await fetchUsers(accessToken);
      setApprovedMemberCount(users.filter((u) => u.is_approved).length);
    } catch {
      // Stat card only — leave last known count on soft failure.
      setApprovedMemberCount(0);
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
      setInventoryAlerts(filterInventoryAlerts(items));
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

  // Refresh approved-member count whenever the token is available.
  useEffect(() => {
    void loadApprovedMembers();
  }, [loadApprovedMembers]);

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
      await loadApprovedMembers(); // pending → approved moves the member count
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
    // Resolve title from state (coerce id — API/JSON may yield string ids).
    const taskTitle = unclaimedTasks
      .find((t) => Number(t.id) === Number(taskId))
      ?.title?.trim();
    setResendingTaskId(taskId);
    setTasksError(null);
    setResendMessage(null);
    setResendMessageTaskId(null);
    try {
      const result = await resendHelpRequestClaim(accessToken, taskId);
      const n = result.recipients;
      setResendMessageTaskId(taskId);
      if (n > 0) {
        setResendMessage(
          taskTitle
            ? `Resent “${taskTitle}” to ${n} active garden member${n === 1 ? "" : "s"}`
            : `Resent to ${n} active garden member${n === 1 ? "" : "s"}`,
        );
      } else {
        setResendMessage(result.detail);
      }
    } catch (err) {
      setResendMessageTaskId(taskId);
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

  const statCards: {
    label: string;
    value: number;
    color: string;
    Icon: typeof Users;
    action: () => void;
    hint?: string;
  }[] = [
    // Pending opens the full-list modal; other cards still navigate to member screens.
    { label: "Pending Registrations", value: pendingUsers.length, color: C.terra, Icon: Users, action: () => setListModal("pending") },
    // Live approved count from GET /api/auth/users/ — sits beside Pending.
    { label: "Approved Members", value: approvedMemberCount, color: C.sage, Icon: UserCheck, action: () => {}, hint: "Garden members" },
    { label: "Unassigned Plots", value: unassignedPlots.length, color: C.amber, Icon: LayoutGrid, action: () => setScreen("plot") },
    // Live unclaimed count; opens the tasks View-all modal.
    { label: "Unclaimed Tasks", value: unclaimedTasks.length, color: C.lavender, Icon: ClipboardList, action: () => setListModal("tasks") },
    // Live inventory alert count; opens the inventory View-all modal.
    { label: "Inventory Alerts", value: inventoryAlerts.length, color: C.sky, Icon: Archive, action: () => setListModal("inventory") },
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
        {unclaimedTasks.map((task, i) => {
          const highPriority = task.priority === "high";
          // Only the in-flight row shows Sending…; others stay clickable.
          const busy = resendingTaskId === task.id;
          const anySending = resendingTaskId != null;
          const justSent =
            resendMessageTaskId != null &&
            Number(resendMessageTaskId) === Number(task.id) &&
            Boolean(resendMessage);
          return (
            <div key={task.id} style={{
              padding: "0.6875rem 1rem",
              borderBottom: i < unclaimedTasks.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
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
                  disabled={anySending}
                  onClick={() => void handleResendClaim(task.id)}
                  style={{ background: C.sageLight, color: C.lavender, border: "none",
                    borderRadius: "0.4375rem", padding: "0.25rem 0.625rem", fontSize: "0.68rem", fontWeight: 800,
                    cursor: anySending ? "wait" : "pointer", opacity: anySending && !busy ? 0.55 : busy ? 0.7 : 1,
                    fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap" }}>
                  {busy ? "Sending…" : "Resend claim email"}
                </button>
              </div>
              {/* Per-row success so the next task’s resend is obviously acknowledged */}
              {justSent && (
                <div style={{ marginTop: "0.375rem", fontSize: "0.66rem", color: C.sage, fontWeight: 700 }}>
                  {resendMessage}
                </div>
              )}
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
          justifyContent: "space-between", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ ...serif, fontSize: "1.4rem", fontWeight: 700,
              color: C.brown, margin: "0 0 0.1875rem" }}>Admin Dashboard</h1>
            <p style={{ fontSize: "0.76rem", color: C.muted, margin: 0 }}>
              Overview of what needs your attention and recent community activity
            </p>
            {/* Compose feedback after posting from the header button */}
            {annSuccess && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: C.sage, fontWeight: 700 }}>
                {annSuccess}
              </div>
            )}
            {annError && !showAnnForm && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: C.terra, fontWeight: 700 }}>
                {annError}
              </div>
            )}
          </div>
          {/* Opens compose modal — posts go to Dashboard Community board */}
          <button
            type="button"
            onClick={() => {
              setShowAnnForm(true);
              setAnnError(null);
              setAnnSuccess(null);
            }}
            style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
              color: C.white, border: "none", borderRadius: "0.625rem", padding: "0.5rem 1rem",
              fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              fontFamily: "'Nunito', sans-serif",
              display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <Plus size={14} /> New Announcement
          </button>
        </div>

        {/* Stat cards */}
        <div className="admin-stat-row" style={{ marginBottom: "1.125rem" }}>
          {statCards.map(({ label, value, color, Icon, action, hint }) => (
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
                {hint ?? (value === 0 ? "All clear" : "View →")}
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
              {plotsLoading ? (
                <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
                  Loading plots…
                </div>
              ) : plotsError ? (
                <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.terra, fontWeight: 600 }}>
                  {plotsError}
                </div>
              ) : unassignedPlots.length === 0 ? (
                <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
                  No unassigned plots.
                </div>
              ) : (
                unassignedPlots.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      padding: "0.6875rem 1rem",
                      borderBottom:
                        i < unassignedPlots.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "0.5625rem",
                        background: C.sageLight,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <LayoutGrid size={14} color={C.sage} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>
                        Plot {p.plot_number}
                      </div>
                      <div style={{ fontSize: "0.66rem", color: C.muted }}>
                        {p.garden_name}
                      </div>
                    </div>
                    {/* Opens modal with approved members (name + email) */}
                    <button
                      type="button"
                      onClick={() => void openAssignModal(p.id)}
                      style={{
                        background: C.amberLight,
                        color: C.amber,
                        border: "none",
                        borderRadius: "0.4375rem",
                        padding: "0.25rem 0.75rem",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
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

      </div>

      {/* Compose announcement modal — posts to Dashboard Community board only */}
      {showAnnForm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New announcement"
          onClick={() => {
            if (annPosting) return;
            setShowAnnForm(false);
            setAnnText("");
            setAnnError(null);
          }}
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
              width: "min(92%, 28rem)",
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
                New Announcement
              </h3>
              <button
                type="button"
                disabled={annPosting}
                onClick={() => {
                  setShowAnnForm(false);
                  setAnnText("");
                  setAnnError(null);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", color: C.muted }}>
                Posted to the Dashboard Community board. This screen does not list announcements.
              </p>
              {annError && (
                <div style={{ fontSize: "0.72rem", color: C.terra, fontWeight: 700 }}>
                  {annError}
                </div>
              )}
              <textarea
                value={annText}
                onChange={(e) => setAnnText(e.target.value)}
                placeholder="Write your announcement to the community…"
                disabled={annPosting}
                style={{ ...inputStyle, minHeight: "6rem", resize: "vertical",
                  fontFamily: "'Nunito', sans-serif" } as CSSProperties}
              />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
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
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Assign primary steward — creates PlotOwnership; list from GET /api/auth/users/ */}
      {assignPlotId != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Assign plot steward"
          onClick={closeAssignModal}
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
              width: "min(92%, 28rem)",
              maxHeight: "min(80vh, 36rem)",
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
                Assign Plot {assignPlot?.plot_number ?? ""}
              </h3>
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={closeAssignModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ padding: "0.875rem 1.25rem 0", fontSize: "0.72rem", color: C.muted }}>
              Choose an approved member as the primary steward.
              {assignPlot?.garden_name ? ` Garden: ${assignPlot.garden_name}.` : ""}
            </div>

            {assignError && (
              <div style={{ padding: "0.5rem 1.25rem 0", fontSize: "0.72rem", color: C.terra, fontWeight: 700 }}>
                {assignError}
              </div>
            )}
            {assignCandidatesError && (
              <div style={{ padding: "0.5rem 1.25rem 0", fontSize: "0.72rem", color: C.terra, fontWeight: 700 }}>
                {assignCandidatesError}
              </div>
            )}

            <div style={{ overflow: "auto", flex: 1, padding: "0.75rem 0" }}>
              {assignCandidatesLoading ? (
                <div style={{ padding: "1rem 1.25rem", fontSize: "0.8rem", color: C.muted }}>
                  Loading members…
                </div>
              ) : assignCandidates.length === 0 && !assignCandidatesError ? (
                <div style={{ padding: "1rem 1.25rem", fontSize: "0.8rem", color: C.muted }}>
                  No approved members available.
                </div>
              ) : (
                assignCandidates.map((user) => {
                  const selected = selectedAssigneeId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={assignSubmitting}
                      onClick={() => setSelectedAssigneeId(user.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.65rem 1.25rem",
                        border: "none",
                        borderBottom: `0.0625rem solid ${C.creamDark}`,
                        background: selected ? C.sageLight : "transparent",
                        cursor: "pointer",
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      <div style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        background: selected ? C.sage : C.creamDark,
                        color: selected ? C.white : C.brown,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {initialsFor(user)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>
                          {displayName(user)}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {user.email}
                        </div>
                      </div>
                      {selected && <UserCheck size={16} color={C.sage} />}
                    </button>
                  );
                })
              )}
            </div>

            <div style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "flex-end",
              padding: "0.875rem 1.25rem",
              borderTop: `0.0625rem solid ${C.border}`,
            }}>
              <button
                type="button"
                disabled={assignSubmitting}
                onClick={closeAssignModal}
                style={{
                  background: C.creamDark,
                  color: C.brownLight,
                  border: "none",
                  borderRadius: "0.5625rem",
                  padding: "0.5rem 0.875rem",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignSubmitting || selectedAssigneeId == null}
                onClick={() => void handleAssignPlot()}
                style={{
                  background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white,
                  border: "none",
                  borderRadius: "0.5625rem",
                  padding: "0.5rem 1.25rem",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: selectedAssigneeId == null || assignSubmitting ? "not-allowed" : "pointer",
                  opacity: selectedAssigneeId == null || assignSubmitting ? 0.6 : 1,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {assignSubmitting ? "Assigning…" : "Assign steward"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
