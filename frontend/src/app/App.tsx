import { useState } from "react";
import { C, sans } from "./theme";
import type { Screen } from "./types";
import { TopNav } from "./components/TopNav";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { PlotScreen } from "./screens/PlotScreen";
import { TaskScreen } from "./screens/TaskScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { AdminScreen } from "./screens/AdminScreen";


export default function App() {
  const [screen, setScreen] = useState<Screen>("login");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: C.cream, ...sans, overflow: "hidden" }}>
      {screen !== "login" && <TopNav screen={screen} setScreen={setScreen} />}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {screen === "login" && (
          <LoginScreen onLogin={() => setScreen("dashboard")} />
        )}
        {screen === "dashboard" && <DashboardScreen setScreen={setScreen} />}
        {screen === "plot" && <PlotScreen setScreen={setScreen} />}
        {screen === "tasks" && <TaskScreen />}
        {screen === "inventory" && <InventoryScreen />}
        {screen === "admin" && <AdminScreen setScreen={setScreen} />}
      </div>
    </div>
  );
}