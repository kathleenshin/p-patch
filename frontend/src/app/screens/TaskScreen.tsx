import { useEffect, useState, type CSSProperties } from "react";
import { Plus, X } from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { invalidatePlotsCache, usePlots } from "../hooks/usePlots";
import taskIcon from "../../imports/TaskPageIcon.jpg";

import {
  claimHelpRequest,
  completeHelpRequest,
  createHelpRequest,
  deleteHelpRequest,
  fetchHelpRequests,
  fetchUsers,
  unclaimHelpRequest,
  type HelpRequest,
  type UserOption,
} from "../../lib/helpRequestsApi";


interface Task { id: number | string; title: string; desc: string; assignee: string; aColor: string; date: string; priority?: string; }
interface Column { id: string; label: string; accent: string; tasks: Task[]; }

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const categoryOptions = [
  { value: "maintenance", label: "Maintenance" },
  { value: "watering", label: "Watering" },
  { value: "cleanup", label: "Cleanup" },
  { value: "gardening", label: "Gardening" },
  { value: "other", label: "Other" },
] as const;

const initialColumns: Column[] = [
  { id: "active", label: "Unclaimed", accent: C.terra, tasks: [] },
  { id: "pending", label: "Claimed", accent: C.amber, tasks: [] },
  { id: "done", label: "Done", accent: C.sage, tasks: [] },
];

export function TaskScreen() {
  const { accessToken, isGardenAdmin, user } = useAuth();
  const { plots } = usePlots();
  const [columns] = useState(initialColumns);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [showCompleteSuccess, setShowCompleteSuccess] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const colBg: Record<string, string> = { active: "#FFF4F0", pending: "#FFFBEE", done: "#F2FAF2" };
  const requestColumnMap: Record<string, string> = {
    active: "active",
    pending: "pending",
    done: "done",
  };
  const statusColor: Record<string, string> = {
    active: C.terra,
    pending: C.amber,
    done: C.sage,
  };
  const statusLabel: Record<string, string> = {
    active: "Unclaimed",
    pending: "Claimed",
    done: "Complete",
  };

  const loadRequests = async () => {
    if (!accessToken) {
      setRequests([]);
      return;
    }

    try {
      const data = await fetchHelpRequests(accessToken);
      setRequests(data);
    } catch {
      setError("Unable to load help requests.");
    }
  };

  const loadUsers = async () => {
    if (!accessToken) {
      setUsers([]);
      return;
    }

    try {
      const data = await fetchUsers(accessToken);
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  const getUserLabel = (userId: number | null | undefined, fallback = "Unassigned") => {
    if (!userId) {
      return fallback;
    }

    const user = users.find((option) => option.id === userId);
    if (!user) {
      return `User #${userId}`;
    }

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    return displayName || user.email;
  };

  const getPlotNumberLabel = (plotId: number | null | undefined) => {
    if (!plotId) {
      return "No Plot";
    }

    const plot = plots.find((item) => item.id === plotId);
    return plot ? `Plot #${plot.plot_number}` : "Plot (number unavailable)";
  };

  const getPriorityLabel = (value: string) =>
    priorityOptions.find((option) => option.value === value)?.label ?? value;

  const getCategoryLabel = (value: string) =>
    categoryOptions.find((option) => option.value === value)?.label ?? value;

  const getStatusDisplayText = (request: HelpRequest) => {
    if (request.status === "active") {
      return "Unclaimed";
    }

    if (request.status === "done") {
      return "Complete";
    }

    if (request.status === "pending" && request.assigned_to === user?.id) {
      return "Claimed by you";
    }

    if (request.status === "pending" && request.assigned_to != null) {
      return "Claimed";
    }

    return statusLabel[request.status] ?? request.status;
  };

  useEffect(() => {
    void loadRequests();
    void loadUsers();
  }, [accessToken]);

  const handleCreateRequest = async () => {
    if (!accessToken) {
      setCreateError("Please log in to create help requests.");
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    setSuccess(null);

    try {
      const activeUserPlot = plots.find(
        (plot) => plot.is_mine && plot.is_active
      );
      if (!activeUserPlot) {
        setCreateError("No active plot is associated with your account.");
        return;
      }

      const data = await createHelpRequest(accessToken, {
        title,
        description,
        garden: activeUserPlot.garden,
        plot: activeUserPlot.id,
        priority,
        category,
        due_date: dueDate || null,
        assigned_to: null,
      });

      setRequests((current) => [data, ...current]);
      invalidatePlotsCache();
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategory("other");
      setDueDate("");
      setCreateError(null);
      setShowNew(false);
      setSuccess("Help request created.");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create the help request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimRequest = async (requestId: number) => {
    if (!accessToken) {
      setError("Please log in to claim help requests.");
      return;
    }

    setStatusChangingId(requestId);
    setError(null);
    setSuccess(null);

    try {
      const data = await claimHelpRequest(accessToken, requestId);

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? data : request
        )
      );

      setSelectedRequest(data);
      setShowCompleteSuccess(false);
      invalidatePlotsCache();
      setSuccess("Help request claimed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to claim the help request."
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleUnclaimRequest = async (requestId: number) => {
    if (!accessToken) {
      setError("Please log in to unclaim help requests.");
      return;
    }

    setStatusChangingId(requestId);
    setError(null);
    setSuccess(null);

    try {
      const data = await unclaimHelpRequest(accessToken, requestId);

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? data : request
        )
      );

      setSelectedRequest(data);
      setShowCompleteSuccess(false);
      invalidatePlotsCache();
      setSuccess("Help request unclaimed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to unclaim the help request."
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleCompleteRequest = async (requestId: number) => {
    if (!accessToken) {
      setError("Please log in to complete help requests.");
      return;
    }

    setStatusChangingId(requestId);
    setError(null);
    setSuccess(null);

    try {
      const data = await completeHelpRequest(accessToken, requestId);

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? data : request
        )
      );

      setSelectedRequest(data);
      setShowCompleteSuccess(true);
      invalidatePlotsCache();
      setSuccess("Help request completed.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the help request."
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!accessToken) {
      setError("Please log in to delete help requests.");
      return;
    }

    setDeletingId(requestId);
    setError(null);
    setSuccess(null);

    try {
      await deleteHelpRequest(accessToken, requestId);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      invalidatePlotsCache();
      setSuccess("Help request deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the help request.");
    } finally {
      setDeletingId(null);
    }
  };

  const openRequestDetails = (request: HelpRequest) => {
    setSelectedRequest(request);
    setShowCompleteSuccess(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans, position: "relative" }}>
      <div className="page-content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.375rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <img
              src={taskIcon}
              alt="task board"
              style={{ height: "2rem", width: "2rem", objectFit: "cover",
                borderRadius: "0.5rem", display: "block", flexShrink: 0 }}
            />
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>Task Board</h1>
          </div>
        </div>
        {error && (
          <div style={{ marginBottom: "0.875rem", color: C.terra, fontWeight: 700, fontSize: "0.8rem" }}>{error}</div>
        )}
        {success && (
          <div style={{ marginBottom: "0.875rem", color: C.sage, fontWeight: 700, fontSize: "0.8rem" }}>{success}</div>
        )}
        <div style={{ marginBottom: "0.875rem", fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
          Unclaimed requests expire after 14 days.
        </div>
        <div className="task-board-cols">
          {columns.map((col) => (
            <div key={col.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem", marginBottom: "0.6875rem", paddingLeft: "0.7rem" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: col.accent,
                  textTransform: "uppercase", letterSpacing: "0.08em", ...mono }}>{col.label}</span>
                <span style={{ background: col.accent, color: C.white, borderRadius: "1.25rem",
                  padding: "0.125rem 0.5rem", fontSize: "0.66rem", fontWeight: 800 }}>
                  {requests.filter((request) => request.status === requestColumnMap[col.id]).length}
                </span>
              </div>
              <div style={{ background: colBg[col.id], borderRadius: "1rem", padding: "0.625rem",
                minHeight: "7.5rem", display: "flex", flexDirection: "column", gap: "0.5625rem",
                border: `0.0938rem solid ${col.accent}22` }}>
                {[
                  ...col.tasks,
                  ...requests.filter((request) => request.status === requestColumnMap[col.id]).map((request) => ({
                    id: `request-${request.id}`,
                    title: request.title,
                    desc: request.description,
                    assignee: "",
                    aColor: request.priority === "high" ? C.terra : request.priority === "low" ? C.sage : C.amber,
                    date: request.category,
                    priority: request.priority,
                  })),
                ].map((task) => {
                  const isRequestCard = typeof task.id === "string" && task.id.startsWith("request-");
                  const requestId = isRequestCard ? Number(String(task.id).split("request-")[1]) : null;

                  return (
                  <div key={task.id} onClick={() => {
                    if (requestId !== null) {
                      const request = requests.find((item) => item.id === requestId);
                      if (request) {
                        openRequestDetails(request);
                      }
                    }
                  }} style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
                    borderRadius: "0.8125rem", padding: "0.8125rem 0.875rem", borderLeft: `0.25rem solid ${col.accent}`,
                    cursor: isRequestCard ? "pointer" : "default" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.brown,
                      marginBottom: "0.3125rem", ...serif }}>{task.title}</div>
                    <div style={{ fontSize: "0.76rem", color: C.brownLight,
                      lineHeight: 1.5, marginBottom: "0.4375rem" }}>{task.desc}</div>
                    {task.priority && (
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.brownMid,
                        marginBottom: "0.375rem", textTransform: "capitalize" }}>
                        Priority: {task.priority}
                      </div>
                    )}
                    {isRequestCard && requests.find((item) => item.id === requestId)?.due_date && (
                      <div style={{ fontSize: "0.69rem", color: C.brownMid, marginBottom: "0.375rem" }}>
                        Due: {new Date(String(requests.find((item) => item.id === requestId)?.due_date)).toLocaleDateString()}
                      </div>
                    )}
                    {isRequestCard && (() => {
                      const request = requests.find((item) => item.id === requestId);
                      if (!request) {
                        return null;
                      }

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.625rem" }}>
                          <div style={{ fontSize: "0.69rem", color: C.muted }}>
                            Assigned to: {getUserLabel(request.assigned_to, "Unassigned")}
                          </div>
                          <div style={{ fontSize: "0.69rem", color: C.muted }}>
                            {getPlotNumberLabel(request.plot)}
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem", color: C.muted, ...mono }}>{task.date}</span>
                      {isRequestCard ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            const request = requests.find((item) => item.id === requestId);
                            if (request) {
                              openRequestDetails(request);
                            }
                          }}
                          style={{ background: C.creamDark, border: "none", borderRadius: "0.4375rem",
                            padding: "0.25rem 0.5rem", fontSize: "0.6rem", fontWeight: 800,
                            color: C.brownMid, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                          View
                        </button>
                      ) : (
                        <button style={{ background: C.creamDark, border: "none", borderRadius: "0.4375rem",
                          padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 700, color: C.brownMid,
                          cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>View</button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => {
        setCreateError(null);
        setShowNew(true);
      }}
        style={{ position: "fixed", bottom: "4vw", right: "4vw", width: "3.125rem", height: "3.125rem",
          borderRadius: "50%", background: `linear-gradient(135deg, ${C.terra}, ${C.terraDark})`,
          color: C.white, border: "none", cursor: "pointer",
          boxShadow: `0 0.25rem 1rem ${C.terra}55`,
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
        <Plus size={20} />
      </button>

      {selectedRequest && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: "1rem" }}>
          <div style={{ background: C.card, borderRadius: "1.375rem", padding: "1.625rem", width: "min(92%, 24rem)",
            maxHeight: "min(90vh, 44rem)", overflowY: "auto", boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)", border: `0.125rem solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.125rem" }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                Help Request Details
              </h3>
              <button onClick={() => {
                setShowCompleteSuccess(false);
                setSelectedRequest(null);
              }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            {showCompleteSuccess && selectedRequest.status === "done" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: C.sageDark, ...serif }}>
                  Thanks for completing this task!
                </div>
                <div style={{ fontSize: "0.76rem", color: C.muted, lineHeight: 1.5 }}>
                  This request was moved to Complete and the board has been updated.
                </div>
                <button
                  onClick={() => {
                    setShowCompleteSuccess(false);
                    setSelectedRequest(null);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                    color: C.white,
                    border: "none",
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: "0.88rem",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6875rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 700 }}>Title</div>
                  <div style={{ fontSize: "0.94rem", color: C.brown, fontWeight: 700, ...serif }}>{selectedRequest.title}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 700 }}>Description</div>
                  <div style={{ fontSize: "0.82rem", color: C.brownLight, lineHeight: 1.5 }}>{selectedRequest.description}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Status</label>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      width: "fit-content",
                      padding: "0.4rem 0.65rem",
                      borderRadius: "999px",
                      background: `${statusColor[selectedRequest.status] ?? C.border}22`,
                      color: statusColor[selectedRequest.status] ?? C.brownMid,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      ...mono,
                    }}
                  >
                    {getStatusDisplayText(selectedRequest)}
                  </div>
                </div>
                <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>Plot</div>
                    <div style={{ fontSize: "0.78rem", color: C.brownMid }}>{getPlotNumberLabel(selectedRequest.plot)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>Priority</div>
                    <div style={{ fontSize: "0.78rem", color: C.brownMid }}>{getPriorityLabel(selectedRequest.priority)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>Category</div>
                    <div style={{ fontSize: "0.78rem", color: C.brownMid }}>{getCategoryLabel(selectedRequest.category)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>Due date</div>
                    <div style={{ fontSize: "0.78rem", color: C.brownMid }}>
                      {selectedRequest.due_date
                        ? new Date(selectedRequest.due_date).toLocaleDateString()
                        : "None"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>Creator</div>
                    <div style={{ fontSize: "0.78rem", color: C.brownMid }}>{getUserLabel(selectedRequest.created_by, "Unknown")}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontSize: "0.68rem", color: C.muted, fontWeight: 700 }}>Assignee</div>
                    <div style={{ fontSize: "0.78rem", color: C.brownMid }}>{getUserLabel(selectedRequest.assigned_to, "Unassigned")}</div>
                  </div>
                </div>

                {!isGardenAdmin && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    {selectedRequest.status === "active" && selectedRequest.assigned_to == null && (
                      <button
                        onClick={() => handleClaimRequest(selectedRequest.id)}
                        disabled={statusChangingId === selectedRequest.id}
                        style={{
                          background: C.amber,
                          color: C.white,
                          border: "none",
                          borderRadius: "0.75rem",
                          padding: "0.75rem",
                          fontWeight: 800,
                          cursor: statusChangingId === selectedRequest.id ? "wait" : "pointer",
                          fontFamily: "'Nunito', sans-serif",
                          fontSize: "0.88rem",
                          opacity: statusChangingId === selectedRequest.id ? 0.75 : 1,
                        }}
                      >
                        Claim Task
                      </button>
                    )}
                    {selectedRequest.status === "pending" && selectedRequest.assigned_to === user?.id && (
                      <>
                        <button
                          onClick={() => handleUnclaimRequest(selectedRequest.id)}
                          disabled={statusChangingId === selectedRequest.id}
                          style={{
                            background: C.creamDark,
                            color: C.brownMid,
                            border: "none",
                            borderRadius: "0.75rem",
                            padding: "0.75rem",
                            fontWeight: 800,
                            cursor: statusChangingId === selectedRequest.id ? "wait" : "pointer",
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: "0.88rem",
                            opacity: statusChangingId === selectedRequest.id ? 0.75 : 1,
                          }}
                        >
                          Unclaim Task
                        </button>
                        <button
                          onClick={() => handleCompleteRequest(selectedRequest.id)}
                          disabled={statusChangingId === selectedRequest.id}
                          style={{
                            background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                            color: C.white,
                            border: "none",
                            borderRadius: "0.75rem",
                            padding: "0.75rem",
                            fontWeight: 800,
                            cursor: statusChangingId === selectedRequest.id ? "wait" : "pointer",
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: "0.88rem",
                            opacity: statusChangingId === selectedRequest.id ? 0.75 : 1,
                          }}
                        >
                          Mark Complete
                        </button>
                      </>
                    )}
                  </div>
                )}

                {isGardenAdmin && (
                  <div style={{ marginTop: "0.25rem", paddingTop: "0.75rem", borderTop: `0.0625rem solid ${C.border}` }}>
                    <div style={{ fontSize: "0.69rem", color: C.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem", ...mono }}>
                      Admin controls
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {selectedRequest.status === "active" && selectedRequest.assigned_to == null && (
                        <button
                          onClick={() => handleClaimRequest(selectedRequest.id)}
                          disabled={statusChangingId === selectedRequest.id}
                          style={{
                            background: C.amber,
                            color: C.white,
                            border: "none",
                            borderRadius: "0.75rem",
                            padding: "0.7rem 0.75rem",
                            fontWeight: 800,
                            cursor: statusChangingId === selectedRequest.id ? "wait" : "pointer",
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: "0.82rem",
                            opacity: statusChangingId === selectedRequest.id ? 0.75 : 1,
                          }}
                        >
                          Claim Task
                        </button>
                      )}
                      {selectedRequest.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleUnclaimRequest(selectedRequest.id)}
                            disabled={statusChangingId === selectedRequest.id}
                            style={{
                              background: C.creamDark,
                              color: C.brownMid,
                              border: "none",
                              borderRadius: "0.75rem",
                              padding: "0.7rem 0.75rem",
                              fontWeight: 800,
                              cursor: statusChangingId === selectedRequest.id ? "wait" : "pointer",
                              fontFamily: "'Nunito', sans-serif",
                              fontSize: "0.82rem",
                              opacity: statusChangingId === selectedRequest.id ? 0.75 : 1,
                            }}
                          >
                            Unclaim Task
                          </button>
                          <button
                            onClick={() => handleCompleteRequest(selectedRequest.id)}
                            disabled={statusChangingId === selectedRequest.id}
                            style={{
                              background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                              color: C.white,
                              border: "none",
                              borderRadius: "0.75rem",
                              padding: "0.7rem 0.75rem",
                              fontWeight: 800,
                              cursor: statusChangingId === selectedRequest.id ? "wait" : "pointer",
                              fontFamily: "'Nunito', sans-serif",
                              fontSize: "0.82rem",
                              opacity: statusChangingId === selectedRequest.id ? 0.75 : 1,
                            }}
                          >
                            Mark Complete
                          </button>
                        </>
                      )}
                      {selectedRequest.status === "done" && (
                        <div style={{ fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
                          Reopen is unavailable here. TODO: add a backend workflow endpoint if completed tasks need to be restored.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selectedRequest.created_by === user?.id || isGardenAdmin) && (
                  <div style={{ display: "flex", marginTop: "0.25rem" }}>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this help request?")) {
                          handleDeleteRequest(selectedRequest.id);
                          setShowCompleteSuccess(false);
                          setSelectedRequest(null);
                        }
                      }}
                      disabled={deletingId === selectedRequest.id}
                      style={{ background: C.creamDark, border: "none", borderRadius: "0.75rem",
                        padding: "0.75rem 0.85rem", fontSize: "0.88rem", fontWeight: 800,
                        color: C.terra, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                      {deletingId === selectedRequest.id ? "..." : "Delete Task"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,31,20,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{ background: C.card, borderRadius: "1.375rem", padding: "1.625rem", width: "min(92%, 23.125rem)",
            boxShadow: "0 1rem 3rem rgba(44,31,20,0.25)", border: `0.125rem solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: "1.125rem" }}>
              <h3 style={{ ...serif, fontSize: "1.05rem", fontWeight: 700, color: C.brown, margin: 0 }}>
                New Task
              </h3>
              <button onClick={() => setShowNew(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6875rem" }}>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (createError) {
                    setCreateError(null);
                  }
                }}
                placeholder="Task title"
                style={{ ...inputStyle, fontSize: "0.84rem" }}
              />
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (createError) {
                    setCreateError(null);
                  }
                }}
                placeholder="Description..."
                style={{ ...inputStyle, minHeight: "4.75rem",
                  resize: "vertical", fontSize: "0.84rem",
                  fontFamily: "'Nunito', sans-serif" } as CSSProperties}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Priority</label>
                <select
                  value={priority}
                  onChange={(event) => {
                    setPriority(event.target.value);
                    if (createError) {
                      setCreateError(null);
                    }
                  }}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}>
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: "0.68rem", color: C.muted, lineHeight: 1.4 }}>
                  High-priority requests notify gardeners immediately. Low and medium priority requests are included in the weekly garden update on Friday mornings.
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Request type</label>
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    if (createError) {
                      setCreateError(null);
                    }
                  }}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    if (createError) {
                      setCreateError(null);
                    }
                  }}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}
                />
              </div>
              {createError && (
                <div style={{ color: C.terra, fontWeight: 700, fontSize: "0.8rem" }}>{createError}</div>
              )}
              <button onClick={handleCreateRequest} disabled={isSubmitting}
                style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white, border: "none", borderRadius: "0.75rem", padding: "0.75rem",
                  fontWeight: 800, cursor: isSubmitting ? "wait" : "pointer", fontFamily: "'Nunito', sans-serif",
                  fontSize: "0.88rem", opacity: isSubmitting ? 0.75 : 1 }}>
                {isSubmitting ? "Creating…" : "Create Help Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
