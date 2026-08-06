import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { C, serif, sans, mono, inputStyle, linkStyle, labelStyle } from "../theme";
import { gardenFacts } from "../data/gardenFacts";
import { DoodleLeaf } from "../components/DoodleLeaf";
import gardenPhoto from "../../imports/gardening_plots_growing_veggies_vivid.jpg";
import { useAuth, ApiError } from "../auth/AuthContext";

/**
 * Login / register UI.
 * Controlled fields call AuthContext login/register; on success `onLogin`
 * navigates into the app. API errors (including 403 pending approval) stay on this screen.
 */
export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const { login, register } = useAuth();

  // UI chrome state
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [fact] = useState(() => gardenFacts[Math.floor(Math.random() * gardenFacts.length)]);

  // Controlled form + submit feedback
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Submit login or register against the Django auth API. */
  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, fullName.trim());
      }
      // Parent switches to dashboard after tokens/user are stored in context.
      onLogin();
    } catch (err) {
      // Surface API error messages (validation, bad credentials, etc.).
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell" style={{ ...sans }}>
      {/* Left: garden photo + brand / fact overlay */}
      <div className="login-hero">
        <img
          src={gardenPhoto}
          alt="Community garden raised beds with tomatoes, lettuce, and cabbage"
        />
        <div style={{ position: "absolute", bottom: "8%", left: "6%", right: "6%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <DoodleLeaf size={34} color={C.white} />
            <span style={{ ...serif, color: C.white, fontWeight: 700, fontSize: "1.4rem" }}>
              Judkins Park P-Patch
            </span>
          </div>

          {/* Decorative garden fact (not auth-related) */}
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

      {/* Right: auth form */}
      <div className="login-form" style={{ background: C.cream, display: "flex",
        flexDirection: "column", alignItems: "stretch", justifyContent: "center",
        boxSizing: "border-box" }}>
        <div className="login-form-content">
          {/* Heading */}
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

          {/* Login vs register tabs */}
          <div style={{ display: "flex", background: C.creamDark, borderRadius: "0.875rem",
            padding: "0.25rem", marginBottom: "1.375rem", gap: "0.25rem" }}>
            {(["login", "register"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setTab(t); setError(null); }}
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

          {/* Controlled inputs bound to React state */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {tab === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  placeholder="Jane Smith"
                  style={inputStyle}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                placeholder="email@example.com"
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  style={{ ...inputStyle, paddingRight: "2.625rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    cursor: "pointer", color: C.muted, display: "flex" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* API / validation error message */}
            {error && (
              <p style={{ margin: 0, color: C.terra, fontSize: "0.8rem", fontWeight: 600 }}>
                {error}
              </p>
            )}

            {/* Primary submit — disabled while request is in flight or fields empty */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !email.trim() || !password}
              style={{ marginTop: "0.25rem",
                background: `linear-gradient(135deg, ${C.sage}, ${C.sageDark})`,
                color: C.white, border: "none", borderRadius: "0.875rem", padding: "0.8125rem",
                fontWeight: 800, fontSize: "0.95rem",
                cursor: loading ? "wait" : "pointer",
                opacity: loading || !email.trim() || !password ? 0.7 : 1,
                fontFamily: "'Nunito', sans-serif",
                boxShadow: `0 0.25rem 0.875rem ${C.sage}44` }}>
              {loading
                ? (tab === "login" ? "Logging in…" : "Creating account…")
                : (tab === "login" ? "Login →" : "Create Account →")}
            </button>
          </div>

          {/* Secondary links between login and register tabs */}
          <div style={{ textAlign: "center", marginTop: "1.125rem", fontSize: "0.8rem", color: C.muted }}>
            {tab === "login" ? (
              <>
                <button type="button" style={linkStyle}>Forgot Password?</button>
                <div style={{ marginTop: "0.4375rem" }}>
                  No account?{" "}
                  <button type="button" onClick={() => { setTab("register"); setError(null); }}
                    style={{ ...linkStyle, color: C.terra, fontWeight: 800 }}>Register</button>
                </div>
              </>
            ) : (
              <div>
                Already a member?{" "}
                <button type="button" onClick={() => { setTab("login"); setError(null); }}
                  style={{ ...linkStyle, color: C.terra, fontWeight: 800 }}>Login</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
