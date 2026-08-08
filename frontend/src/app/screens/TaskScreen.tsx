import { useEffect, useState, type CSSProperties } from "react";
import { Plus, Filter, X } from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";
import { useAuth } from "../auth/AuthContext";
import taskIcon from "../../imports/TaskPageIcon.jpg";
import {
  createHelpRequest,
  deleteHelpRequest,
  fetchHelpRequests,
  fetchUsers,
  updateHelpRequest,
  type HelpRequest,
  type UserOption,
} from "../../lib/helpRequestsApi";

interface Task { id: number | string; title: string; desc: string; assignee: string; aColor: string; date: string; priority?: string; }
interface Column { id: string; label: string; count: number; accent: string; tasks: Task[]; }

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
  { id: "active", label: "Active", count: 0, accent: C.terra, tasks: [] },
  { id: "pending", label: "Pending", count: 0, accent: C.amber, tasks: [] },
  { id: "done", label: "Done", count: 0, accent: C.sage, tasks: [] },
];

export function TaskScreen() {
  const { accessToken } = useAuth();
  const [columns] = useState(initialColumns);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCategory, setEditCategory] = useState("other");
  const [editDueDate, setEditDueDate] = useState("");
  const [assignee, setAssignee] = useState<number | "">("" );
  const [editAssignee, setEditAssignee] = useState<number | "">("" );
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
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

  const loadRequests = async () => {
    try {
      const data = await fetchHelpRequests();
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

  useEffect(() => {
    void loadRequests();
    void loadUsers();
  }, [accessToken]);

  const handleCreateRequest = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await createHelpRequest({
        title,
        description,
        garden: 1,
        priority,
        category,
        due_date: dueDate || null,
        assigned_to: assignee || null,
      });

      setRequests((current) => [data, ...current]);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategory("other");
      setDueDate("");
      setAssignee("");
      setShowNew(false);
      setSuccess("Help request created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the help request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (requestId: number, nextStatus: string) => {
    setStatusChangingId(requestId);
    setError(null);
    setSuccess(null);

    try {
      const data = await updateHelpRequest(requestId, { status: nextStatus });
      setRequests((current) => current.map((request) => (request.id === requestId ? data : request)));
      setSuccess("Help request updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the help request.");
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    setDeletingId(requestId);
    setError(null);
    setSuccess(null);

    try {
      await deleteHelpRequest(requestId);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setSuccess("Help request deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the help request.");
    } finally {
      setDeletingId(null);
    }
  };

  const openRequestDetails = (request: HelpRequest) => {
    setSelectedRequest(request);
    setEditTitle(request.title);
    setEditDescription(request.description);
    setEditStatus(request.status);
    setEditPriority(request.priority);
    setEditCategory(request.category);
    setEditDueDate(request.due_date ?? "");
    setEditAssignee(request.assigned_to ?? "");
    setError(null);
    setSuccess(null);
  };

  const handleUpdateRequestDetails = async () => {
    if (!selectedRequest) {
      return;
    }

    setIsSavingDetails(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await updateHelpRequest(selectedRequest.id, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        priority: editPriority,
        category: editCategory,
        due_date: editDueDate || null,
        assigned_to: editAssignee || null,
      });

      setRequests((current) => current.map((request) => (request.id === selectedRequest.id ? data : request)));
      setSelectedRequest(null);
      setSuccess("Help request updated.");
      void loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the help request.");
    } finally {
      setIsSavingDetails(false);
    }
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
          <button style={{ background: C.card, border: `0.0625rem solid ${C.border}`, borderRadius: "0.625rem",
            padding: "0.5rem 0.875rem", fontSize: "0.8rem", fontWeight: 700, color: C.brownMid,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: "0.3125rem" }}>
            <Filter size={13} /> Filter: All Tasks
          </button>
        </div>
        {error && (
          <div style={{ marginBottom: "0.875rem", color: C.terra, fontWeight: 700, fontSize: "0.8rem" }}>{error}</div>
        )}
        {success && (
          <div style={{ marginBottom: "0.875rem", color: C.sage, fontWeight: 700, fontSize: "0.8rem" }}>{success}</div>
        )}
        <div className="task-board-cols">
          {columns.map((col) => (
            <div key={col.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem", marginBottom: "0.6875rem" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: col.accent,
                  textTransform: "uppercase", letterSpacing: "0.08em", ...mono }}>{col.label}</span>
                <span style={{ background: col.accent, color: C.white, borderRadius: "1.25rem",
                  padding: "0.125rem 0.5rem", fontSize: "0.66rem", fontWeight: 800 }}>{col.count}</span>
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

      <button onClick={() => setShowNew(true)}
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
              <button onClick={() => setSelectedRequest(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6875rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  style={{ ...inputStyle, fontSize: "0.84rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description..."
                  style={{ ...inputStyle, minHeight: "4.75rem", resize: "vertical", fontSize: "0.84rem",
                    fontFamily: "'Nunito', sans-serif" } as CSSProperties}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Status</label>
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value)}
                  disabled={statusChangingId === selectedRequest.id}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem", flex: 1, minWidth: "8rem" }}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Priority</label>
                <select
                  value={editPriority}
                  onChange={(event) => setEditPriority(event.target.value)}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}>
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Request type</label>
                <select
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
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
                  value={editDueDate}
                  onChange={(event) => setEditDueDate(event.target.value)}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Assign to</label>
                <select
                  value={editAssignee}
                  onChange={(event) => setEditAssignee(event.target.value === "" ? "" : Number(event.target.value))}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}>
                  <option value="">Unassigned</option>
                  {users.map((user) => {
                    const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ");
                    return (
                      <option key={user.id} value={user.id}>
                        {displayName || user.email}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={handleUpdateRequestDetails} disabled={isSavingDetails}
                  style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                    color: C.white, border: "none", borderRadius: "0.75rem", padding: "0.75rem",
                    fontWeight: 800, cursor: isSavingDetails ? "wait" : "pointer", fontFamily: "'Nunito', sans-serif",
                    fontSize: "0.88rem", opacity: isSavingDetails ? 0.75 : 1, flex: 1 }}>
                  {isSavingDetails ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Delete this help request?")) {
                      handleDeleteRequest(selectedRequest.id);
                      setSelectedRequest(null);
                    }
                  }}
                  disabled={deletingId === selectedRequest.id}
                  style={{ background: C.creamDark, border: "none", borderRadius: "0.75rem",
                    padding: "0.75rem 0.85rem", fontSize: "0.88rem", fontWeight: 800,
                    color: C.terra, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                  {deletingId === selectedRequest.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                style={{ ...inputStyle, fontSize: "0.84rem" }}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description..."
                style={{ ...inputStyle, minHeight: "4.75rem",
                  resize: "vertical", fontSize: "0.84rem",
                  fontFamily: "'Nunito', sans-serif" } as CSSProperties}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}>
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Request type</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
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
                  onChange={(event) => setDueDate(event.target.value)}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <label style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 700 }}>Assign to</label>
                <select
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value === "" ? "" : Number(event.target.value))}
                  style={{ ...inputStyle, fontSize: "0.84rem", padding: "0.7rem 0.8rem" }}>
                  <option value="">Unassigned</option>
                  {users.map((user) => {
                    const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ");
                    return (
                      <option key={user.id} value={user.id}>
                        {displayName || user.email}
                      </option>
                    );
                  })}
                </select>
              </div>
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
