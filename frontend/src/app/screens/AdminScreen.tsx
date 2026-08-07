import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Users, LayoutGrid, ClipboardList, Archive, AlertTriangle,
  ChevronRight, Plus, Check, Newspaper, Package,
} from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";
import type { Screen } from "../types";
import { useAuth } from "../auth/AuthContext";
import { usePlots } from "../hooks/usePlots";
import {
  approveUser,
  fetchPendingUsers,
  rejectUser,
} from "@/lib/adminApi";
import type { AuthUser } from "@/lib/authApi";
import { ApiError } from "@/lib/api";

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

export function AdminScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { accessToken } = useAuth();
  const { plots, plotsLoading, plotsError } = usePlots();

  const unassignedPlots = plots.filter(
    (plot) => plot.is_active && plot.owners.length === 0
  );

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annText, setAnnText] = useState("");

  // Live pending registrations (other Admin panels stay mock for now).
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<number | null>(null);

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

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

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

  const statCards = [
    // First card reflects the live pending queue length.
    { label: "Pending Registrations", value: pendingUsers.length, color: C.terra,    Icon: Users,         action: () => {} },
    { label: "Unassigned Plots",      value: unassignedPlots.length, color: C.amber, Icon: LayoutGrid,   action: () => {} },
    { label: "Unclaimed Tasks",        value: 2, color: C.lavender, Icon: ClipboardList, action: () => setScreen("tasks") },
    { label: "Inventory Alerts",       value: 1, color: C.sky,     Icon: Archive,       action: () => setScreen("inventory") },
    { label: "Flagged Content",        value: 0, color: C.sage,    Icon: AlertTriangle, action: () => {} },
  ];

  const helpRequests = [
    { title: "Repair the north fence",  date: "September 15, 2025", urgent: true  },
    { title: "Water shared flower bed", date: "October 2, 2025",    urgent: false },
  ];

  const inventoryAlerts = [
    { item: "Wheelbarrow",        qty: 0, label: "Out of stock" },
    { item: "Organic Fertilizer", qty: 2, label: "Low stock"    },
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
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer",
      color: C.sage, fontSize: "0.7rem", fontWeight: 700,
      fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", gap: "0.1875rem" }}>
      View all <ChevronRight size={12} />
    </button>
  );

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
            <button key={label} onClick={action}
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
          {panel("Pending Registrations", <Users size={13} color={C.sage} />, viewAll(), (
            <div>
              {pendingLoading && (
                <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
                  Loading pending registrations…
                </div>
              )}
              {!pendingLoading && pendingError && (
                <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.terra, fontWeight: 600 }}>
                  {pendingError}
                </div>
              )}
              {!pendingLoading && !pendingError && pendingUsers.length === 0 && (
                <div style={{ padding: "1rem", fontSize: "0.8rem", color: C.muted }}>
                  No pending registrations.
                </div>
              )}
              {!pendingLoading &&
                pendingUsers.map((user, i) => {
                  const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
                  const busy = actionUserId === user.id;
                  return (
                    <div
                      key={user.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.6875rem 1rem",
                        borderBottom:
                          i < pendingUsers.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "2rem",
                          height: "2rem",
                          borderRadius: "50%",
                          background: color,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.white,
                          fontWeight: 800,
                          fontSize: "0.64rem",
                        }}
                      >
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
                          style={{
                            background: C.sageLight,
                            color: C.sageDark,
                            border: "none",
                            borderRadius: "0.4375rem",
                            padding: "0.25rem 0.625rem",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            cursor: busy ? "wait" : "pointer",
                            opacity: busy ? 0.7 : 1,
                            fontFamily: "'Nunito', sans-serif",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReject(user.id)}
                          style={{
                            background: C.terraLight,
                            color: C.terra,
                            border: "none",
                            borderRadius: "0.4375rem",
                            padding: "0.25rem 0.625rem",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            cursor: busy ? "wait" : "pointer",
                            opacity: busy ? 0.7 : 1,
                            fontFamily: "'Nunito', sans-serif",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}

          {panel("Unassigned Plots", <LayoutGrid size={13} color={C.sage} />, viewAll(), (
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
                    <button
                      disabled
                      title="Plot assignment is not implemented yet"
                      style={{
                        background: C.amberLight,
                        color: C.amber,
                        border: "none",
                        borderRadius: "0.4375rem",
                        padding: "0.25rem 0.75rem",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        cursor: "not-allowed",
                        opacity: 0.6,
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

          {panel("Unclaimed Help Requests", <AlertTriangle size={13} color={C.sage} />, viewAll(() => setScreen("tasks")), (
            <div>
              {helpRequests.map((h, i) => (
                <div
                  key={h.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.6875rem 1rem",
                    borderBottom:
                      i < helpRequests.length - 1 ? `0.0625rem solid ${C.creamDark}` : "none",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown, marginBottom: "0.125rem" }}>
                      {h.title}
                    </div>
                    <div style={{ fontSize: "0.66rem", color: C.muted, ...mono }}>
                      {h.date}
                    </div>
                  </div>
                  <span
                    style={{
                      background: h.urgent ? C.terraLight : C.amberLight,
                      color: h.urgent ? C.terra : C.amber,
                      fontSize: "0.64rem",
                      fontWeight: 800,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "1.25rem",
                    }}
                  >
                    {h.urgent ? "Urgent" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {panel("Inventory Alerts", <Archive size={13} color={C.sage} />, viewAll(() => setScreen("inventory")), (
            <div>
              {inventoryAlerts.map((a, i) => (
                <div
                  key={a.item}
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
                      background: a.qty === 0 ? C.terraLight : C.amberLight,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Package size={14} color={a.qty === 0 ? C.terra : C.amber} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.brown }}>
                      {a.item}
                    </div>
                    <div style={{ fontSize: "0.66rem", color: C.muted }}>
                      Qty: {a.qty}
                    </div>
                  </div>
                  <span
                    style={{
                      background: a.qty === 0 ? C.terraLight : C.amberLight,
                      color: a.qty === 0 ? C.terra : C.amber,
                      fontSize: "0.64rem",
                      fontWeight: 800,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "1.25rem",
                    }}
                  >
                    {a.label}
                  </span>
                </div>
              ))}
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
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.brown }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: C.muted, ...mono }}>
                        {a.when}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: C.brownLight, lineHeight: 1.4 }}>
                    {a.sub}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Community Announcements */}
        {panel("Community Announcements", <Newspaper size={13} color={C.sage} />,
          <button onClick={() => setShowAnnForm(v => !v)}
            style={{ background: C.sage, color: C.white, border: "none",
              borderRadius: "0.4375rem", padding: "0.25rem 0.75rem", fontSize: "0.7rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "'Nunito', sans-serif",
              display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Plus size={11} /> New Announcement
          </button>,
          <div style={{ padding: "0.875rem 1rem" }}>
            {showAnnForm ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <textarea value={annText} onChange={e => setAnnText(e.target.value)}
                  placeholder="Write your announcement to the community…"
                  style={{ ...inputStyle, minHeight: "4.5rem", resize: "vertical",
                    fontFamily: "'Nunito', sans-serif" } as CSSProperties} />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => { setShowAnnForm(false); setAnnText(""); }}
                    style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                      color: C.white, border: "none", borderRadius: "0.5625rem", padding: "0.5rem 1.25rem",
                      fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif" }}>
                    Post
                  </button>
                  <button onClick={() => setShowAnnForm(false)}
                    style={{ background: C.creamDark, color: C.brownLight, border: "none",
                      borderRadius: "0.5625rem", padding: "0.5rem 0.875rem", fontWeight: 700, fontSize: "0.8rem",
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
                <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", background: C.sagePop,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Newspaper size={18} color={C.sage} />
                </div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.brownMid }}>
                    No announcements yet
                  </div>
                  <div style={{ fontSize: "0.72rem", color: C.muted }}>
                    Click "New Announcement" to post one for all members.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}