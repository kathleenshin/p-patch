import { ClipboardList, Newspaper } from "lucide-react";
import { C, serif, sans, mono } from "../theme";
import type { Screen } from "../types";
import { DayForecastWidget } from "../components/weather/DayForecastWidget";
import { WeekWeatherWidget } from "../components/weather/WeekWeatherWidget";
import { PlotGrid } from "../components/plot/PlotGrid";

const newsFeed = [
  { title: "Community Work Party — June 22", tag: "Event", tagColor: C.sage,
    body: "Join us Saturday 9am–noon. Tools provided, coffee too. All welcome!", time: "2d ago" },
  { title: "Frost Warning Advisory", tag: "Alert", tagColor: C.terra,
    body: "Low of 35°F expected Thursday night. Cover tender plants by Wednesday evening.", time: "1d ago" },
  { title: "Shared Plot Hits 100 lbs Donated!", tag: "Milestone", tagColor: C.amber,
    body: "The food bank plot crossed 100 lbs for the season. Incredible community effort.", time: "3h ago" },
  { title: "New Compost Drop-off Spot", tag: "Update", tagColor: C.lavender,
    body: "Kitchen scraps can now go in the new bin by the east gate, labeled green.", time: "5h ago" },
];

const topTask = {
  title: "Weeding — Zone A",
  desc: "Remove clover and crabgrass around raised beds in north zone.",
  assignee: "MK", aColor: C.sage, date: "Aug 14", urgency: "Active",
};

export function DashboardScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", background: C.cream, ...sans,
      justifyContent: "center" }}>
      <div className="dashboard-shell">
      {/* Main */}
      <div className="dashboard-main">
        {/* Grid header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
          <div className="img-icon img-icon-dashboard" role="img" aria-label="dashboard" />
          <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>
            Garden Plots
          </h1>
        </div>

        {/* Interactive plot grid */}
        <div style={{ marginBottom: "1.375rem" }}>
          <PlotGrid onNavigate={() => setScreen("plot")} />
        </div>

        {/* Newsfeed + Noname board — equal-width pair */}
        <div className="dashboard-feed-row">
          {[
            {
              title: "<Noname> board",
              Icon: Newspaper,
              emptyTitle: "No posts yet",
              emptyBody: "Share notes and updates with the community — posts will show up here.",
              emoji: "📝",
            },
            {
              title: "Newsfeed",
              Icon: Newspaper,
              emptyTitle: "No posts yet",
              emptyBody: "Garden news, events, and community updates will appear here once members start posting.",
              emoji: "🌱",
            },
          ].map(({ title, Icon, emptyTitle, emptyBody, emoji }) => (
            <div key={title} style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
                <div style={{ width: "1.875rem", height: "1.875rem", borderRadius: "0.5625rem",
                  background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={C.white} />
                </div>
                <h2 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                  {title}
                </h2>
              </div>
              <div style={{ background: C.card, border: `0.0938rem dashed ${C.border}`,
                borderRadius: "1.125rem", padding: "2.25rem 1.5rem", flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: "0.625rem", minHeight: "8.75rem" }}>
                <div style={{ fontSize: "2.2rem" }}>{emoji}</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: C.brownMid, ...serif }}>
                  {emptyTitle}
                </div>
                <div style={{ fontSize: "0.8rem", color: C.muted, textAlign: "center", maxWidth: "90%" }}>
                  {emptyBody}
                </div>
                <button style={{ marginTop: "0.25rem", background: C.sagePop, color: C.sage,
                  border: `0.0625rem solid ${C.sageMid}`, borderRadius: "0.625rem", padding: "0.4375rem 1rem",
                  fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif" }}>
                  + Post an update
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="dashboard-aside">

        {/* Weather */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <DayForecastWidget />
          <WeekWeatherWidget />
        </div>

        {/* Task board card */}
        <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`, borderRadius: "1.125rem",
          overflow: "hidden", height: "fit-content" }}>
          {/* Green header */}
          <div style={{ background: C.sage, padding: "0.625rem 1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
              <ClipboardList size={14} color={C.white} />
              <span style={{ color: C.white, fontWeight: 800, fontSize: "0.8rem" }}>Task Board</span>
            </div>
            <button onClick={() => setScreen("tasks")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "0.5rem",
                padding: "0.1875rem 0.625rem", color: C.white, fontSize: "0.7rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              View all →
            </button>
          </div>
          {/* Top task */}
          <div style={{ padding: "0.875rem 1rem" }}>
            <div style={{ fontSize: "0.65rem", color: C.muted, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem", ...mono }}>
              Top Task
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
              <span style={{ background: C.terra, color: C.white, fontSize: "0.6rem",
                fontWeight: 800, padding: "0.125rem 0.5rem", borderRadius: "1.25rem" }}>Active</span>
              <span style={{ fontSize: "0.68rem", color: C.muted, ...mono }}>Plot #5 · Aug 14</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: C.brown,
              marginBottom: "0.3125rem", ...serif }}>Weeding — Zone A</div>
            <div style={{ fontSize: "0.76rem", color: C.brownLight, lineHeight: 1.5,
              marginBottom: "0.625rem" }}>
              Remove clover and crabgrass around raised beds in the north zone.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", background: C.sage,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.white, fontWeight: 800, fontSize: "0.62rem" }}>MK</div>
              <span style={{ fontSize: "0.7rem", color: C.muted }}>Maria K.</span>
            </div>
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
