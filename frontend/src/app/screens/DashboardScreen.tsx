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
  assignee: "MK",
  aColor: C.sage,
  date: "Aug 14",
  urgency: "Active",
};

export function DashboardScreen({
  setScreen,
  setSelectedPlotId,
}: {
  setScreen: (s: Screen) => void;
  setSelectedPlotId: (plotId: number) => void;
}) {
  const { isApproved } = useAuth();
  const { plots, plotsLoading, plotsError } = usePlots();

  const plotData: PlotInfo[] = plots
    .map((plot) => {
      const primaryOwner =
        plot.owners.find((owner) => owner.is_primary) ??
        plot.owners[0];

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

          {/* Community news — full width of main column */}
          <div className="dashboard-feed-row">
            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.875rem",
                }}
              >
                <div
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    borderRadius: "0.5625rem",
                    background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Newspaper size={15} color={C.white} />
                </div>

                <h2
                  style={{
                    ...serif,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: C.brown,
                    margin: 0,
                  }}
                >
                  Community news
                </h2>
              </div>

              <div
                style={{
                  background: C.card,
                  border: `0.0625rem solid ${C.border}`,
                  borderRadius: "1.125rem",
                  overflow: "hidden",
                }}
              >
                {newsFeed.map((item, i) => (
                  <div
                    key={item.title}
                    style={{
                      padding: "0.875rem 1rem",
                      borderTop:
                        i === 0
                          ? "none"
                          : `0.0625rem solid ${C.creamDark}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          background: `${item.tagColor}18`,
                          color: item.tagColor,
                          fontSize: "0.62rem",
                          fontWeight: 800,
                          padding: "0.125rem 0.5rem",
                          borderRadius: "1.25rem",
                        }}
                      >
                        {item.tag}
                      </span>

                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: C.muted,
                          ...mono,
                        }}
                      >
                        {item.time}
                      </span>
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: C.brown,
                        marginBottom: "0.25rem",
                        ...serif,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: C.brownLight,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.body}
                    </div>
                  </div>
                ))}
              </div>
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

          {/* Task board — approved members only */}
          {isApproved && (
            <div
              style={{
                background: C.card,
                border: `0.0625rem solid ${C.border}`,
                borderRadius: "1.125rem",
                overflow: "hidden",
                height: "fit-content",
              }}
            >
              {/* Green header */}
              <div
                style={{
                  background: C.sage,
                  padding: "0.625rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4375rem",
                  }}
                >
                  <ClipboardList size={14} color={C.white} />
                  <span
                    style={{
                      color: C.white,
                      fontWeight: 800,
                      fontSize: "0.8rem",
                    }}
                  >
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
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: C.muted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "0.5rem",
                    ...mono,
                  }}
                >
                  Top Task
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    marginBottom: "0.375rem",
                  }}
                >
                  <span
                    style={{
                      background: C.terra,
                      color: C.white,
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "1.25rem",
                    }}
                  >
                    {topTask.urgency}
                  </span>

                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: C.muted,
                      ...mono,
                    }}
                  >
                    Plot #5 · {topTask.date}
                  </span>
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: C.brown,
                    marginBottom: "0.3125rem",
                    ...serif,
                  }}
                >
                  {topTask.title}
                </div>

                <div
                  style={{
                    fontSize: "0.76rem",
                    color: C.brownLight,
                    lineHeight: 1.5,
                    marginBottom: "0.625rem",
                  }}
                >
                  {topTask.desc}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
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
                    }}
                  >
                    {topTask.assignee}
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: C.muted,
                    }}
                  >
                    Maria K.
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}