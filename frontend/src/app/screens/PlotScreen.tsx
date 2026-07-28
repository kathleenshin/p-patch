import { useState } from "react";
import {
  ChevronRight, Eye, EyeOff, Plus, Pencil, MapPin, ArrowRight,
  ClipboardList, Users,
} from "lucide-react";
import { C, serif, sans, mono, linkStyle } from "../theme";
import type { Screen } from "../types";
import { DayForecastWidget } from "../components/weather/DayForecastWidget";

export function PlotScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [publicNote,  setPublicNote]  = useState("Tomatoes planted Apr 12. Back row is garlic — hands off until July. Squash needs extra water.");
  const [privateNote, setPrivateNote] = useState("Soil amendment added Mar 2025. pH test due August.");
  const [activeTab,   setActiveTab]   = useState<"overview"|"notes"|"gallery"|"history">("overview");

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes",    label: "Notes" },
    { key: "gallery",  label: "Gallery" },
    { key: "history",  label: "History" },
  ];

  const plotInfo = [
    { label: "Status",      value: "Active Planting" },
    { label: "Owner",       value: "Elena V." },
    { label: "Plants",      value: "Tomatoes, Bell Peppers" },
    { label: "Size",        value: "10′ × 12′" },
    { label: "Location",    value: "Community North" },
    { label: "Established", value: "Spring 2022" },
  ];

  const secondaryOwners = [
    { initials: "MK", name: "Maria K.",  color: C.sage },
    { initials: "JS", name: "Jake S.",   color: "#B8A070" },
    { initials: "AW", name: "Aiko W.",   color: C.sky },
  ];

  const quickActions = [
    { label: "Add Public Note",    Icon: Plus },
    { label: "Add Private Note",   Icon: Plus },
    { label: "Upload Photo",       Icon: Plus },
    { label: "View Plot on Map",   Icon: MapPin },
    { label: "Print Plot Summary", Icon: ArrowRight },
  ];

  const recentActivity = [
    { who: "Elena V.", action: "added a public note", when: "2h ago" },
    { who: "Maria K.", action: "uploaded a photo",    when: "Yesterday" },
    { who: "Jake S.",  action: "updated plot status", when: "3d ago" },
  ];

  const noteTA = (value: string, onChange: (v: string) => void, bg: string) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", boxSizing: "border-box",
        border: `0.0938rem solid ${C.border}`, borderRadius: "0.625rem",
        padding: "0.625rem 0.75rem", fontSize: "0.8rem", color: C.brownMid,
        background: bg, fontFamily: "'Nunito', sans-serif",
        resize: "vertical", minHeight: "6.875rem", outline: "none", lineHeight: 1.6 }} />
  );

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.cream, ...sans }}>
      <div className="page-content">

        {/* ── Breadcrumb ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.3125rem",
          marginBottom: "0.75rem", fontSize: "0.74rem", color: C.muted }}>
          <button onClick={() => setScreen("dashboard")}
            style={{ ...linkStyle, color: C.sage, fontWeight: 700, fontSize: "0.74rem" }}>Plots</button>
          <ChevronRight size={11} color={C.muted} />
          <span>Community North</span>
          <ChevronRight size={11} color={C.muted} />
          <span style={{ color: C.brownMid, fontWeight: 700 }}>Plot #14</span>
        </div>

        {/* ── Outer 2-column layout: left 4fr | right 1fr (stacks on phone) ── */}
        <div className="plot-detail-layout">

          {/* ── LEFT COLUMN: stacked items ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

            {/* Header — transparent background */}
            <div style={{ padding: "0.625rem 0.25rem",
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div className="img-icon img-icon-plot-bed" role="img" aria-label="garden plot" />
                <div>
                  <div style={{ ...serif, fontSize: "1.5rem", fontWeight: 800,
                    color: C.brown, lineHeight: 1.1 }}>Plot #14</div>
                  <div style={{ fontSize: "0.72rem", color: C.brownLight,
                    fontWeight: 600, marginTop: "0.1875rem", ...sans }}>Owner: Elena V.</div>
                </div>
              </div>
              <button style={{ background: C.white, border: `0.0625rem solid ${C.border}`,
                borderRadius: "0.5625rem", padding: "0.4375rem 1rem", color: C.brownMid, fontWeight: 700,
                fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                display: "flex", alignItems: "center", gap: "0.375rem",
                boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.08)" }}>
                <Pencil size={12} /> Edit Plot
              </button>
            </div>

            {/* Hero photo */}
            <div style={{ borderRadius: "0.875rem", overflow: "hidden",
              border: `0.0625rem solid ${C.border}`, aspectRatio: "16/5",
              boxShadow: "0 0.125rem 0.625rem rgba(44,31,20,0.08)" }}>
              <div className="img-plot-hero" role="img" aria-label="Garden plot" />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    padding: "0.5625rem 1rem", fontSize: "0.82rem", fontWeight: 700,
                    fontFamily: "'Nunito', sans-serif",
                    color: activeTab === t.key ? C.sage : C.muted,
                    borderBottom: activeTab === t.key
                      ? `0.125rem solid ${C.sage}` : "0.125rem solid transparent",
                    transition: "color 0.12s, border-color 0.12s" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Bottom row: Plot Info (25%) + Notes (75%) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "0.875rem" }}>

              {/* Plot Info */}
              <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
                borderRadius: "0.8125rem", padding: "0.875rem 1rem",
                boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)" }}>
                <h3 style={{ ...serif, fontSize: "0.8rem", fontWeight: 700,
                  color: C.brown, margin: "0 0 0.625rem",
                  display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <ClipboardList size={13} color={C.sage} /> Plot Info
                </h3>
                {plotInfo.map(({ label, value }) => (
                  <div key={label} style={{ padding: "0.375rem 0", borderBottom: `0.0625rem solid ${C.creamDark}` }}>
                    <div style={{ fontSize: "0.58rem", color: C.muted,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      ...mono, marginBottom: "0.125rem" }}>{label}</div>
                    <div style={{ fontSize: "0.76rem", color: C.brown, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

                {/* Public Notes */}
                <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
                  borderTop: `0.1875rem solid ${C.sage}`, borderRadius: "0.8125rem", padding: "0.875rem 1rem",
                  boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <h3 style={{ ...serif, fontSize: "0.85rem", fontWeight: 700,
                      color: C.brown, margin: 0 }}>Public Notes</h3>
                    <button style={{ background: C.sagePop, color: C.sage,
                      border: `0.0625rem solid ${C.sageMid}`, borderRadius: "0.4375rem",
                      padding: "0.1875rem 0.5625rem", fontSize: "0.7rem", fontWeight: 700,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: "0.1875rem" }}>
                      <Plus size={10} /> Add Note
                    </button>
                  </div>
                  {noteTA(publicNote, setPublicNote, C.sagePop)}
                  <div style={{ fontSize: "0.65rem", color: C.sage, marginTop: "0.3125rem", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Eye size={11} color={C.sage} /> Visible to all members
                  </div>
                </div>

                {/* Private Notes */}
                <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
                  borderTop: `0.1875rem solid ${C.terra}`, borderRadius: "0.8125rem", padding: "0.875rem 1rem",
                  boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
                      <h3 style={{ ...serif, fontSize: "0.85rem", fontWeight: 700,
                        color: C.brown, margin: 0 }}>Private Notes</h3>
                      <span style={{ background: C.terra, color: C.white, fontSize: "0.54rem",
                        fontWeight: 800, padding: "0.125rem 0.375rem", borderRadius: "0.3125rem",
                        textTransform: "uppercase", letterSpacing: "0.04em", ...mono }}>
                        Owners Only
                      </span>
                    </div>
                    <button style={{ background: C.terraLight, color: C.terra,
                      border: `0.0625rem solid ${C.terra}44`, borderRadius: "0.4375rem",
                      padding: "0.1875rem 0.5625rem", fontSize: "0.7rem", fontWeight: 700,
                      cursor: "pointer", fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: "0.1875rem" }}>
                      <Plus size={10} /> Add Note
                    </button>
                  </div>
                  {noteTA(privateNote, setPrivateNote, C.terraLight)}
                  <div style={{ fontSize: "0.65rem", color: C.terra, marginTop: "0.3125rem", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <EyeOff size={11} color={C.terra} /> Only visible to plot owners
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: independent flex stack ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

            {/* Weather */}
            <DayForecastWidget showWeekLink />

            {/* Secondary Owners */}
            <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
              borderRadius: "0.8125rem", padding: "0.75rem 0.875rem",
              boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)" }}>
              <h3 style={{ ...serif, fontSize: "0.78rem", fontWeight: 700,
                color: C.brown, margin: "0 0 0.5rem",
                display: "flex", alignItems: "center", gap: "0.3125rem" }}>
                <Users size={12} color={C.sage} /> Secondary Owners
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {secondaryOwners.map((o) => (
                  <div key={o.initials} style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
                    <div style={{ width: "1.625rem", height: "1.625rem", borderRadius: "50%",
                      background: o.color, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: C.white, fontWeight: 800, fontSize: "0.6rem" }}>
                      {o.initials}
                    </div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 600, color: C.brown }}>{o.name}</span>
                  </div>
                ))}
              </div>
              <button style={{ marginTop: "0.5rem", width: "100%", background: C.creamDark,
                border: "none", borderRadius: "0.4375rem", padding: "0.3125rem 0.5rem",
                fontSize: "0.68rem", fontWeight: 700, color: C.brownLight,
                cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                Manage owners
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ background: C.card, border: `0.0625rem solid ${C.border}`,
              borderRadius: "0.8125rem", padding: "0.75rem 0.875rem",
              boxShadow: "0 0.0625rem 0.25rem rgba(44,31,20,0.05)" }}>
              <h3 style={{ ...serif, fontSize: "0.78rem", fontWeight: 700,
                color: C.brown, margin: "0 0 0.375rem" }}>Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {quickActions.map(({ label, Icon }) => (
                  <button key={label}
                    style={{ background: "none", border: "none", padding: "0.3125rem 0",
                      textAlign: "left", cursor: "pointer", color: C.sage,
                      fontSize: "0.73rem", fontWeight: 600,
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: "0.375rem",
                      borderBottom: `0.0625rem solid ${C.creamDark}` }}>
                    <Icon size={11} /> {label}
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
