import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Newspaper } from "lucide-react";
import { C, serif, sans, mono } from "../theme";
import type { Screen } from "../types";
import { DayForecastWidget } from "../components/weather/DayForecastWidget";
import { WeekWeatherWidget } from "../components/weather/WeekWeatherWidget";
import { PlotGrid } from "../components/plot/PlotGrid";
import type { PlotInfo } from "../components/plot/types";
import dashboardIcon from "../../imports/DashboardHouseIcon.jpg";
import { useAuth } from "../auth/AuthContext";
import { usePlots } from "../hooks/usePlots";
import { ApiError } from "@/lib/api";
// Community news — posts are authored from Admin (30-day retention on server).
import {
  fetchAnnouncements,
  type Announcement,
} from "@/lib/announcementsApi";

const topTask = {
  title: "Weeding — Zone A",
  desc: "Remove clover and crabgrass around raised beds in north zone.",
  assignee: "MK",
  aColor: C.sage,
  date: "Aug 14",
  urgency: "Active",
};

/** Relative time for Community news timestamps. */
function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Avatar initials from author_name (or email fallback). */
function initialsForAnnouncement(a: Announcement): string {
  const parts = a.author_name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return (a.author_name[0] || a.author_email[0] || "?").toUpperCase();
}

export function DashboardScreen({
  setScreen,
  setSelectedPlotId,
}: {
  setScreen: (s: Screen) => void;
  setSelectedPlotId: (plotId: number) => void;
}) {
  const { accessToken, isApproved, isGardenAdmin } = useAuth();
  const { plots, plotsLoading, plotsError } = usePlots();

  const plotData: PlotInfo[] = plots.map((plot) => {
    const primaryOwner =
      plot.owners.find((owner) => owner.is_primary) ?? plot.owners[0];

    return {
      id: plot.id,
      plotNumber: plot.plot_number,
      needsHelp: plot.has_open_help_request,
      owner: primaryOwner?.name,
      since: primaryOwner?.start_date ?? undefined,
      state: plot.is_mine
        ? "mine"
        : plot.has_open_help_request
          ? "help-needed"
          : plot.owners.length === 0
            ? "available"
            : "active",
    };
  });

  // Live Community news posts (authored from Admin; server drops posts older than 30 days).
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    // Wait for JWT — list requires IsAuthenticated.
    if (!accessToken) {
      setAnnouncements([]);
      setAnnouncementsLoading(false);
      return;
    }
    setAnnouncementsLoading(true);
    setAnnouncementsError(null);
    try {
      const posts = await fetchAnnouncements(accessToken);
      setAnnouncements(posts);
    } catch (err) {
      setAnnouncements([]);
      setAnnouncementsError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load community posts.",
      );
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [accessToken]);

  // Reload when the access token appears or rotates.
  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        background: C.cream,
        ...sans,
        justifyContent: "center",
      }}
    >
      <div className="dashboard-shell">
        {/* Main */}
        <div className="dashboard-main">
          {/* Grid header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              marginBottom: "0.75rem",
            }}
          >
            <img
              src={dashboardIcon}
              alt="dashboard"
              style={{
                height: "2rem",
                width: "2rem",
                objectFit: "cover",
                borderRadius: "0.5rem",
                display: "block",
                flexShrink: 0,
              }}
            />

            <h1
              style={{
                ...serif,
                fontSize: "1.5rem",
                fontWeight: 700,
                color: C.brown,
                margin: 0,
              }}
            >
              Garden Plots
            </h1>
          </div>

          {/* Interactive plot grid */}
          <div style={{ marginBottom: "1.375rem" }}>
            {plotsLoading ? (
              <div>Loading plots...</div>
            ) : plotsError ? (
              <div>{plotsError}</div>
            ) : (
              <PlotGrid
                plots={plotData}
                onNavigate={(plotId) => {
                  setSelectedPlotId(plotId);
                  setScreen("plot");
                }}
                hideOwnerNames={!isApproved}
              />
            )}
          </div>

          {/* Community news — full width of main column (Newsfeed removed). */}
          <div className="dashboard-feed-row">
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
                <div style={{
                  width: "1.875rem",
                  height: "1.875rem",
                  borderRadius: "0.5625rem",
                  background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Newspaper size={15} color={C.white} />
                </div>
                <h2 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                  Community news
                </h2>
              </div>

              {announcementsLoading ? (
                <div style={{
                  background: C.card,
                  border: `0.0625rem solid ${C.border}`,
                  borderRadius: "1.125rem",
                  padding: "2rem 1.5rem",
                  flex: 1,
                  fontSize: "0.8rem",
                  color: C.muted,
                  minHeight: "8.75rem",
                }}>
                  Loading posts…
                </div>
              ) : announcementsError ? (
                <div style={{
                  background: C.card,
                  border: `0.0625rem solid ${C.border}`,
                  borderRadius: "1.125rem",
                  padding: "2rem 1.5rem",
                  flex: 1,
                  fontSize: "0.8rem",
                  color: C.terra,
                  fontWeight: 600,
                  minHeight: "8.75rem",
                }}>
                  {announcementsError}
                </div>
              ) : announcements.length === 0 ? (
                // Empty board — posting is Admin-only; members just wait for updates.
                <div style={{
                  background: C.card,
                  border: `0.0938rem dashed ${C.border}`,
                  borderRadius: "1.125rem",
                  padding: "2.25rem 1.5rem",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.625rem",
                  minHeight: "8.75rem",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: C.brownMid, ...serif }}>
                    No posts yet
                  </div>
                  <div style={{ fontSize: "0.8rem", color: C.muted, textAlign: "center", maxWidth: "90%" }}>
                    {isGardenAdmin
                      ? "Post an update from Admin → New Announcement."
                      : "Garden admins share notes and updates here."}
                  </div>
                  {isGardenAdmin && (
                    <button
                      type="button"
                      onClick={() => setScreen("admin")}
                      style={{
                        marginTop: "0.25rem",
                        background: C.sagePop,
                        color: C.sage,
                        border: `0.0625rem solid ${C.sageMid}`,
                        borderRadius: "0.625rem",
                        padding: "0.4375rem 1rem",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      + Post an update
                    </button>
                  )}
                </div>
              ) : (
                // Newest-first feed from GET /api/announcements/ (stale posts already purged).
                <div style={{
                  background: C.card,
                  border: `0.0625rem solid ${C.border}`,
                  borderRadius: "1.125rem",
                  overflow: "hidden",
                  flex: 1,
                }}>
                  {announcements.map((post, i) => (
                    <div
                      key={post.id}
                      style={{
                        padding: "0.875rem 1rem",
                        borderTop: i === 0 ? "none" : `0.0625rem solid ${C.creamDark}`,
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                          <div style={{
                            width: "1.75rem",
                            height: "1.75rem",
                            borderRadius: "50%",
                            background: C.sage,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.white,
                            fontWeight: 800,
                            fontSize: "0.6rem",
                          }}>
                            {initialsForAnnouncement(post)}
                          </div>
                          <span style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: C.brown,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {post.author_name}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.65rem", color: C.muted, ...mono, flexShrink: 0 }}>
                          {formatRelativeTime(post.created_at)}
                        </span>
                      </div>
                      {/* Preserve line breaks from the Admin textarea */}
                      <div style={{
                        fontSize: "0.8rem",
                        color: C.brownLight,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}>
                        {post.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="dashboard-aside">
          {/* Weather */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            <DayForecastWidget />
            <WeekWeatherWidget />
          </div>

          {/* Task board — approved members only (pending users cannot open Tasks). */}
          {isApproved && (
            <div style={{
              background: C.card,
              border: `0.0625rem solid ${C.border}`,
              borderRadius: "1.125rem",
              overflow: "hidden",
              height: "fit-content",
            }}>
              {/* Green header */}
              <div style={{
                background: C.sage,
                padding: "0.625rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
                  <ClipboardList size={14} color={C.white} />
                  <span style={{ color: C.white, fontWeight: 800, fontSize: "0.8rem" }}>
                    Task Board
                  </span>
                </div>
                <button
                  onClick={() => setScreen("tasks")}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.1875rem 0.625rem",
                    color: C.white,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  View all →
                </button>
              </div>
              {/* Top task */}
              <div style={{ padding: "0.875rem 1rem" }}>
                <div style={{
                  fontSize: "0.65rem",
                  color: C.muted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.5rem",
                  ...mono,
                }}>
                  Top Task
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  marginBottom: "0.375rem",
                }}>
                  <span style={{
                    background: C.terra,
                    color: C.white,
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    padding: "0.125rem 0.5rem",
                    borderRadius: "1.25rem",
                  }}>
                    {topTask.urgency}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: C.muted, ...mono }}>
                    Plot #5 · {topTask.date}
                  </span>
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: C.brown,
                  marginBottom: "0.3125rem",
                  ...serif,
                }}>
                  {topTask.title}
                </div>
                <div style={{
                  fontSize: "0.76rem",
                  color: C.brownLight,
                  lineHeight: 1.5,
                  marginBottom: "0.625rem",
                }}>
                  {topTask.desc}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "50%",
                    background: topTask.aColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.white,
                    fontWeight: 800,
                    fontSize: "0.62rem",
                  }}>
                    {topTask.assignee}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: C.muted }}>Maria K.</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
