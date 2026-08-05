import { useEffect, useState } from "react";
import { C, sans } from "./theme";
import type { Screen } from "./types";
import { TopNav } from "./components/TopNav";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { PlotScreen } from "./screens/PlotScreen";
import { TaskScreen } from "./screens/TaskScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { useAuth } from "./auth/AuthContext";

/**
 * Root shell: waits for auth restore, then shows either LoginScreen
 * or the authenticated app screens. Unauthenticated users cannot open
 * dashboard/plot/tasks/etc.
 */
export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>("login");

  // Keep screen in sync with auth: force login when logged out;
  // leave login for dashboard once authenticated.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setScreen("login");
    } else if (screen === "login") {
      setScreen("dashboard");
    }
  }, [isAuthenticated, isLoading, screen]);

  // Still checking localStorage + /me — avoid flashing the wrong screen.
  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: C.cream, color: C.muted, ...sans }}>
        Loading…
      </div>
    );
  }

  const showApp = isAuthenticated && screen !== "login";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: C.cream, ...sans, overflow: "hidden" }}>
      {showApp && <TopNav screen={screen} setScreen={setScreen} />}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Logged-out: login/register only */}
        {!isAuthenticated && (
          <LoginScreen onLogin={() => setScreen("dashboard")} />
        )}
        {/* Logged-in: render the active screen */}
        {showApp && screen === "dashboard" && <DashboardScreen setScreen={setScreen} />}
        {showApp && screen === "plot" && <PlotScreen setScreen={setScreen} />}
        {showApp && screen === "tasks" && <TaskScreen />}
        {showApp && screen === "inventory" && <InventoryScreen />}
        {showApp && screen === "admin" && <AdminScreen setScreen={setScreen} />}
      </div>
    </div>
  );
}
