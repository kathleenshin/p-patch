import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { C, serif, sans, mono, inputStyle, linkStyle, labelStyle } from "../theme";
import { gardenFacts } from "../data/gardenFacts";
import { DoodleLeaf } from "../components/DoodleLeaf";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab]       = useState<"login" | "register">("login");
  const [fact]              = useState(() => gardenFacts[Math.floor(Math.random() * gardenFacts.length)]);

  return (
    <div className="login-shell" style={{ ...sans }}>
      {/* Left: garden photo via CSS background on .login-hero */}
      <div className="login-hero">
        {/* Overlay content */}
        <div style={{ position: "absolute", bottom: "8%", left: "6%", right: "6%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <DoodleLeaf size={34} color={C.white} />
            <span style={{ ...serif, color: C.white, fontWeight: 700, fontSize: "1.4rem" }}>
              Judkins Park P-Patch
            </span>
          </div>

          {/* Rotating garden fact */}
          <div style={{ background: "rgba(234,245,237,0.15)", backdropFilter: "blur(0.625rem)",
            borderRadius: "1.125rem", padding: "1.125rem 1.375rem",
            border: "0.0625rem solid rgba(255,255,255,0.22)", maxWidth: "90%" }}>
            <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.625rem", ...mono }}>
              🌱 Garden fact
            </div>
            <p style={{ color: C.white, fontSize: "0.95rem", lineHeight: 1.75,
              margin: 0, fontStyle: "italic", ...serif }}>
              "{fact}"
            </p>
          </div>
        </div>
      </div>

      {/* Right: form — column from .login-form; content width from .login-form-content */}
      <div className="login-form" style={{ background: C.cream, display: "flex",
        flexDirection: "column", alignItems: "stretch", justifyContent: "center",
        boxSizing: "border-box" }}>
        <div className="login-form-content">
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ width: "5rem", height: "3.5rem", borderRadius: "1.125rem", background: C.sageLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 0.75rem" }}>
              <DoodleLeaf size={34} />
            </div>
            <h1 style={{ ...serif, fontSize: "1.5rem", fontWeight: 700, color: C.brown, margin: "0 0 0.3125rem" }}>
              Welcome back
            </h1>
            <p style={{ color: C.muted, fontSize: "0.82rem", margin: 0 }}>Sign in to your garden account</p>
          </div>

          {/* Tab */}
          <div style={{ display: "flex", background: C.creamDark, borderRadius: "0.875rem",
            padding: "0.25rem", marginBottom: "1.375rem", gap: "0.25rem" }}>
            {(["login","register"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "0.5625rem", borderRadius: "0.6875rem", border: "none",
                  cursor: "pointer", background: tab === t ? C.white : "transparent",
                  color: tab === t ? C.brown : C.muted, fontWeight: tab === t ? 800 : 500,
                  fontSize: "0.85rem", fontFamily: "'Nunito', sans-serif",
                  boxShadow: tab === t ? "0 0.0625rem 0.375rem rgba(44,31,20,0.1)" : "none",
                  transition: "all 0.15s" }}>
                {t === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {tab === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input placeholder="Jane Smith" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="email@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} defaultValue="••••••••"
                  style={{ ...inputStyle, paddingRight: "2.625rem" }} />
                <button onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", color: C.muted, display: "flex" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={onLogin}
              style={{ marginTop: "0.25rem",
                background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                color: C.white, border: "none", borderRadius: "0.875rem", padding: "0.8125rem",
                fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif",
                boxShadow: `0 0.25rem 0.875rem ${C.sage}44` }}>
              {tab === "login" ? "Login →" : "Create Account →"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "1.125rem", fontSize: "0.8rem", color: C.muted }}>
            {tab === "login" ? (
              <>
                <button style={linkStyle}>Forgot Password?</button>
                <div style={{ marginTop: "0.4375rem" }}>
                  No account?{" "}
                  <button onClick={() => setTab("register")}
                    style={{ ...linkStyle, color: C.terra, fontWeight: 800 }}>Register</button>
                </div>
              </>
            ) : (
              <div>
                Already a member?{" "}
                <button onClick={() => setTab("login")}
                  style={{ ...linkStyle, color: C.terra, fontWeight: 800 }}>Login</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
