import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { X } from "lucide-react";
import { C, inputStyle, labelStyle, sans, serif } from "../theme";
import { useAuth, ApiError } from "../auth/AuthContext";

type AccountSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function displayName(
  firstName: string | undefined,
  lastName: string | undefined,
  email: string,
): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || email;
}

/** Prefer a short SES sandbox hint over the raw AWS dump when possible. */
function formatAccountError(err: unknown, fallback: string): string {
  const raw =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : fallback;
  if (/not verified/i.test(raw)) {
    return (
      "SES could not send: an address is not verified in this AWS region. " +
      "In SES sandbox, verify both the From address and the new email (recipient), " +
      "or request production access. Full detail: " +
      raw
    );
  }
  return raw;
}

const sectionTitle: CSSProperties = {
  ...serif,
  fontSize: "1rem",
  fontWeight: 700,
  color: C.brown,
  margin: "0 0 0.5rem",
};

const helper: CSSProperties = {
  color: C.muted,
  fontSize: "0.78rem",
  margin: "0 0 0.75rem",
  lineHeight: 1.4,
};

const primaryBtn: CSSProperties = {
  ...sans,
  background: C.sage,
  color: C.white,
  border: "none",
  borderRadius: "0.75rem",
  padding: "0.625rem 1rem",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  ...sans,
  background: "transparent",
  color: C.brownMid,
  border: `0.0938rem solid ${C.border}`,
  borderRadius: "0.75rem",
  padding: "0.625rem 1rem",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
};

const successBanner: CSSProperties = {
  background: C.sagePop,
  border: `0.0938rem solid ${C.sageMid}`,
  borderRadius: "0.75rem",
  padding: "0.625rem 0.75rem",
  color: C.sageDark,
  fontSize: "0.85rem",
  fontWeight: 700,
  lineHeight: 1.35,
};

const errorBanner: CSSProperties = {
  background: C.terraLight,
  border: `0.0938rem solid ${C.terra}`,
  borderRadius: "0.75rem",
  padding: "0.625rem 0.75rem",
  color: C.terraDark,
  fontSize: "0.85rem",
  fontWeight: 700,
  lineHeight: 1.35,
};

/**
 * Account settings popup: read-only name, change password, change email
 * (current password + confirm-before-switch).
 */
export function AccountSettingsDialog({ open, onClose }: AccountSettingsDialogProps) {
  const { user, changePassword, changeEmail } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Reset form noise when the dialog opens/closes.
  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg(null);
    setPasswordError(null);
    setNewEmail("");
    setEmailPassword("");
    setEmailMsg(null);
    setEmailError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !user) return null;

  const name = displayName(user.first_name, user.last_name, user.email);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg("Done! Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(formatAccountError(err, "Could not update password."));
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    setEmailError(null);
    setEmailLoading(true);
    try {
      await changeEmail(newEmail.trim(), emailPassword);
      setEmailMsg(
        "Sent! Check the new address for a confirmation link. Your current email stays active until you confirm.",
      );
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      setEmailError(formatAccountError(err, "Could not start email change."));
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div
      role="presentation"
      // Close only if the press started on the backdrop (not a click that
      // started on the button and finished outside after the layout shifted).
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(43, 43, 43, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-title"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          ...sans,
          width: "100%",
          maxWidth: "26rem",
          maxHeight: "90vh",
          overflowY: "auto",
          background: C.card,
          borderRadius: "1rem",
          border: `0.0938rem solid ${C.border}`,
          boxShadow: "0 1rem 2.5rem rgba(47, 70, 51, 0.18)",
          padding: "1.25rem 1.25rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h2
              id="account-settings-title"
              style={{ ...serif, margin: 0, fontSize: "1.35rem", color: C.brown, fontWeight: 700 }}
            >
              Account settings
            </h2>
            <p style={{ ...helper, marginTop: "0.35rem", marginBottom: 0 }}>
              Change your password or email. Name stays read-only for now.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account settings"
            style={{
              background: C.creamDark,
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.375rem",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={16} color={C.brownMid} />
          </button>
        </div>

        <section style={{ marginTop: "1.25rem" }}>
          <h3 style={sectionTitle}>Profile</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <div style={labelStyle}>Name</div>
              <div
                style={{
                  ...inputStyle,
                  background: C.creamDark,
                  color: C.brownMid,
                  cursor: "default",
                }}
              >
                {name}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Current email</div>
              <div
                style={{
                  ...inputStyle,
                  background: C.creamDark,
                  color: C.brownMid,
                  cursor: "default",
                }}
              >
                {user.email}
              </div>
            </div>
            {user.pending_email ? (
              <p style={{ ...helper, color: C.amber, margin: 0 }}>
                Pending confirmation for <strong>{user.pending_email}</strong>. Check that inbox
                — your current email stays active until you confirm.
              </p>
            ) : null}
          </div>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <h3 style={sectionTitle}>Change password</h3>
          <form onSubmit={handlePasswordSubmit} style={{ display: "grid", gap: "0.625rem" }}>
            <div>
              <label style={labelStyle} htmlFor="acct-current-password">
                Current password
              </label>
              <input
                id="acct-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordMsg(null);
                }}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="acct-new-password">
                New password
              </label>
              <input
                id="acct-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordMsg(null);
                }}
                required
                minLength={8}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="acct-confirm-password">
                Confirm new password
              </label>
              <input
                id="acct-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordMsg(null);
                }}
                required
                minLength={8}
                style={inputStyle}
              />
            </div>
            {passwordError ? (
              <p role="alert" style={{ ...errorBanner, margin: 0 }}>{passwordError}</p>
            ) : null}
            {passwordMsg ? (
              <p role="status" style={{ ...successBanner, margin: 0 }}>{passwordMsg}</p>
            ) : null}
            <button type="submit" disabled={passwordLoading} style={primaryBtn}>
              {passwordLoading ? "Updating…" : passwordMsg ? "Done!" : "Update password"}
            </button>
          </form>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <h3 style={sectionTitle}>Change email</h3>
          <p style={helper}>
            Enter your current password. We email a confirmation link to the{" "}
            <strong>new</strong> address; your login email does not change until you confirm.
          </p>
          <form onSubmit={handleEmailSubmit} style={{ display: "grid", gap: "0.625rem" }}>
            <div>
              <label style={labelStyle} htmlFor="acct-new-email">
                New email
              </label>
              <input
                id="acct-new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="acct-email-password">
                Current password
              </label>
              <input
                id="acct-email-password"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            {emailError ? (
              <p role="alert" style={{ ...errorBanner, margin: 0 }}>{emailError}</p>
            ) : null}
            {emailMsg ? (
              <p role="status" style={{ ...successBanner, margin: 0 }}>{emailMsg}</p>
            ) : null}
            <button type="submit" disabled={emailLoading} style={primaryBtn}>
              {emailLoading ? "Sending…" : emailMsg ? "Sent!" : "Send confirmation"}
            </button>
          </form>
        </section>

        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
