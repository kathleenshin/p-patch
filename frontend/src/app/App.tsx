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

/** Pending users may only open Dashboard; Admin requires is_garden_admin. */
function canOpenScreen(
    screen: Screen,
    opts: { isApproved: boolean; isGardenAdmin: boolean },
): boolean {
    if (screen === "login" || screen === "dashboard") return true;
    if (screen === "admin") return opts.isGardenAdmin;
    return opts.isApproved;
}

/**
 * Root shell: restore session, then gate screens by auth + approval role.
 */
export default function App() {
    const { isAuthenticated, isLoading, isApproved, isGardenAdmin } = useAuth();
    const [screen, setScreen] = useState<Screen>("login");
    const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

    // Keep route in sync: logged out → login; logged in → allowed screen only.
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            setScreen("login");
            setSelectedPlotId(null);
            return;
        }
        if (screen === "login") {
            setScreen("dashboard");
            return;
        }
        // Block deep-links to screens the current role cannot open.
        if (!canOpenScreen(screen, { isApproved, isGardenAdmin })) {
            setScreen("dashboard");
        }
    }, [isAuthenticated, isLoading, isApproved, isGardenAdmin, screen]);

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
                {!isAuthenticated && (
                    <LoginScreen onLogin={() => setScreen("dashboard")} />
                )}
                {/* Everyone authenticated can see Dashboard (incl. pending). */}
                {showApp && screen === "dashboard" && (
                    <DashboardScreen
                        setScreen={setScreen}
                        setSelectedPlotId={setSelectedPlotId}
                    />
                )}
                {/* Member screens require approval. */}
                {showApp && isApproved && screen === "plot" && (
                    <PlotScreen
                        setScreen={setScreen}
                        selectedPlotId={selectedPlotId}
                    />
                )}
                {showApp && isApproved && screen === "tasks" && <TaskScreen />}
                {showApp && isApproved && screen === "inventory" && <InventoryScreen />}
                {/* Admin console is garden-admin only. */}
                {showApp && isGardenAdmin && screen === "admin" && (
                    <AdminScreen setScreen={setScreen} />
                )}
            </div>
        </div>
    );
}
