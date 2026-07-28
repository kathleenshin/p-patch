import { useState } from "react";
import { C, sans, serif } from "./theme";
import type { Screen } from "./types";
import { TopNav } from "./components/TopNav";
import { LoginScreen } from "./screens/LoginScreen";

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: C.cream, ...sans, overflow: "hidden" }}>
      {screen !== "login" && <TopNav screen={screen} setScreen={setScreen} />}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {screen === "login" && (
            <LoginScreen onLogin={() => setScreen("dashboard")} />
        )}
        {screen !== "login" && (
           <div style={{ flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center", color: C.muted }}>
            More screens in follow-up PRs
           </div>
        )}
      </div>
    </div>
  );
}