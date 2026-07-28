import { useState } from "react";
import { C, sans, serif } from "./theme";
import type { Screen } from "./types";
import { TopNav } from "./components/TopNav";
import { DoodleLeaf } from "./components/DoodleLeaf";

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: C.cream, ...sans, overflow: "hidden" }}>
      <TopNav screen={screen} setScreen={setScreen} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "2rem" }}>
        <DoodleLeaf size={48} />
        <h1 style={{ ...serif, fontSize: "1.75rem", fontWeight: 700, color: C.brown, margin: 0 }}>
          Judkins Park P-Patch
        </h1>
        <p style={{ color: C.muted, fontSize: "0.9rem", margin: 0, textAlign: "center" }}>
          Frontend scaffold — screens land in follow-up PRs.
        </p>
      </div>
    </div>
  );
}
