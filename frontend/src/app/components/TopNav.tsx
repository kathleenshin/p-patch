import type { ElementType } from "react";
import {
  Bell, ClipboardList, Home, LayoutGrid, Archive, ShieldCheck,
} from "lucide-react";
import { C, sans, serif } from "../theme";
import type { Screen } from "../types";
import { DoodleLeaf } from "./DoodleLeaf";

export function TopNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const links: { label: string; screen: Screen; Icon: ElementType }[] = [
    { label: "Dashboard", screen: "dashboard", Icon: Home },
    { label: "Plots",     screen: "plot",      Icon: LayoutGrid },
    { label: "Tasks",     screen: "tasks",     Icon: ClipboardList },
    { label: "Inventory", screen: "inventory", Icon: Archive },
  ];
  return (
    <nav style={{ background: C.header, ...sans, position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 4%", height: "3.25rem" }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer",
        flexShrink: 0 }} onClick={() => setScreen("dashboard")}>
        <DoodleLeaf size={24} color={C.white} />
        <span style={{ ...serif, color: C.white, fontWeight: 700, fontSize: "0.95rem",
          whiteSpace: "nowrap" }}>
          Judkins Park P-Patch Gardening
        </span>
      </div>
      {/* Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.125rem" }}>
        {links.map((l) => {
          const active = screen === l.screen;
          return (
            <button key={l.label} onClick={() => setScreen(l.screen)}
              style={{ color: active ? C.white : "rgba(255,255,255,0.6)",
                fontWeight: active ? 700 : 500,
                background: active ? "rgba(255,255,255,0.14)" : "none",
                border: "none", cursor: "pointer", padding: "0.4375rem 0.875rem", borderRadius: "0.625rem",
                fontSize: "0.83rem", fontFamily: "'Nunito', sans-serif", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <l.Icon size={15} />
              {l.label}
            </button>
          );
        })}
        <button onClick={() => setScreen("admin")}
          style={{ color: screen === "admin" ? C.white : "rgba(255,255,255,0.6)",
            fontWeight: screen === "admin" ? 700 : 500,
            background: screen === "admin" ? "rgba(255,255,255,0.14)" : "none",
            border: "none", cursor: "pointer", padding: "0.4375rem 0.875rem", borderRadius: "0.625rem",
            fontSize: "0.83rem", fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <ShieldCheck size={15} />
          Admin
        </button>
      </div>
      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <button style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "0.625rem",
          padding: "0.4375rem", cursor: "pointer", display: "flex" }}>
          <Bell size={16} color={C.amber} />
        </button>
        <div style={{ width: "2rem", height: "2rem", borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.terra}, ${C.amber})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.white, fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>E</div>
      </div>
    </nav>
  );
}
