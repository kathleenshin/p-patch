import { useState, type CSSProperties } from "react";
import { Plus, Filter, X } from "lucide-react";
import { C, serif, sans, mono, inputStyle } from "../theme";

interface Task { id: number; title: string; desc: string; assignee: string; aColor: string; date: string; }
interface Column { id: string; label: string; count: number; accent: string; tasks: Task[]; }

const initialColumns: Column[] = [
  { id: "active", label: "Active", count: 3, accent: C.terra, tasks: [
    { id: 1, title: "Weeding — Zone A", desc: "Remove clover and crabgrass around raised beds in north zone.", assignee: "MK", aColor: C.sage,  date: "Aug 14" },
    { id: 2, title: "Fix Drip Irrigation", desc: "Leaking valve in Plot #12 needs replacement parts from shed.", assignee: "JS", aColor: C.terra, date: "Aug 15" },
  ]},
  { id: "pending", label: "Pending", count: 5, accent: C.amber, tasks: [
    { id: 3, title: "Compost Turning", desc: "Central bins need turning and moisture check this weekend.", assignee: "AW", aColor: C.sage,    date: "Aug 18" },
    { id: 4, title: "Fertilizer Run", desc: "Pick up organic nitrogen mix for the community greenhouse.", assignee: "MK", aColor: "#B8A070", date: "Aug 20" },
  ]},
  { id: "done", label: "Done", count: 12, accent: C.sage, tasks: [
    { id: 5, title: "Shed Inventory", desc: "Updated tool list. 2 shovels are missing handles.", assignee: "JD", aColor: C.terra, date: "Jul 30" },
    { id: 6, title: "Planting Ceremony", desc: "Annual spring kick-off event successful. Photo uploaded.", assignee: "ALL", aColor: C.sage, date: "Apr 05" },
  ]},
];

export function TaskScreen() {
  const [columns] = useState(initialColumns);
  const [showNew, setShowNew] = useState(false);
  const colBg: Record<string, string> = { active: "#FFF4F0", pending: "#FFFBEE", done: "#F2FAF2" };

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans, position: "relative" }}>
      <div className="page-content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.375rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div className="img-icon img-icon-task-board" role="img" aria-label="task board" />
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: 0 }}>Task Board</h1>
          </div>
          <button style={{ background: C.card, border: `0.0625rem solid ${C.border}`, borderRadius: "0.625rem",
            padding: "0.5rem 0.875rem", fontSize: "0.8rem", fontWeight: 700, color: C.brownMid,
            cursor: "pointer", fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: "0.3125rem" }}>
            <Filter size={13} /> Filter: All Tasks
          </button>
        </div>
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
                {col.tasks.map((task) => (
                  <div key={task.id} style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
                    borderRadius: "0.8125rem", padding: "0.8125rem 0.875rem", borderLeft: `0.25rem solid ${col.accent}` }}>
                    <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.brown,
                      marginBottom: "0.3125rem", ...serif }}>{task.title}</div>
                    <div style={{ fontSize: "0.76rem", color: C.brownLight,
                      lineHeight: 1.5, marginBottom: "0.625rem" }}>{task.desc}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
                        <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                          background: task.aColor, display: "flex", alignItems: "center",
                          justifyContent: "center", color: C.white,
                          fontWeight: 800, fontSize: "0.62rem" }}>{task.assignee}</div>
                        <span style={{ fontSize: "0.7rem", color: C.muted, ...mono }}>{task.date}</span>
                      </div>
                      <button style={{ background: C.creamDark, border: "none", borderRadius: "0.4375rem",
                        padding: "0.25rem 0.625rem", fontSize: "0.7rem", fontWeight: 700, color: C.brownMid,
                        cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>View</button>
                    </div>
                  </div>
                ))}
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
              <input placeholder="Task title" style={{ ...inputStyle, fontSize: "0.84rem" }} />
              <textarea placeholder="Description..." style={{ ...inputStyle, minHeight: "4.75rem",
                resize: "vertical", fontSize: "0.84rem",
                fontFamily: "'Nunito', sans-serif" } as CSSProperties} />
              <input placeholder="Assigned to" style={{ ...inputStyle, fontSize: "0.84rem" }} />
              <button onClick={() => setShowNew(false)}
                style={{ background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                  color: C.white, border: "none", borderRadius: "0.75rem", padding: "0.75rem",
                  fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                  fontSize: "0.88rem" }}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
