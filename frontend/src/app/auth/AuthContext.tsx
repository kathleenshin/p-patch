import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  changeEmail as apiChangeEmail,
  changePassword as apiChangePassword,
  confirmEmail as apiConfirmEmail,
  confirmEmailChange as apiConfirmEmailChange,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  resendConfirmation as apiResendConfirmation,
  type AuthUser,
  type RegisterResponse,
} from "@/lib/authApi";
import { clearTokens, getAccessToken } from "@/lib/authStorage";
import { ApiError } from "@/lib/api";

/** Values exposed to the app via useAuth(). */
type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** From /me — false means pending (Dashboard-only access). */
  isApproved: boolean;
  /** From /me — controls Admin nav/screen. */
  isGardenAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Creates account + sends email; does not log the user in. */
  register: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<RegisterResponse>;
  confirmEmail: (uid: string, token: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<string>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<string>;
  confirmEmailChange: (uid: string, token: string) => Promise<string>;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds auth state for the whole app: current user, access token,
 * login/register/logout, and session restore on refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // True until we finish checking localStorage + /me on first load.
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if an access token exists, validate it with /api/auth/me/.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const me = await fetchMe(token);
        if (!cancelled) {
          setAccessToken(token);
          setUser(me);
        }
      } catch {
        // Token missing/expired/invalid — clear storage and stay logged out.
        clearTokens();
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      // Avoid setState after unmount if /me is still in flight.
      cancelled = true;
    };
  }, []);

  // Login: API stores tokens; context keeps user + access in memory.
  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setAccessToken(data.access);
    setUser(data.user);
  }, []);

  // Register: account is inactive until email confirmation — no session yet.
  const register = useCallback(
    async (email: string, password: string, fullName = "") => {
      return apiRegister(email, password, fullName);
    },
    [],
  );

  const confirmEmail = useCallback(async (uid: string, token: string) => {
    const data = await apiConfirmEmail(uid, token);
    setAccessToken(data.access);
    setUser(data.user);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const data = await apiResendConfirmation(email);
    return data.detail;
  }, []);

  const refreshUser = useCallback(async () => {
    const token = accessToken ?? getAccessToken();
    if (!token) return;
    const me = await fetchMe(token);
    setAccessToken(token);
    setUser(me);
  }, [accessToken]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const token = accessToken ?? getAccessToken();
      if (!token) throw new Error("You must be logged in.");
      const data = await apiChangePassword(token, currentPassword, newPassword);
      return data.detail;
    },
    [accessToken],
  );

  const changeEmail = useCallback(
    async (newEmail: string, currentPassword: string) => {
      const token = accessToken ?? getAccessToken();
      if (!token) throw new Error("You must be logged in.");
      const data = await apiChangeEmail(token, newEmail, currentPassword);
      setUser((prev) =>
        prev
          ? { ...prev, pending_email: data.pending_email }
          : prev,
      );
      return data.detail;
    },
    [accessToken],
  );

  const confirmEmailChange = useCallback(async (uid: string, token: string) => {
    const data = await apiConfirmEmailChange(uid, token);
    // If this session is the same user, refresh profile to the new email.
    setUser((prev) => {
      if (prev && prev.id === data.user.id) return data.user;
      return prev;
    });
    return data.detail;
  }, []);

  // Logout: drop tokens and clear in-memory auth state.
  const logout = useCallback(() => {
    apiLogout();
    setAccessToken(null);
    setUser(null);
  }, []);

  // Stable context object for consumers.
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: Boolean(user && accessToken),
      // Role flags for TopNav / App gating (pending vs member vs admin).
      isApproved: Boolean(user?.is_approved),
      isGardenAdmin: Boolean(user?.is_garden_admin),
      login,
      register,
      confirmEmail,
      resendConfirmation,
      changePassword,
      changeEmail,
      confirmEmailChange,
      refreshUser,
      logout,
    }),
    [
      user,
      accessToken,
      isLoading,
      login,
      register,
      confirmEmail,
      resendConfirmation,
      changePassword,
      changeEmail,
      confirmEmailChange,
      refreshUser,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook for screens/components; must be used under AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

// Re-export so UI can catch API failures without importing from lib directly.
export { ApiError };
