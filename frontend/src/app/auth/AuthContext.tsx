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
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type AuthUser,
} from "@/lib/authApi";
import { clearTokens, getAccessToken } from "@/lib/authStorage";
import { ApiError } from "@/lib/api";

/** Values exposed to the app via useAuth(). */
type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
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

  // Register: same as login after account creation.
  const register = useCallback(
    async (email: string, password: string, fullName = "") => {
      const data = await apiRegister(email, password, fullName);
      setAccessToken(data.access);
      setUser(data.user);
    },
    [],
  );

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
      login,
      register,
      logout,
    }),
    [user, accessToken, isLoading, login, register, logout],
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
