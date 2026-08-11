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
import { useAuth, ApiError } from "./auth/AuthContext";

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
    const {
        isAuthenticated,
        isLoading,
        isApproved,
        isGardenAdmin,
        confirmEmailChange,
    } = useAuth();
    const [screen, setScreen] = useState<Screen>("login");
    const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
    const [emailChangeNotice, setEmailChangeNotice] = useState<string | null>(null);

    // Handle confirm-before-switch links (`?confirm_email_change=1&uid=&token=`).
    useEffect(() => {
        if (isLoading) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("confirm_email_change") !== "1") return;

        const uid = params.get("uid");
        const token = params.get("token");
        if (!uid || !token) {
            setEmailChangeNotice("This email-change link is missing information.");
            window.history.replaceState({}, "", window.location.pathname);
            return;
        }

        let cancelled = false;
        async function runConfirm() {
            try {
                const detail = await confirmEmailChange(uid!, token!);
                if (!cancelled) setEmailChangeNotice(detail);
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError) {
                    setEmailChangeNotice(err.message);
                } else if (err instanceof Error) {
                    setEmailChangeNotice(err.message);
                } else {
                    setEmailChangeNotice("Could not confirm the email change.");
                }
            } finally {
                window.history.replaceState({}, "", window.location.pathname);
            }
        }

        void runConfirm();
        return () => {
            cancelled = true;
        };
    }, [isLoading, confirmEmailChange]);

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
            {emailChangeNotice && (
                <div
                    role="status"
                    style={{
                        background: C.sagePop,
                        color: C.sageDark,
                        borderBottom: `0.0625rem solid ${C.sageMid}`,
                        padding: "0.625rem 1rem",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                    }}
                >
                    <span>{emailChangeNotice}</span>
                    <button
                        type="button"
                        onClick={() => setEmailChangeNotice(null)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: C.sageDark,
                            fontWeight: 800,
                            fontSize: "0.8rem",
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}
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
