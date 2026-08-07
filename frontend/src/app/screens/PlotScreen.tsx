import { useState, type FormEvent } from "react";
import {
  ChevronRight,
  Plus,
  Pencil,
  MapPin,
  ArrowRight,
  ClipboardList,
  Users,
} from "lucide-react";
import { C, serif, sans, mono, linkStyle } from "../theme";
import type { Screen } from "../types";
import { DayForecastWidget } from "../components/weather/DayForecastWidget";
import { usePlots } from "../hooks/usePlots";
import { usePlotNotes } from "../hooks/usePlotNotes";
import plotBedIcon from "../../imports/PlotPageIcon.jpg";
import plotPhoto from "../../imports/PlotHeroImage.jpg";

export function PlotScreen({
  setScreen,
}: {
  setScreen: (s: Screen) => void;
}) {
  type NoteVisibility =
    | "this_plot"
    | "all_plots_in_garden"
    | "garden_members";

  const [activeTab, setActiveTab] = useState<
    "overview" | "notes" | "gallery" | "history"
  >("overview");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteVisibility, setNewNoteVisibility] =
    useState<NoteVisibility>("this_plot");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteSubmitError, setNoteSubmitError] = useState<string | null>(
    null
  );

  const { plots, plotsLoading, plotsError } = usePlots();

  const myPlot = plots.find(
    (plot) => plot.is_mine && plot.is_active
  );

  const {
    notes,
    notesLoading,
    notesError,
    createNote,
  } = usePlotNotes(myPlot?.id);

  const primaryOwner =
    myPlot?.owners.find((owner) => owner.is_primary) ??
    myPlot?.owners[0];

  const secondaryOwners =
    myPlot?.owners
      .filter((owner) => !owner.is_primary)
      .map((owner, index) => {
        const initials = owner.name
          .split(/[\s.@_-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("");

        const colors = [C.sage, "#B8A070", C.sky];

        return {
          initials,
          name: owner.name,
          color: colors[index % colors.length],
        };
      }) ?? [];

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "gallery", label: "Gallery" },
    { key: "history", label: "History" },
  ];

  const plotInfo = myPlot
    ? [
        {
          label: "Status",
          value: myPlot.is_active ? "Active" : "Inactive",
        },
        {
          label: "Owner",
          value: primaryOwner?.name ?? "No steward",
        },
        {
          label: "Garden",
          value: myPlot.garden_name,
        },
        {
          label: "Plot",
          value: `#${myPlot.plot_number}`,
        },
      ]
    : [];

  const quickActions = [
    { label: "Add Note", Icon: Plus },
    { label: "Upload Photo", Icon: Plus },
    { label: "View Plot on Map", Icon: MapPin },
    { label: "Print Plot Summary", Icon: ArrowRight },
  ];

  const visibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "this_plot":
        return "This plot";
      case "all_plots_in_garden":
        return "All plots in garden";
      case "garden_members":
        return "Garden members";
      default:
        return visibility;
    }
  };

  const resetNoteForm = () => {
    setShowNoteForm(false);
    setNewNoteContent("");
    setNewNoteVisibility("this_plot");
    setNoteSubmitError(null);
  };

  const handleSaveNote = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedContent = newNoteContent.trim();

    if (!trimmedContent) {
      setNoteSubmitError("Please enter note content before saving.");
      return;
    }

    setNoteSubmitting(true);
    setNoteSubmitError(null);

    try {
      await createNote(trimmedContent, newNoteVisibility);
      resetNoteForm();
    } catch (error) {
      setNoteSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save note."
      );
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (plotsLoading) {
    return (
      <div
        style={{
          flex: 1,
          padding: "2rem",
          background: C.cream,
          color: C.brown,
          ...sans,
        }}
      >
        Loading your plot...
      </div>
    );
  }

  if (plotsError) {
    return (
      <div
        style={{
          flex: 1,
          padding: "2rem",
          background: C.cream,
          color: C.terra,
          ...sans,
        }}
      >
        {plotsError}
      </div>
    );
  }

  if (!myPlot) {
    return (
      <div
        style={{
          flex: 1,
          padding: "2rem",
          background: C.cream,
          color: C.brown,
          ...sans,
        }}
      >
        No active plot is assigned to your account.
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: C.cream,
        ...sans,
      }}
    >
      <div className="page-content">
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3125rem",
            marginBottom: "0.75rem",
            fontSize: "0.74rem",
            color: C.muted,
          }}
        >
          <button
            onClick={() => setScreen("dashboard")}
            style={{
              ...linkStyle,
              color: C.sage,
              fontWeight: 700,
              fontSize: "0.74rem",
            }}
          >
            Plots
          </button>

          <ChevronRight size={11} color={C.muted} />

          <span>{myPlot.garden_name}</span>

          <ChevronRight size={11} color={C.muted} />

          <span
            style={{
              color: C.brownMid,
              fontWeight: 700,
            }}
          >
            Plot #{myPlot.plot_number}
          </span>
        </div>

        {/* Outer 2-column layout */}
        <div className="plot-detail-layout">
          {/* LEFT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "0.625rem 0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                }}
              >
                <img
                  src={plotBedIcon}
                  alt="garden plot"
                  style={{
                    height: "3.2rem",
                    width: "3.2rem",
                    display: "block",
                    objectFit: "cover",
                    borderRadius: "0.5rem",
                    flexShrink: 0,
                  }}
                />

                <div>
                  <div
                    style={{
                      ...serif,
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: C.brown,
                      lineHeight: 1.1,
                    }}
                  >
                    Plot #{myPlot.plot_number}
                  </div>

                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: C.brownLight,
                      fontWeight: 600,
                      marginTop: "0.1875rem",
                      ...sans,
                    }}
                  >
                    Steward: {primaryOwner?.name ?? "No steward"}
                  </div>
                </div>
              </div>

              <button
                style={{
                  background: C.white,
                  border: `0.0625rem solid ${C.border}`,
                  borderRadius: "0.5625rem",
                  padding: "0.4375rem 1rem",
                  color: C.brownMid,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  boxShadow:
                    "0 0.0625rem 0.25rem rgba(44,31,20,0.08)",
                }}
              >
                <Pencil size={12} /> Edit Plot
              </button>
            </div>

            {/* Hero photo */}
            <div
              style={{
                borderRadius: "0.875rem",
                overflow: "hidden",
                border: `0.0625rem solid ${C.border}`,
                aspectRatio: "16/5",
                boxShadow:
                  "0 0.125rem 0.625rem rgba(44,31,20,0.08)",
              }}
            >
              <img
                src={plotPhoto}
                alt="Garden plot"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 40%",
                  display: "block",
                }}
              />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5625rem 1rem",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    fontFamily: "'Nunito', sans-serif",
                    color:
                      activeTab === tab.key
                        ? C.sage
                        : C.muted,
                    borderBottom:
                      activeTab === tab.key
                        ? `0.125rem solid ${C.sage}`
                        : "0.125rem solid transparent",
                    transition:
                      "color 0.12s, border-color 0.12s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Plot Info + Notes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 3fr",
                gap: "0.875rem",
              }}
            >
              {/* Plot Info */}
              <div
                style={{
                  background: C.card,
                  border: `0.0625rem solid ${C.border}`,
                  borderRadius: "0.8125rem",
                  padding: "0.875rem 1rem",
                  boxShadow:
                    "0 0.0625rem 0.25rem rgba(44,31,20,0.05)",
                }}
              >
                <h3
                  style={{
                    ...serif,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: C.brown,
                    margin: "0 0 0.625rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <ClipboardList size={13} color={C.sage} />
                  Plot Info
                </h3>

                {plotInfo.map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      padding: "0.375rem 0",
                      borderBottom: `0.0625rem solid ${C.creamDark}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.58rem",
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        ...mono,
                        marginBottom: "0.125rem",
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: C.brown,
                        fontWeight: 600,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div
                style={{
                  background: C.card,
                  border: `0.0625rem solid ${C.border}`,
                  borderTop: `0.1875rem solid ${C.sage}`,
                  borderRadius: "0.8125rem",
                  padding: "0.875rem 1rem",
                  boxShadow:
                    "0 0.0625rem 0.25rem rgba(44,31,20,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                  }}
                >
                  <h3
                    style={{
                      ...serif,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: C.brown,
                      margin: 0,
                    }}
                  >
                    Plot Notes
                  </h3>

                  <button
                    onClick={() => {
                      setShowNoteForm((prev) => !prev);
                      setNoteSubmitError(null);
                    }}
                    style={{
                      background: C.sagePop,
                      color: C.sage,
                      border: `0.0625rem solid ${C.sageMid}`,
                      borderRadius: "0.4375rem",
                      padding: "0.1875rem 0.5625rem",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.1875rem",
                    }}
                  >
                    <Plus size={10} /> Add Note
                  </button>
                </div>

                {showNoteForm ? (
                  <form
                    onSubmit={handleSaveNote}
                    style={{
                      marginBottom: "0.75rem",
                      padding: "0.75rem",
                      background: C.cream,
                      border: `0.0625rem solid ${C.border}`,
                      borderRadius: "0.6875rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <textarea
                      value={newNoteContent}
                      onChange={(event) => {
                        setNewNoteContent(event.target.value);
                        if (noteSubmitError) {
                          setNoteSubmitError(null);
                        }
                      }}
                      placeholder="Write a note about this plot..."
                      rows={4}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        minHeight: "5rem",
                        borderRadius: "0.5rem",
                        border: `0.0625rem solid ${C.border}`,
                        padding: "0.5rem 0.625rem",
                        background: C.white,
                        color: C.brown,
                        fontSize: "0.8rem",
                        lineHeight: 1.45,
                        ...sans,
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          color: C.brownMid,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                        }}
                      >
                        Visibility
                        <select
                          value={newNoteVisibility}
                          onChange={(event) =>
                            setNewNoteVisibility(
                              event.target
                                .value as NoteVisibility
                            )
                          }
                          style={{
                            border: `0.0625rem solid ${C.border}`,
                            borderRadius: "0.4375rem",
                            padding: "0.25rem 0.375rem",
                            background: C.white,
                            color: C.brown,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            ...sans,
                          }}
                        >
                          <option value="this_plot">
                            This plot
                          </option>
                          <option value="all_plots_in_garden">
                            All plots in garden
                          </option>
                          <option value="garden_members">
                            Garden members
                          </option>
                        </select>
                      </label>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        <button
                          type="submit"
                          disabled={noteSubmitting}
                          style={{
                            background: C.sagePop,
                            color: C.sage,
                            border: `0.0625rem solid ${C.sageMid}`,
                            borderRadius: "0.4375rem",
                            padding: "0.25rem 0.625rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: noteSubmitting
                              ? "not-allowed"
                              : "pointer",
                            opacity: noteSubmitting ? 0.7 : 1,
                            fontFamily: "'Nunito', sans-serif",
                          }}
                        >
                          {noteSubmitting
                            ? "Saving..."
                            : "Save"}
                        </button>

                        <button
                          type="button"
                          disabled={noteSubmitting}
                          onClick={resetNoteForm}
                          style={{
                            background: C.white,
                            color: C.brownMid,
                            border: `0.0625rem solid ${C.border}`,
                            borderRadius: "0.4375rem",
                            padding: "0.25rem 0.625rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: noteSubmitting
                              ? "not-allowed"
                              : "pointer",
                            opacity: noteSubmitting ? 0.7 : 1,
                            fontFamily: "'Nunito', sans-serif",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {noteSubmitError ? (
                      <div
                        style={{
                          color: C.terra,
                          fontSize: "0.74rem",
                        }}
                      >
                        {noteSubmitError}
                      </div>
                    ) : null}
                  </form>
                ) : null}

                {notesLoading ? (
                  <div
                    style={{
                      color: C.muted,
                      fontSize: "0.8rem",
                      padding: "0.5rem 0",
                    }}
                  >
                    Loading notes...
                  </div>
                ) : notesError ? (
                  <div
                    style={{
                      color: C.terra,
                      fontSize: "0.8rem",
                      padding: "0.5rem 0",
                    }}
                  >
                    {notesError}
                  </div>
                ) : notes.length === 0 ? (
                  <div
                    style={{
                      color: C.muted,
                      fontSize: "0.8rem",
                      padding: "0.5rem 0",
                    }}
                  >
                    No notes yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.625rem",
                    }}
                  >
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        style={{
                          background: C.cream,
                          border: `0.0625rem solid ${C.border}`,
                          borderRadius: "0.6875rem",
                          padding: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: C.brown,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {note.content}
                        </div>

                        <div
                          style={{
                            marginTop: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: C.muted,
                            }}
                          >
                            {note.author} ·{" "}
                            {new Date(
                              note.created_at
                            ).toLocaleDateString()}
                          </div>

                          <span
                            style={{
                              background: C.sagePop,
                              color: C.sageDark,
                              borderRadius: "1rem",
                              padding: "0.125rem 0.4375rem",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                            }}
                          >
                            {visibilityLabel(note.visibility)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
          >
            {/* Weather */}
            <DayForecastWidget showWeekLink />

            {/* Secondary Owners */}
            <div
              style={{
                background: C.card,
                border: `0.0625rem solid ${C.border}`,
                borderRadius: "0.8125rem",
                padding: "0.75rem 0.875rem",
                boxShadow:
                  "0 0.0625rem 0.25rem rgba(44,31,20,0.05)",
              }}
            >
              <h3
                style={{
                  ...serif,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: C.brown,
                  margin: "0 0 0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3125rem",
                }}
              >
                <Users size={12} color={C.sage} />
                Secondary Stewards
              </h3>

              {secondaryOwners.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.375rem",
                  }}
                >
                  {secondaryOwners.map((owner) => (
                    <div
                      key={owner.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4375rem",
                      }}
                    >
                      <div
                        style={{
                          width: "1.625rem",
                          height: "1.625rem",
                          borderRadius: "50%",
                          background: owner.color,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.white,
                          fontWeight: 800,
                          fontSize: "0.6rem",
                        }}
                      >
                        {owner.initials}
                      </div>

                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          color: C.brown,
                        }}
                      >
                        {owner.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: C.muted,
                  }}
                >
                  No secondary stewards.
                </div>
              )}

              <button
                style={{
                  marginTop: "0.5rem",
                  width: "100%",
                  background: C.creamDark,
                  border: "none",
                  borderRadius: "0.4375rem",
                  padding: "0.3125rem 0.5rem",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: C.brownLight,
                  cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Manage stewards
              </button>
            </div>
            {/* Quick Actions */}
            <div
              style={{
                background: C.card,
                border: `0.0625rem solid ${C.border}`,
                borderRadius: "0.8125rem",
                padding: "0.75rem 0.875rem",
                boxShadow:
                  "0 0.0625rem 0.25rem rgba(44,31,20,0.05)",
              }}
            >
              <h3
                style={{
                  ...serif,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: C.brown,
                  margin: "0 0 0.375rem",
                }}
              >
                Quick Actions
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {quickActions.map(({ label, Icon }) => (
                  <button
                    key={label}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0.3125rem 0",
                      textAlign: "left",
                      cursor: "pointer",
                      color: C.sage,
                      fontSize: "0.73rem",
                      fontWeight: 600,
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      borderBottom: `0.0625rem solid ${C.creamDark}`,
                    }}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}