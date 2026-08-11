import { useEffect, useRef, useState, type ElementType } from "react";
import {
  Bell, ClipboardList, Home, LayoutGrid, Archive, ShieldCheck, LogOut, UserRound,
} from "lucide-react";
import { C, sans } from "../theme";
import type { Screen } from "../types";
import parkLogo from "../../assets/judkins-park-logo.png";
import { AccountSettingsDialog } from "./AccountSettingsDialog";
import { useAuth } from "@/app/auth/AuthContext.tsx";

export function TopNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
    const { isApproved, isGardenAdmin, logout, user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Pending users only get Dashboard; approved members get the rest.
    const links: { label: string; screen: Screen; Icon: ElementType }[] = [
        { label: "Dashboard", screen: "dashboard", Icon: Home },
    ];
    if (isApproved) {
        links.push(
            { label: "Plots", screen: "plot", Icon: LayoutGrid },
            { label: "Tasks", screen: "tasks", Icon: ClipboardList },
            { label: "Inventory", screen: "inventory", Icon: Archive },
        );
    }
    // Avatar letter from first name, else email.
    const initial = (user?.first_name?.[0] || user?.email?.[0] || "?").toUpperCase();

    useEffect(() => {
      if (!menuOpen) return;
      function onPointerDown(e: MouseEvent) {
        if (!menuRef.current?.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setMenuOpen(false);
      }
      window.addEventListener("mousedown", onPointerDown);
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("mousedown", onPointerDown);
        window.removeEventListener("keydown", onKey);
      };
    }, [menuOpen]);

  return (
    <>
    <nav style={{ background: C.header, ...sans, position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 4%", height: "3.25rem" }}>
      {/* Brand mark + wordmark — click returns to dashboard */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer",
        flexShrink: 0 }} onClick={() => setScreen("dashboard")}>
        <img
          src={parkLogo}
          alt=""
          aria-hidden="true"
          style={{ height: "2.75rem", width: "2.75rem", objectFit: "contain", display: "block" }}
        />
        <span style={{
          fontFamily: "'Bodoni Moda', serif",
          fontOpticalSizing: "auto",
          color: C.cream,
          fontWeight: 600,
          fontSize: "0.95rem",
          lineHeight: 1.15,
          whiteSpace: "nowrap",
        }}>
          Judkins Park P-Patch Gardening
        </span>
      </div>
      {/* Primary screen links (role-gated above) */}
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
        {/* Admin link is garden-admin only. */}
        {isGardenAdmin && (
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
        )}
      </div>
      {/* Status, notifications, avatar, logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        {/* Pending = authenticated but not yet approved by an admin. */}
        {!isApproved && (
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.72rem", fontWeight: 700 }}>
            Pending approval
          </span>
        )}
        {/* Notifications placeholder */}
        <button style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "0.625rem",
          padding: "0.4375rem", cursor: "pointer", display: "flex" }}>
          <Bell size={16} color={C.amber} />
        </button>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.terra}, ${C.amber})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.white,
              fontWeight: 800,
              fontSize: "0.78rem",
              border: menuOpen ? `0.125rem solid ${C.white}` : "0.125rem solid transparent",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {initial}
          </button>
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 0.4rem)",
                minWidth: "11.5rem",
                background: C.card,
                border: `0.0938rem solid ${C.border}`,
                borderRadius: "0.75rem",
                boxShadow: "0 0.5rem 1.25rem rgba(47, 70, 51, 0.16)",
                padding: "0.35rem",
                zIndex: 30,
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen(true);
                }}
                style={{
                  ...sans,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "none",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.55rem 0.65rem",
                  cursor: "pointer",
                  color: C.brown,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textAlign: "left",
                }}
              >
                <UserRound size={15} color={C.sage} />
                Account settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                style={{
                  ...sans,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "none",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.55rem 0.65rem",
                  cursor: "pointer",
                  color: C.terraDark,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textAlign: "left",
                }}
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
    <AccountSettingsDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}
